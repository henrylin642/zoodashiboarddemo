export interface Project {
  projectId: number;
  name: string;
  startDate: Date | null;
  endDate: Date | null;
  coordinates: string[];
  lightIds: number[];
  scenes: string[];
  isActive: boolean;
  latLon: { lat: number; lon: number } | null;
  ownerEmails: string[];
}

export interface ScanRecord {
  time: Date;
  ligId: number;
  clientId: string;
  coordinateSystemId: number | null;
}

export interface LightRecord {
  ligId: number;
  latitude: number | null;
  longitude: number | null;
  fieldId: number | null;
  coordinateSystemId: number | null;
  coordinateSystemName: string | null;
  updatedAt: Date | null;
}

export interface CoordinateSystemRecord {
  id: number;
  name: string;
  sceneId: number | null;
  sceneName: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface ClickRecord {
  time: Date;
  codeName: string;
  objId: number;
}

export interface ArObjectRecord {
  id: number;
  name: string;
  sceneId: number | null;
  sceneName: string | null;
  locationX: number | null;
  locationY: number | null;
  locationZ: number | null;
}

export interface ScanCoordinateRecord {
  id: number;
  lightId: number;
  locationX: number | null;
  locationZ: number | null;
  createdAt: Date | null;
}

export interface ChatbaseMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
  type?: string;
}

export interface ChatbaseConversation {
  id: string;
  chatbotId: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  source?: string | null;
  messages: ChatbaseMessage[];
}

export interface ChatInteraction {
  conversationId: string;
  content: string;
  time: Date;
  language: "zh" | "en";
  category: string;
}

export interface ChatbaseStats {
  rangeKey: string;
  start: Date;
  end: Date;
  fetchedAt: Date;
  totalConversations: number;
  totalInteractions: number;
  zh: number;
  en: number;
  trend: Array<{ label: string; total: number; zh: number; en: number }>;
  categories: Array<{ category: string; count: number }>;
  questions: ChatInteraction[];
}

export interface ChatbaseData {
  available: boolean;
  error?: string;
  stats: Record<string, ChatbaseStats>;
  getStats?: (range: { start: Date; end: Date; key?: string }) => Promise<ChatbaseStats>;
}

export interface DashboardData {
  projects: Project[];
  scans: ScanRecord[];
  clicks: ClickRecord[];
  lights: LightRecord[];
  coordinateSystems: CoordinateSystemRecord[];
  arObjects: ArObjectRecord[];
  scanCoordinates: ScanCoordinateRecord[];
  lightToProjectIds: Record<number, number[]>;
  projectById: Record<number, Project>;
  firstClickByUser: Record<string, Date>;
  chatbase?: ChatbaseData;
}

export interface DashboardDataState {
  status: "loading" | "ready" | "error";
  data?: DashboardData;
  error?: string;
}
