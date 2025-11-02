import { classifyQuestion, detectLanguageFromText } from "../utils/ai";
import type {
  ChatbaseConversation,
  ChatbaseMessage,
  ChatbaseStats,
  ChatInteraction,
} from "../types";

const DEFAULT_CHATBASE_BASE = "https://www.chatbase.co/api/v1";

interface ChatbaseConfig {
  apiBase?: string;
  apiKey?: string;
  chatbotId?: string;
  pageSize?: number;
}

interface ConversationRange {
  start: Date;
  end: Date;
  key: string;
}

export async function fetchChatbaseConversations(
  range: ConversationRange,
  config: ChatbaseConfig = {}
): Promise<ChatbaseConversation[]> {
  const apiKey =
    config.apiKey ??
    (import.meta.env.VITE_CHATBASE_API_KEY as string | undefined);
  const chatbotId =
    config.chatbotId ??
    (import.meta.env.VITE_CHATBASE_CHATBOT_ID as string | undefined);
  const apiBase =
    (config.apiBase ??
      (import.meta.env.VITE_CHATBASE_API_BASE as string | undefined)) ??
    DEFAULT_CHATBASE_BASE;
  const pageSize = config.pageSize ?? 200;

  if (!apiKey || !chatbotId) {
    throw new Error("Chatbase API key 或 chatbotId 尚未設定");
  }

  const baseUrl = apiBase.replace(/\/$/, "");
  const startDate = formatDate(range.start);
  const endDate = formatDate(range.end);

  const results: ChatbaseConversation[] = [];
  let page = 1;

  while (true) {
    const params = new URLSearchParams({
      chatbotId,
      startDate,
      endDate,
      page: String(page),
      size: String(pageSize),
    });

    const response = await fetch(`${baseUrl}/get-conversations?${params}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Chatbase API 請求失敗：${response.status} ${text || response.statusText}`
      );
    }

    const json = (await response.json()) as { data?: unknown };
    const chunk = Array.isArray(json.data)
      ? json.data.map(parseConversation).filter(Boolean)
      : [];

    results.push(...chunk);

    if (chunk.length < pageSize) break;
    page += 1;
  }

  return results;
}

export function summarizeChatbaseConversations(
  conversations: ChatbaseConversation[],
  range: ConversationRange
): ChatbaseStats {
  const interactions = buildInteractions(conversations);
  const zh = interactions.filter((item) => item.language === "zh").length;
  const en = interactions.filter((item) => item.language === "en").length;

  const dailyMap = new Map<
    string,
    { label: string; total: number; zh: number; en: number }
  >();

  interactions.forEach((interaction) => {
    const day = formatDate(interaction.time);
    if (!dailyMap.has(day)) {
      dailyMap.set(day, {
        label: formatDateLabel(interaction.time),
        total: 0,
        zh: 0,
        en: 0,
      });
    }
    const entry = dailyMap.get(day)!;
    entry.total += 1;
    if (interaction.language === "zh") entry.zh += 1;
    else entry.en += 1;
  });

  const trend = Array.from(dailyMap.entries())
    .map(([key, value]) => ({ ...value, dateKey: key }))
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
    .map(({ dateKey, ...rest }) => rest);

  const categoryMap = new Map<string, number>();
  interactions.forEach((interaction) => {
    categoryMap.set(
      interaction.category,
      (categoryMap.get(interaction.category) ?? 0) + 1
    );
  });

  const categories = Array.from(categoryMap.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  const questions = interactions
    .slice()
    .sort((a, b) => b.time.getTime() - a.time.getTime())
    .slice(0, 20);

  return {
    rangeKey: range.key,
    start: range.start,
    end: range.end,
    fetchedAt: new Date(),
    totalConversations: conversations.length,
    totalInteractions: interactions.length,
    zh,
    en,
    trend,
    categories,
    questions,
  };
}

function parseConversation(raw: any): ChatbaseConversation {
  if (!raw || typeof raw !== "object") {
    throw new Error("Chatbase 回傳格式錯誤");
  }

  const id = String(raw.id ?? raw.conversation_id ?? "").trim();
  const chatbotId = String(raw.chatbot_id ?? raw.chatbotId ?? "").trim();
  if (!id || !chatbotId) {
    throw new Error("缺少 conversation id 或 chatbot id");
  }

  const createdAt = parseDateValue(raw.created_at ?? raw.createdAt);
  const updatedAt = parseDateValue(raw.updated_at ?? raw.updatedAt);
  const source = raw.source ? String(raw.source) : null;

  const messagesRaw = Array.isArray(raw.messages) ? raw.messages : [];
  const messages: ChatbaseMessage[] = messagesRaw
    .map((message: unknown) => parseMessage(message))
    .filter(Boolean) as ChatbaseMessage[];

  return {
    id,
    chatbotId,
    createdAt,
    updatedAt,
    source,
    messages,
  };
}

function parseMessage(raw: any): ChatbaseMessage | null {
  if (!raw || typeof raw !== "object") return null;
  const role = String(raw.role ?? "").trim();
  if (role !== "user" && role !== "assistant") return null;
  const content = typeof raw.content === "string" ? raw.content.trim() : "";
  if (!content) return null;
  const type = raw.type ? String(raw.type) : undefined;
  return {
    id: raw.id ? String(raw.id) : undefined,
    role,
    content,
    type,
  };
}

function buildInteractions(
  conversations: ChatbaseConversation[]
): ChatInteraction[] {
  const items: ChatInteraction[] = [];
  conversations.forEach((conversation) => {
    const baseTime =
      conversation.updatedAt ?? conversation.createdAt ?? new Date();
    const messages = conversation.messages;
    let hasUserQuestion = false;

    for (let index = 0; index < messages.length; index += 1) {
      const message = messages[index];
      if (message.role !== "user") continue;
      hasUserQuestion = true;
      const assistantResponse = findNextAssistant(messages, index + 1);
      const language = assistantResponse
        ? detectLanguageFromText(assistantResponse.content)
        : detectLanguageFromText(message.content);
      const category = classifyQuestion(message.content);
      items.push({
        conversationId: conversation.id,
        content: message.content,
        time: baseTime,
        language,
        category,
      });
    }

    if (!hasUserQuestion) {
      const assistantResponse = findNextAssistant(messages, 0);
      if (!assistantResponse) return;
      const language = detectLanguageFromText(assistantResponse.content);
      const fallbackQuestion =
        messages.find((msg) => msg.role === "assistant" && msg.content)?.content ??
        `Conversation ${conversation.id}`;
      const category = classifyQuestion(fallbackQuestion);
      items.push({
        conversationId: conversation.id,
        content: fallbackQuestion,
        time: baseTime,
        language,
        category,
      });
    }
  });
  return items;
}

function findNextAssistant(
  messages: ChatbaseMessage[],
  startIndex: number
): ChatbaseMessage | null {
  for (let index = startIndex; index < messages.length; index += 1) {
    const message = messages[index];
    if (message.role === "assistant" && message.content) {
      return message;
    }
  }
  return null;
}

function parseDateValue(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateLabel(date: Date): string {
  return date.toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}
