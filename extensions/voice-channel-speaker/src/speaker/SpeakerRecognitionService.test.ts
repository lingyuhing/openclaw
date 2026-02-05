/**
 * Comprehensive tests for Speaker Recognition Service
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  preprocessAudio,
  computeMelSpectrogram,
  extractVoiceActivity,
  calculateAudioQuality,
} from "../audio/audio-preprocessing.js";
import {
  extractVoiceprint,
  extractMultipleVoiceprints,
  compareEmbeddings,
  compareMultipleEmbeddings,
} from "../audio/voiceprint-extractor.js";
import { SpeakerIdGenerator } from "../speaker/SpeakerIdGenerator.js";
import { SpeakerRecognitionService } from "../speaker/SpeakerRecognitionService.js";
import { SpeakerRepository } from "../speaker/SpeakerRepository.js";

// Helper to generate synthetic audio data (sine wave)
function generateSyntheticAudio(
  duration: number,
  frequency: number,
  sampleRate = 16000,
  bitDepth = 16,
): Buffer {
  const numSamples = Math.floor(duration * sampleRate);
  const bytesPerSample = bitDepth / 8;
  const buffer = Buffer.alloc(numSamples * bytesPerSample);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const sample = Math.sin(2 * Math.PI * frequency * t);
    const amplitude = sample * 0.8; // 80% amplitude to avoid clipping

    if (bitDepth === 16) {
      const intSample = Math.floor(amplitude * 32767);
      buffer.writeInt16LE(intSample, i * 2);
    } else if (bitDepth === 32) {
      buffer.writeFloatLE(amplitude, i * 4);
    }
  }

  return buffer;
}

// Helper to generate different speaker voices
function generateSpeakerVoice(speakerId: number, duration: number, sampleRate = 16000): Buffer {
  // Different speakers have different fundamental frequencies and harmonics
  const baseFreq = 100 + speakerId * 50; // 100Hz, 150Hz, 200Hz, etc.
  const numSamples = Math.floor(duration * sampleRate);
  const buffer = Buffer.alloc(numSamples * 2);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // Fundamental + harmonics
    let sample = Math.sin(2 * Math.PI * baseFreq * t);
    sample += 0.3 * Math.sin(2 * Math.PI * baseFreq * 2 * t);
    sample += 0.2 * Math.sin(2 * Math.PI * baseFreq * 3 * t);
    // Add some noise for realism
    sample += 0.05 * (Math.random() * 2 - 1);

    const amplitude = sample * 0.7;
    const intSample = Math.floor(amplitude * 32767);
    buffer.writeInt16LE(intSample, i * 2);
  }

  return buffer;
}

describe("Audio Preprocessing", () => {
  it("should convert audio buffer to Float32Array", () => {
    const audioBuffer = generateSyntheticAudio(1, 440);
    const floatArray = preprocessAudio(audioBuffer);

    expect(floatArray).toBeInstanceOf(Float32Array);
    expect(floatArray.length).toBeGreaterThan(0);
    // Check normalization (values should be in [-1, 1])
    expect(Math.max(...Array.from(floatArray).map(Math.abs))).toBeLessThanOrEqual(1);
  });

  it("should compute mel spectrogram", () => {
    const audioBuffer = generateSyntheticAudio(2, 440);
    const processedAudio = preprocessAudio(audioBuffer);
    const melSpec = computeMelSpectrogram(processedAudio);

    expect(melSpec).toBeInstanceOf(Array);
    expect(melSpec.length).toBeGreaterThan(0);
    expect(melSpec[0]).toBeInstanceOf(Array);
    expect(melSpec[0].length).toBe(40); // Default nMels
  });

  it("should extract voice activity segments", () => {
    const audioBuffer = generateSyntheticAudio(3, 440);
    const processedAudio = preprocessAudio(audioBuffer);
    const segments = extractVoiceActivity(processedAudio);

    expect(segments).toBeInstanceOf(Array);
    // Synthetic audio should have voice activity
    expect(segments.length).toBeGreaterThan(0);
  });

  it("should calculate audio quality metrics", () => {
    const audioBuffer = generateSyntheticAudio(2, 440);
    const processedAudio = preprocessAudio(audioBuffer);
    const quality = calculateAudioQuality(processedAudio);

    expect(quality).toHaveProperty("snr");
    expect(quality).toHaveProperty("duration");
    expect(quality).toHaveProperty("clippingRatio");
    expect(quality.duration).toBeCloseTo(2, 0.1);
  });
});

describe("Voiceprint Extraction", () => {
  it("should extract voiceprint from audio", () => {
    const audioBuffer = generateSyntheticAudio(3, 440);
    const result = extractVoiceprint(audioBuffer);

    expect(result).toHaveProperty("embedding");
    expect(result).toHaveProperty("quality");
    expect(result.embedding).toBeInstanceOf(Array);
    expect(result.embedding.length).toBe(256); // Default embedding dim
    expect(result.quality).toBeGreaterThanOrEqual(0);
    expect(result.quality).toBeLessThanOrEqual(1);
  });

  it("should extract multiple voiceprints from segments", () => {
    const audioBuffer = generateSyntheticAudio(5, 440);
    const results = extractMultipleVoiceprints(audioBuffer, 16000, 16, 3);

    expect(results).toBeInstanceOf(Array);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]).toHaveProperty("embedding");
    expect(results[0]).toHaveProperty("quality");
    expect(results[0]).toHaveProperty("segmentIndex");
  });

  it("should compare embeddings with cosine similarity", () => {
    const audioBuffer1 = generateSyntheticAudio(3, 440);
    const audioBuffer2 = generateSyntheticAudio(3, 440);

    const result1 = extractVoiceprint(audioBuffer1);
    const result2 = extractVoiceprint(audioBuffer2);

    const similarity = compareEmbeddings(result1.embedding, result2.embedding);

    expect(similarity).toBeGreaterThanOrEqual(-1);
    expect(similarity).toBeLessThanOrEqual(1);
    // Same frequency should have high similarity
    expect(similarity).toBeGreaterThan(0.5);
  });

  it("should distinguish different speakers", () => {
    const speaker1Audio = generateSpeakerVoice(1, 3);
    const speaker2Audio = generateSpeakerVoice(2, 3);

    const result1 = extractVoiceprint(speaker1Audio);
    const result2 = extractVoiceprint(speaker2Audio);

    const similarity = compareEmbeddings(result1.embedding, result2.embedding);

    // Different speakers should have lower similarity
    expect(similarity).toBeLessThan(0.9);
  });
});

describe("Speaker ID Generator", () => {
  it("should generate consistent IDs for same embedding", () => {
    const embedding = new Array(256).fill(0).map(() => Math.random() * 2 - 1);

    const id1 = SpeakerIdGenerator.generate(embedding, "M");
    const id2 = SpeakerIdGenerator.generate(embedding, "M");

    expect(id1).toBe(id2);
    expect(id1).toMatch(/^spk_[a-f0-9]{6}_[MFU]$/);
  });

  it("should generate different IDs for different embeddings", () => {
    const embedding1 = new Array(256).fill(0).map(() => Math.random() * 2 - 1);
    const embedding2 = new Array(256).fill(0).map(() => Math.random() * 2 - 1);

    const id1 = SpeakerIdGenerator.generate(embedding1, "M");
    const id2 = SpeakerIdGenerator.generate(embedding2, "M");

    expect(id1).not.toBe(id2);
  });

  it("should extract hash and gender from ID", () => {
    const embedding = new Array(256).fill(0).map(() => Math.random() * 2 - 1);
    const id = SpeakerIdGenerator.generate(embedding, "F");

    const hash = SpeakerIdGenerator.extractHash(id);
    const gender = SpeakerIdGenerator.extractGender(id);

    expect(hash).toHaveLength(6);
    expect(gender).toBe("F");
  });

  it("should generate unknown speaker ID", () => {
    const unknownId = SpeakerIdGenerator.generateUnknown();

    expect(unknownId).toMatch(/^spk_unknown_/);
    expect(SpeakerIdGenerator.isValid(unknownId)).toBe(false);
  });
});

describe("Speaker Recognition Service", () => {
  let service: SpeakerRecognitionService;

  beforeEach(async () => {
    service = new SpeakerRecognitionService();
    await service.initialize();
  });

  afterEach(async () => {
    // Clean up enrolled speakers
    const list = await service.list();
    for (const speaker of list.speakers) {
      await service.delete(speaker.id);
    }
  });

  it("should enroll a new speaker", async () => {
    const audioBuffer = generateSpeakerVoice(1, 5);
    const audioData = audioBuffer.toString("base64");

    const result = await service.enroll({
      audioData,
      gender: "M",
    });

    expect(result).toHaveProperty("speakerId");
    expect(result).toHaveProperty("hash");
    expect(result).toHaveProperty("confidence");
    expect(result.speakerId).toMatch(/^spk_[a-f0-9]{6}_[MFU]$/);
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("should enroll speaker with multiple samples", async () => {
    const samples = [
      { audioData: generateSpeakerVoice(1, 4).toString("base64") },
      { audioData: generateSpeakerVoice(1, 4).toString("base64") },
      { audioData: generateSpeakerVoice(1, 4).toString("base64") },
    ];

    const result = await service.enrollMultiSample({
      samples,
      gender: "F",
    });

    expect(result).toHaveProperty("speakerId");
    expect(result).toHaveProperty("qualityReport");
    expect(result.enrollmentCount).toBe(3);
    expect(result.qualityReport?.sampleCount).toBe(3);
  });

  it("should identify enrolled speaker", async () => {
    // Enroll speaker
    const enrollAudio = generateSpeakerVoice(1, 5);
    const enrollResult = await service.enroll({
      audioData: enrollAudio.toString("base64"),
      gender: "M",
    });

    // Identify same speaker
    const identifyAudio = generateSpeakerVoice(1, 3);
    const identifyResult = await service.identify({
      audioData: identifyAudio.toString("base64"),
    });

    expect(identifyResult.isKnown).toBe(true);
    expect(identifyResult.speakerId).toBe(enrollResult.speakerId);
    expect(identifyResult.confidence).toBeGreaterThan(0.5);
  });

  it("should reject unknown speaker", async () => {
    // Enroll speaker 1
    await service.enroll({
      audioData: generateSpeakerVoice(1, 5).toString("base64"),
      gender: "M",
    });

    // Try to identify speaker 2 (not enrolled)
    const identifyResult = await service.identify({
      audioData: generateSpeakerVoice(2, 3).toString("base64"),
    });

    expect(identifyResult.isKnown).toBe(false);
    expect(identifyResult.speakerId).toMatch(/^spk_unknown_/);
  });

  it("should verify speaker identity", async () => {
    // Enroll speaker
    const enrollResult = await service.enroll({
      audioData: generateSpeakerVoice(1, 5).toString("base64"),
      gender: "M",
    });

    // Verify same speaker
    const verifyResult = await service.verify({
      speakerId: enrollResult.speakerId,
      audioData: generateSpeakerVoice(1, 3).toString("base64"),
    });

    expect(verifyResult.isVerified).toBe(true);
    expect(verifyResult.confidence).toBeGreaterThan(0.5);
  });

  it("should reject verification for wrong speaker", async () => {
    // Enroll speaker 1
    const enrollResult = await service.enroll({
      audioData: generateSpeakerVoice(1, 5).toString("base64"),
      gender: "M",
    });

    // Try to verify with speaker 2's voice
    const verifyResult = await service.verify({
      speakerId: enrollResult.speakerId,
      audioData: generateSpeakerVoice(2, 3).toString("base64"),
    });

    expect(verifyResult.isVerified).toBe(false);
  });

  it("should list enrolled speakers", async () => {
    // Enroll multiple speakers
    await service.enroll({
      audioData: generateSpeakerVoice(1, 5).toString("base64"),
      gender: "M",
    });
    await service.enroll({
      audioData: generateSpeakerVoice(2, 5).toString("base64"),
      gender: "F",
    });

    const list = await service.list();

    expect(list.totalCount).toBe(2);
    expect(list.speakers).toHaveLength(2);
  });

  it("should delete speaker", async () => {
    const enrollResult = await service.enroll({
      audioData: generateSpeakerVoice(1, 5).toString("base64"),
      gender: "M",
    });

    const deleteResult = await service.delete(enrollResult.speakerId);
    expect(deleteResult).toBe(true);

    const list = await service.list();
    expect(list.totalCount).toBe(0);
  });

  it("should get recognition statistics", () => {
    const stats = service.getStats();

    expect(stats).toHaveProperty("totalSpeakers");
    expect(stats).toHaveProperty("totalEmbeddings");
    expect(stats).toHaveProperty("averageEmbeddingsPerSpeaker");
    expect(stats).toHaveProperty("currentThreshold");
    expect(stats.currentThreshold).toBeGreaterThanOrEqual(0);
    expect(stats.currentThreshold).toBeLessThanOrEqual(1);
  });

  it("should set and get threshold", () => {
    const originalThreshold = service.getThreshold();

    service.setThreshold(0.8);
    expect(service.getThreshold()).toBe(0.8);

    service.setThreshold(originalThreshold);
  });

  it("should reject invalid threshold", () => {
    expect(() => service.setThreshold(-0.1)).toThrow();
    expect(() => service.setThreshold(1.5)).toThrow();
  });

  it("should perform real-time identification", async () => {
    // Enroll speaker
    const enrollResult = await service.enroll({
      audioData: generateSpeakerVoice(1, 5).toString("base64"),
      gender: "M",
    });

    // Real-time identification with 2-second chunk
    const chunk = generateSpeakerVoice(1, 2);
    const result = await service.identifyRealtime(chunk.toString("base64"));

    expect(result).toHaveProperty("isProcessing");
    expect(result).toHaveProperty("bufferedSamples");

    if (!result.isProcessing) {
      expect(result.speakerId).toBe(enrollResult.speakerId);
    }
  });
});

describe("Accuracy Requirements", () => {
  let service: SpeakerRecognitionService;

  beforeEach(async () => {
    service = new SpeakerRecognitionService();
    await service.initialize();
  });

  afterEach(async () => {
    const list = await service.list();
    for (const speaker of list.speakers) {
      await service.delete(speaker.id);
    }
  });

  it("should achieve >85% accuracy with multi-sample enrollment", async () => {
    // Enroll 5 different speakers with multiple samples each
    const speakers: string[] = [];
    for (let i = 0; i < 5; i++) {
      const samples = [
        { audioData: generateSpeakerVoice(i, 4).toString("base64") },
        { audioData: generateSpeakerVoice(i, 4).toString("base64") },
        { audioData: generateSpeakerVoice(i, 4).toString("base64") },
      ];

      const result = await service.enrollMultiSample({ samples });
      speakers.push(result.speakerId);
    }

    // Test identification accuracy
    let correctIdentifications = 0;
    const testRounds = 20;

    for (let round = 0; round < testRounds; round++) {
      const speakerIdx = round % 5;
      const testAudio = generateSpeakerVoice(speakerIdx, 3);

      const identifyResult = await service.identify({
        audioData: testAudio.toString("base64"),
      });

      if (identifyResult.isKnown && identifyResult.speakerId === speakers[speakerIdx]) {
        correctIdentifications++;
      }
    }

    const accuracy = correctIdentifications / testRounds;
    console.log(`Identification accuracy: ${(accuracy * 100).toFixed(1)}%`);

    // With synthetic data and proper multi-sample enrollment, should achieve high accuracy
    expect(accuracy).toBeGreaterThan(0.85);
  });

  it("should maintain high verification accuracy", async () => {
    // Enroll speaker with multiple samples
    const samples = [
      { audioData: generateSpeakerVoice(1, 4).toString("base64") },
      { audioData: generateSpeakerVoice(1, 4).toString("base64") },
      { audioData: generateSpeakerVoice(1, 4).toString("base64") },
    ];

    const enrollResult = await service.enrollMultiSample({ samples });

    // Test verification (genuine attempts)
    let correctVerifications = 0;
    const genuineTests = 10;

    for (let i = 0; i < genuineTests; i++) {
      const verifyResult = await service.verify({
        speakerId: enrollResult.speakerId,
        audioData: generateSpeakerVoice(1, 3).toString("base64"),
      });

      if (verifyResult.isVerified) {
        correctVerifications++;
      }
    }

    // Test rejection (impostor attempts)
    let correctRejections = 0;
    const impostorTests = 10;

    for (let i = 0; i < impostorTests; i++) {
      const verifyResult = await service.verify({
        speakerId: enrollResult.speakerId,
        audioData: generateSpeakerVoice(99, 3).toString("base64"), // Different speaker
      });

      if (!verifyResult.isVerified) {
        correctRejections++;
      }
    }

    const genuineRate = correctVerifications / genuineTests;
    const rejectionRate = correctRejections / impostorTests;
    const overallAccuracy = (genuineRate + rejectionRate) / 2;

    console.log(`Verification accuracy: ${(overallAccuracy * 100).toFixed(1)}%`);
    console.log(`  Genuine acceptance: ${(genuineRate * 100).toFixed(1)}%`);
    console.log(`  Impostor rejection: ${(rejectionRate * 100).toFixed(1)}%`);

    expect(overallAccuracy).toBeGreaterThan(0.85);
  });
});
