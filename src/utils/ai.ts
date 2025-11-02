const APP_CODE_ZH = new Set(["57"]);
const APP_CODE_EN = new Set(["00", "03", "04", "99"]);

export type SupportedLanguage = "zh" | "en";

export function detectLanguageFromIdentifier(identifier: string): SupportedLanguage {
  if (!identifier) return "zh";
  const trimmed = identifier.trim();
  const match = trimmed.match(/^(\d{2})/);
  if (match) {
    const prefix = match[1];
    if (APP_CODE_ZH.has(prefix)) return "zh";
    if (APP_CODE_EN.has(prefix)) return "en";
  }
  if (/[\u3400-\u9FFF]/.test(trimmed)) return "zh";
  if (/english|en/i.test(trimmed)) return "en";
  return "zh";
}

export function detectLanguageFromText(text: string): SupportedLanguage {
  if (!text) return "zh";
  return /[\u3400-\u9FFF]/.test(text) ? "zh" : "en";
}

export function classifyQuestion(question: string): string {
  const text = question.toLowerCase();
  if (/[\u3400-\u9FFF]/.test(question) && /餵|飼育|保育|獸醫/.test(question)) {
    return "飼養照護";
  }
  if (text.includes("feeding") || text.includes("food") || text.includes("feed")) {
    return "飼養照護";
  }
  if (
    text.includes("ticket") ||
    text.includes("開館") ||
    text.includes("門票") ||
    text.includes("價") ||
    text.includes("時間") ||
    text.includes("hour")
  ) {
    return "票務 / 開放時間";
  }
  if (
    text.includes("交通") ||
    text.includes("parking") ||
    text.includes("停車") ||
    text.includes("路線") ||
    text.includes("map")
  ) {
    return "交通動線";
  }
  if (
    text.includes("activity") ||
    text.includes("活動") ||
    text.includes("event") ||
    text.includes("表演") ||
    text.includes("workshop") ||
    text.includes("導覽")
  ) {
    return "活動 / 導覽";
  }
  if (
    text.includes("souvenir") ||
    text.includes("shop") ||
    text.includes("store") ||
    text.includes("紀念") ||
    text.includes("餐廳") ||
    text.includes("餐飲")
  ) {
    return "園區設施";
  }
  if (/動物|animal|科普|介紹/.test(question)) {
    return "動物相關";
  }
  return "其他";
}
