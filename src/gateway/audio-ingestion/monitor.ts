/**
 * Stream Monitor
 *
 * Monitors audio streams for health, performance, and errors.
 * Tracks metrics and detects stalled streams.
 */

import type { AudioStreamState, AudioStreamError } from "./types.js";

export interface StreamMetrics {
  streamId: string;
  bytesReceived: number;
  chunksReceived: number;
  bytesPerSecond: number;
  chunksPerSecond: number;
  latencyMs: number;
  errors: number;
  startedAt: number;
  lastChunkAt?: number;
  duration: number;
}

export interface MonitorConfig {
  stallTimeout?: number; // Time without chunks before considering stream stalled
  reportInterval?: number; // Interval for reporting metrics
  enableDetailedMetrics?: boolean;
  maxStreamsHistory?: number;
}

export interface StreamMonitorCallbacks {
  onStallDetected?: (streamId: string, elapsedMs: number) => void;
  onMetricsReport?: (metrics: StreamMetrics) => void;
  onStreamTimeout?: (streamId: string) => void;
  onError?: (streamId: string, error: AudioStreamError) => void;
}

export class StreamMonitor {
  private streams = new Map<
    string,
    {
      state: AudioStreamState;
      metrics: StreamMetrics;
      lastReportAt: number;
      stallTimer?: ReturnType<typeof setTimeout>;
      reportTimer?: ReturnType<typeof setInterval>;
    }
  >();

  private config: Required<MonitorConfig>;
  private callbacks: StreamMonitorCallbacks;
  private globalStats: {
    totalStreams: number;
    completedStreams: number;
    failedStreams: number;
    totalBytesReceived: number;
    totalChunksReceived: number;
  };

  constructor(config: MonitorConfig = {}, callbacks: StreamMonitorCallbacks = {}) {
    this.config = {
      stallTimeout: config.stallTimeout ?? 10000,
      reportInterval: config.reportInterval ?? 5000,
      enableDetailedMetrics: config.enableDetailedMetrics ?? true,
      maxStreamsHistory: config.maxStreamsHistory ?? 1000,
    };
    this.callbacks = callbacks;
    this.globalStats = {
      totalStreams: 0,
      completedStreams: 0,
      failedStreams: 0,
      totalBytesReceived: 0,
      totalChunksReceived: 0,
    };
  }

  /**
   * Start monitoring a new stream
   */
  startStream(streamId: string, timeoutMs: number = this.config.stallTimeout): void {
    const now = Date.now();

    const metrics: StreamMetrics = {
      streamId,
      bytesReceived: 0,
      chunksReceived: 0,
      bytesPerSecond: 0,
      chunksPerSecond: 0,
      latencyMs: 0,
      errors: 0,
      startedAt: now,
      duration: 0,
    };

    const streamData = {
      state: {
        streamId,
        config: {
          sessionKey: "",
          format: "opus",
          sampleRate: 16000,
          channels: 1,
        },
        status: "receiving",
        receivedChunks: 0,
        totalBytes: 0,
        startedAt: now,
      },
      metrics,
      lastReportAt: now,
    };

    this.streams.set(streamId, streamData);

    // Set up stall detection timer
    const stallTimer = setTimeout(() => {
      this.handleStreamTimeout(streamId);
    }, timeoutMs);

    streamData.state.status = "receiving";

    // Set up periodic metrics reporting
    if (this.config.enableDetailedMetrics) {
      const reportTimer = setInterval(() => {
        this.reportMetrics(streamId);
      }, this.config.reportInterval);

      this.streams.set(streamId, {
        ...streamData,
        stallTimer,
        reportTimer,
      });
    } else {
      this.streams.set(streamId, {
        ...streamData,
        stallTimer,
      });
    }

    this.globalStats.totalStreams++;
  }

  /**
   * Update stream metrics when a chunk is received
   */
  updateStream(streamId: string, chunkSize?: number): void {
    const streamData = this.streams.get(streamId);
    if (!streamData) {
      return;
    }

    const now = Date.now();
    const { metrics, state } = streamData;

    // Update metrics
    metrics.chunksReceived++;
    if (chunkSize) {
      metrics.bytesReceived += chunkSize;
    }

    // Calculate rates
    const elapsedSec = (now - metrics.startedAt) / 1000;
    if (elapsedSec > 0) {
      metrics.bytesPerSecond = Math.round(metrics.bytesReceived / elapsedSec);
      metrics.chunksPerSecond = Math.round(metrics.chunksReceived / elapsedSec);
    }

    metrics.duration = now - metrics.startedAt;

    // Update state
    state.receivedChunks = metrics.chunksReceived;
    state.totalBytes = metrics.bytesReceived;
    state.lastChunkAt = now;

    // Reset stall timer
    if (streamData.stallTimer) {
      clearTimeout(streamData.stallTimer);
    }

    const newStallTimer = setTimeout(() => {
      this.handleStreamTimeout(streamId);
    }, this.config.stallTimeout);

    this.streams.set(streamId, {
      ...streamData,
      stallTimer: newStallTimer,
    });

    // Update global stats
    this.globalStats.totalBytesReceived += chunkSize ?? 0;
    this.globalStats.totalChunksReceived++;
  }

  /**
   * Handle stream timeout (no chunks received for timeout period)
   */
  private handleStreamTimeout(streamId: string): void {
    const streamData = this.streams.get(streamId);
    if (!streamData) {
      return;
    }

    const { state, metrics } = streamData;

    // Only treat as stall if we haven't received all expected chunks
    if (state.status === "receiving") {
      state.status = "error";
      state.error = {
        code: "STREAM_TIMEOUT",
        message: `No chunks received for ${this.config.stallTimeout}ms`,
        recoverable: false,
      };

      this.callbacks.onStreamTimeout?.(streamId);
      this.callbacks.onError?.(streamId, state.error);

      this.globalStats.failedStreams++;
      this.stopStream(streamId);
    }
  }

  /**
   * Report metrics for a stream
   */
  private reportMetrics(streamId: string): void {
    const streamData = this.streams.get(streamId);
    if (!streamData) {
      return;
    }

    const { metrics } = streamData;
    this.callbacks.onMetricsReport?.(metrics);
  }

  /**
   * Stop monitoring a stream
   */
  stopStream(streamId: string): void {
    const streamData = this.streams.get(streamId);
    if (!streamData) {
      return;
    }

    // Clear timers
    if (streamData.stallTimer) {
      clearTimeout(streamData.stallTimer);
    }
    if (streamData.reportTimer) {
      clearInterval(streamData.reportTimer);
    }

    this.streams.delete(streamId);
  }

  /**
   * Get stream metrics
   */
  getStreamMetrics(streamId: string): StreamMetrics | undefined {
    return this.streams.get(streamId)?.metrics;
  }

  /**
   * Get all active stream metrics
   */
  getAllStreamMetrics(): StreamMetrics[] {
    return Array.from(this.streams.values()).map((s) => s.metrics);
  }

  /**
   * Get global statistics
   */
  getGlobalStats() {
    return { ...this.globalStats };
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    // Stop all streams
    for (const streamId of this.streams.keys()) {
      this.stopStream(streamId);
    }

    this.streams.clear();
  }
}
