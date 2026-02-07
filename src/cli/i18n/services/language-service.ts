export class DefaultLanguageService {
  getLanguage(): string {
    return "en";
  }
}

export const languageService = new DefaultLanguageService();
