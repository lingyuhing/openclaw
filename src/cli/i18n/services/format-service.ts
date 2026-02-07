export class DefaultFormatService {
  formatDate(date: Date): string {
    return date.toISOString();
  }

  formatNumber(num: number): string {
    return num.toString();
  }
}

export const formatService = new DefaultFormatService();
