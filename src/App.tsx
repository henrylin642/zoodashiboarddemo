import { useEffect, useMemo, useState, type ReactNode } from "react";
import "./App.css";
import { useDashboardData } from "./context/DashboardDataContext";
import type {
  ClickRecord,
  DashboardData,
  LightRecord,
  Project,
  ScanRecord,
} from "./types";

type SectionKey = "summary" | "crm" | "field" | "ai" | "users";
type CrmTabKey = "asset" | "projects" | "members";

interface SectionDefinition {
  key: SectionKey;
  label: string;
  short: string;
  description: string;
  icon: string;
}

const SECTION_DEFINITIONS: SectionDefinition[] = [
  {
    key: "summary",
    label: "Summary 總覽",
    short: "KPI snapshot",
    description: "即時掌握掃碼成效與跨部門提醒，作為每日站會的核心資訊。",
    icon: "📊",
  },
  {
    key: "crm",
    label: "CRM",
    short: "會員與權限",
    description: "整合登入、會員資料與資產上傳，確保營運人員能快速維護內容。",
    icon: "🤝",
  },
  {
    key: "field",
    label: "場域數據中心",
    short: "動線與熱度",
    description: "掌握場域熱力、互動強度與行銷洞察。",
    icon: "📍",
  },
  {
    key: "ai",
    label: "AI 數據",
    short: "模型洞察",
    description:
      "管理 AI 導覽與建議模型的輸入輸出，追蹤各場域的最佳化狀態與排程。",
    icon: "🤖",
  },
  {
    key: "users",
    label: "使用者紀錄",
    short: "行為稽核",
    description:
      "稽核操作行為、來源與異常事件，確保資料品質與資訊安全。",
    icon: "🛡️",
  },
];

interface CrmTabDefinition {
  key: CrmTabKey;
  label: string;
  description: string;
}

const CRM_TABS: CrmTabDefinition[] = [
  {
    key: "asset",
    label: "Asset Studio",
    description: "整理館藏素材、批次處理與版本控管。",
  },
  {
    key: "projects",
    label: "專案管理",
    description: "檢視場景狀態、壓縮檔與匯出流程。",
  },
  {
    key: "members",
    label: "會員管理",
    description: "維護館方與合作夥伴帳號權限。",
  },
];

interface FieldZoneLayout {
  id: string;
  label: string;
  top: string;
  left: string;
}

const FIELD_ZONES: FieldZoneLayout[] = [
  { id: "Zone1", label: "Zone 1", top: "18%", left: "55%" },
  { id: "Zone2", label: "Zone 2", top: "33%", left: "28%" },
  { id: "Zone3", label: "Zone 3", top: "64%", left: "26%" },
  { id: "Zone4", label: "Zone 4", top: "70%", left: "46%" },
  { id: "Zone5", label: "Zone 5", top: "46%", left: "71%" },
  { id: "Zone6", label: "Zone 6", top: "24%", left: "74%" },
];

function App() {
  const { status, data, error } = useDashboardData();
  const [activeSection, setActiveSection] = useState<SectionKey>("summary");
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const lastUpdated = useMemo(() => computeLastUpdated(data), [data]);
  const lastUpdatedLabel = lastUpdated
    ? formatDateTime(lastUpdated)
    : "尚未取得資料";

  const section = SECTION_DEFINITIONS.find(
    (item) => item.key === activeSection
  )!;

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <span className="sidebar__brand-main">Zoo DataOps</span>
          <span className="sidebar__brand-sub">Command Center</span>
        </div>

        <nav className="sidebar__nav" aria-label="主導覽">
          {SECTION_DEFINITIONS.map((item) => {
            const isActive = item.key === activeSection;
            return (
              <button
                key={item.key}
                type="button"
                className={`sidebar__nav-button${
                  isActive ? " sidebar__nav-button--active" : ""
                }`}
                onClick={() => setActiveSection(item.key)}
                aria-pressed={isActive}
              >
                <span className="sidebar__nav-icon" aria-hidden="true">
                  {item.icon}
                </span>
                <span className="sidebar__nav-copy">
                  <span className="sidebar__nav-label">{item.label}</span>
                  <span className="sidebar__nav-short">{item.short}</span>
                </span>
              </button>
            );
          })}
        </nav>

        <footer className="sidebar__footer">
          <span className={`status-tag status-tag--${status}`}>
            {status === "ready"
              ? "資料已同步"
              : status === "loading"
                ? "資料整備中"
                : "載入失敗"}
          </span>
          <p className="sidebar__footer-text">最後更新 {lastUpdatedLabel}</p>
        </footer>
      </aside>

      <div className="main">
        <header className="main__header">
          <div>
            <h1 className="main__title">{section.label}</h1>
            <p className="main__subtitle">{section.description}</p>
          </div>
          <div className="main__meta">
            <div className="main__timestamp">
              {currentTime.toLocaleString("zh-TW", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false,
              })}
            </div>
            {status === "error" && error ? (
              <span className="status-tag status-tag--error">{error}</span>
            ) : null}
          </div>
        </header>

        <main className="main__content">
          {status === "loading" ? (
            <LoadingState />
          ) : status === "error" || !data ? (
            <ErrorState message={error ?? "發生未知錯誤"} />
          ) : (
            <SectionContent section={activeSection} data={data} />
          )}
        </main>
      </div>
    </div>
  );
}

function SectionContent({
  section,
  data,
}: {
  section: SectionKey;
  data: DashboardData;
}) {
  switch (section) {
    case "summary":
      return <SummarySection data={data} />;
    case "crm":
      return <CrmSection data={data} />;
    case "field":
      return <FieldDataCenterSection data={data} />;
    case "ai":
      return <AiDataSection data={data} />;
    case "users":
      return <UserActivitySection data={data} />;
    default:
      return null;
  }
}

function SummarySection({ data }: { data: DashboardData }) {
  const range = useMemo(() => createRollingRange(7), []);

  const fieldSummary7d = useMemo(
    () => computeFieldMetrics(data, range.start, range.end),
    [data, range.start, range.end]
  );

  const zoneTrend = useMemo(
    () =>
      fieldSummary7d.metrics.map((item) => {
        const zoneMeta = FIELD_ZONES.find((zone) => zone.id === item.id);
        return {
          id: item.id,
          label: zoneMeta ? zoneMeta.label : item.id,
          scans: item.scans,
          clicks: item.clicks,
        };
      }),
    [fieldSummary7d.metrics]
  );

  const aiStats = useMemo(() => {
    if (data.clicks.length === 0) {
      return { total: 0, zh: 0, en: 0 };
    }
    return computeAiStats(data, range.start, range.end);
  }, [data, range.start, range.end]);

  const metrics = useMemo(() => {
    const totalScans = data.scans.length;
    const totalClicks = data.clicks.length;
    const arAssets = data.arObjects.length;
    const uniqueVisitors = Object.keys(data.firstClickByUser).length;

    return [
      {
        label: "掃描總量",
        value: formatNumber(totalScans),
        note: "累積掃描事件",
      },
      {
        label: "點擊物件總量",
        value: formatNumber(totalClicks),
        note: "互動點擊次數",
      },
      {
        label: "打開實境總量",
        value: formatNumber(arAssets),
        note: "可用 AR Scene 數",
      },
      {
        label: "AI 訪問數量",
        value: formatNumber(aiStats.total),
        note: `中文 ${formatNumber(aiStats.zh)} / 英文 ${formatNumber(aiStats.en)}`,
      },
      {
        label: "使用中文訪客",
        value: "待串接",
        note: "語系需串 CRM",
      },
      {
        label: "使用英文訪客",
        value: "待串接",
        note: "語系需串 CRM",
      },
      {
        label: "首訪會員",
        value: formatNumber(uniqueVisitors),
        note: "依第一筆互動統計",
      },
    ];
  }, [aiStats.en, aiStats.total, aiStats.zh, data]);

  return (
    <div className="section">
      <div className="card-grid card-grid--metrics">
        {metrics.map((metric) => (
          <div key={metric.label} className="card card--metric">
            <span className="card__label">{metric.label}</span>
            <span className="card__value">{metric.value}</span>
            <span className="card__note">{metric.note}</span>
          </div>
        ))}
      </div>

      <div className="split-grid">
        <Panel
          title="六區掃描趨勢"
          subtitle="最近 7 天掃描與點擊概況"
        >
          <ul className="timeline">
            {zoneTrend.map((item) => (
              <li key={item.id} className="timeline__item">
                <span className="timeline__date">{item.label}</span>
                <span className="timeline__value">
                  掃描 {formatNumber(item.scans)}
                </span>
                <span className="timeline__value timeline__value--muted">
                  點擊 {formatNumber(item.clicks)}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

function CrmSection({ data }: { data: DashboardData }) {
  const ownerDomains = useMemo(
    () => deriveOwnerDomains(data.projects),
    [data.projects]
  );
  const [activeTab, setActiveTab] = useState<CrmTabKey>("asset");

  const galleryFilters = useMemo(
    () => ["All", "Images", "Videos", "Music", "Models"],
    []
  );

  const galleryAssets = useMemo(() => {
    const mapped = data.arObjects.slice(0, 8).map((item, index) => ({
      id: `asset-${item.id}`,
      name: item.name || `AR 資產 #${item.id}`,
      size: "0 B",
      format: "GLB",
      type: "Models",
      thumbnailLabel: item.sceneName ?? `Scene ${index + 1}`,
    }));

    if (mapped.length) return mapped;

    return [
      {
        id: "asset-fallback-1",
        name: "Globe_Sample.glb",
        size: "0 B",
        format: "GLB",
        type: "Models",
        thumbnailLabel: "Globe",
      },
      {
        id: "asset-fallback-2",
        name: "導覽員第三層_通用.png",
        size: "0 B",
        format: "PNG",
        type: "Images",
        thumbnailLabel: "導覽員",
      },
      {
        id: "asset-fallback-3",
        name: "第四區-向前走_黑熊.glb",
        size: "0 B",
        format: "GLB",
        type: "Models",
        thumbnailLabel: "黑熊",
      },
    ];
  }, [data.arObjects]);

  const activeTabDefinition =
    CRM_TABS.find((tab) => tab.key === activeTab) ?? CRM_TABS[0];

  return (
    <div className="section">
      <section className="panel">
        <header className="panel__header panel__header--tabs">
          <div>
            <h2 className="panel__title">CRM 控制中心</h2>
            <p className="panel__subtitle">{activeTabDefinition.description}</p>
          </div>
          <nav className="crm-tabs" aria-label="CRM 管理分頁">
            {CRM_TABS.map((tab) => {
              const isActive = tab.key === activeTab;
              return (
                <button
                  key={tab.key}
                  type="button"
                  className={`crm-tabs__button${isActive ? " crm-tabs__button--active" : ""}`}
                  onClick={() => setActiveTab(tab.key)}
                  aria-pressed={isActive}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </header>
        <div className="panel__body panel__body--crm">
          {activeTab === "asset" ? (
            <AssetGalleryPanel filters={galleryFilters} assets={galleryAssets} />
          ) : activeTab === "projects" ? (
            <ProjectManagement data={data} />
          ) : (
            <MemberManagement ownerDomains={ownerDomains} projects={data.projects} />
          )}
        </div>
      </section>
    </div>
  );
}

function AssetGalleryPanel({
  filters,
  assets,
}: {
  filters: string[];
  assets: GalleryAsset[];
}) {
  return (
    <div className="asset-gallery">
      <div className="asset-gallery__header">
        <div>
          <h3 className="asset-gallery__title">Asset Studio</h3>
          <p className="asset-gallery__description">
            瀏覽 Zoo AR 資產，並建立批次處理工作；後端統計目前共{" "}
            <strong>28,233</strong> 個媒體檔案。
          </p>
        </div>
        <div className="asset-gallery__actions">
          <button type="button" className="button button--ghost">
            ⬆ Upload asset
          </button>
          <button type="button" className="button button--neutral">
            Batch actions (0)
          </button>
        </div>
      </div>

      <div className="asset-gallery__filters">
        {filters.map((filter, index) => (
          <button
            key={filter}
            type="button"
            className={`chip${index === 0 ? " chip--active" : ""}`}
          >
            {filter}
          </button>
        ))}
      </div>

      <div className="asset-gallery__search">
        <label className="visually-hidden" htmlFor="asset-search">
          搜尋資產
        </label>
        <input
          id="asset-search"
          className="input"
          placeholder="Search by name or metadata"
        />
        <div className="asset-gallery__per-page">
          <label htmlFor="asset-per-page">Per page</label>
          <select id="asset-per-page" className="select">
            <option>24</option>
            <option>48</option>
            <option>96</option>
          </select>
        </div>
        <div className="asset-gallery__search-actions">
          <button type="button" className="button button--primary">
            Apply
          </button>
          <button type="button" className="button button--ghost">
            Reset
          </button>
        </div>
      </div>

      <div className="asset-gallery__grid">
        {assets.map((asset) => (
          <div key={asset.id} className="asset-card">
            <div className="asset-card__thumb" aria-hidden="true">
              <span className="asset-card__thumb-icon">⟲</span>
              <span className="asset-card__thumb-label">{asset.thumbnailLabel}</span>
            </div>
            <div className="asset-card__meta">
              <div className="asset-card__name">{asset.name}</div>
              <div className="asset-card__details">
                <span>{asset.size}</span>
                <span className="asset-card__format">{asset.format}</span>
              </div>
            </div>
            <label className="asset-card__select">
              <input type="checkbox" />
              <span className="asset-card__checkbox" />
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}

type FieldMetricKey = "scans" | "clicks";
type RangePreset = "7d" | "30d" | "custom";

interface FieldMetricSummary {
  metrics: FieldZoneMetric[];
  totalScans: number;
  totalClicks: number;
  avgEngagement: number;
  landing: LandingSummary;
  bestScanZone: FieldZoneMetric | null;
  lowestScanZone: FieldZoneMetric | null;
  highestEngagementZone: FieldZoneMetric | null;
  lowestEngagementZone: FieldZoneMetric | null;
}

interface FieldZoneMetric {
  id: string;
  label: string;
  scans: number;
  clicks: number;
  share: number;
  engagement: number;
  deltaFromAverage: number;
  recommendation: string;
}

interface LandingSummary {
  total: number;
  zh: number;
  en: number;
}

interface AiStats {
  total: number;
  zh: number;
  en: number;
  trend: AiTrendPoint[];
  categories: AiCategoryStat[];
  questions: AiQuestion[];
}

interface AiTrendPoint {
  label: string;
  total: number;
  zh: number;
  en: number;
}

interface AiCategoryStat {
  category: string;
  count: number;
}

interface AiQuestion {
  id: string;
  question: string;
  category: string;
  language: "zh" | "en";
  time: Date;
}

interface DateRangeSelection {
  start: Date;
  end: Date;
}

function FieldManagementContent({ data }: { data: DashboardData }) {
  const [metric, setMetric] = useState<FieldMetricKey>("scans");
  const [preset, setPreset] = useState<RangePreset>("7d");
  const [customRange, setCustomRange] = useState<DateRangeSelection>(() =>
    createRollingRange(7)
  );

  const effectiveRange = useMemo<DateRangeSelection>(() => {
    if (preset === "7d") return createRollingRange(7);
    if (preset === "30d") return createRollingRange(30);
    return normalizeRange(customRange);
  }, [preset, customRange]);

  const fieldSummary = useMemo<FieldMetricSummary>(
    () => computeFieldMetrics(data, effectiveRange.start, effectiveRange.end),
    [data, effectiveRange.start, effectiveRange.end]
  );

  const maxScans = useMemo(
    () => Math.max(1, ...fieldSummary.metrics.map((item) => item.scans)),
    [fieldSummary.metrics]
  );
  const maxClicks = useMemo(
    () => Math.max(1, ...fieldSummary.metrics.map((item) => item.clicks)),
    [fieldSummary.metrics]
  );
  const metricsById = useMemo(
    () => new Map(fieldSummary.metrics.map((item) => [item.id, item])),
    [fieldSummary.metrics]
  );

  const rangeLabel = `${formatDate(effectiveRange.start)} - ${formatDate(effectiveRange.end)}`;
  const dayCount = Math.max(
    1,
    Math.round(
      (truncateToDay(effectiveRange.end).getTime() -
        truncateToDay(effectiveRange.start).getTime()) /
        (1000 * 60 * 60 * 24)
    ) + 1
  );

  const handleCustomChange = (key: keyof DateRangeSelection, value: string) => {
    const parsed = parseDateInput(value);
    if (!parsed) return;
    setPreset("custom");
    setCustomRange((prev) => {
      const next = { ...prev, [key]: truncateToDay(parsed) };
      return normalizeRange(next);
    });
  };

  return (
    <div className="field-panel">
      <div className="field-controls">
        <div className="field-controls__group">
          <span className="field-controls__label">熱力圖</span>
          <div className="field-controls__toggles">
            <button
              type="button"
              className={`chip${metric === "scans" ? " chip--active" : ""}`}
              onClick={() => setMetric("scans")}
            >
              掃描熱度
            </button>
            <button
              type="button"
              className={`chip${metric === "clicks" ? " chip--active" : ""}`}
              onClick={() => setMetric("clicks")}
            >
              物件點擊
            </button>
          </div>
        </div>

        <div className="field-controls__group field-controls__group--range">
          <span className="field-controls__label">時間區段</span>
          <div className="field-controls__toggles">
            <button
              type="button"
              className={`chip${preset === "7d" ? " chip--active" : ""}`}
              onClick={() => setPreset("7d")}
            >
              最近七日
            </button>
            <button
              type="button"
              className={`chip${preset === "30d" ? " chip--active" : ""}`}
              onClick={() => setPreset("30d")}
            >
              最近 30 日
            </button>
            <button
              type="button"
              className={`chip${preset === "custom" ? " chip--active" : ""}`}
              onClick={() => setPreset("custom")}
            >
              自訂
            </button>
          </div>
          {preset === "custom" && (
            <div className="field-controls__custom">
              <label>
                開始
                <input
                  type="date"
                  value={formatDateInput(effectiveRange.start)}
                  onChange={(event) => handleCustomChange("start", event.target.value)}
                />
              </label>
              <label>
                結束
                <input
                  type="date"
                  value={formatDateInput(effectiveRange.end)}
                  onChange={(event) => handleCustomChange("end", event.target.value)}
                />
              </label>
            </div>
          )}
          <span className="field-controls__range-label">{rangeLabel}</span>
        </div>
      </div>

      <div className="field-visuals">
        <div className="zone-map">
          <div className="zone-map__legend">
            <span className="zone-map__legend-dot zone-map__legend-dot--scan" />
            掃描
            <span className="zone-map__legend-dot zone-map__legend-dot--click" />
            物件點擊
          </div>
          <p className="zone-map__hint">※ 圖片可替換為實際園區地圖，節點位置示意。</p>
          {FIELD_ZONES.map((zone) => {
            const metricItem = metricsById.get(zone.id);
            const scans = metricItem?.scans ?? 0;
            const clicks = metricItem?.clicks ?? 0;
            const intensity =
              metric === "scans"
                ? Math.min(1, scans / maxScans)
                : Math.min(1, clicks / maxClicks);
            const value = metric === "scans" ? scans : clicks;
            const size = 18 + intensity * 28;
            const backgroundColor =
              metric === "scans"
                ? `rgba(74, 141, 247, ${0.45 + intensity * 0.4})`
                : `rgba(255, 157, 80, ${0.45 + intensity * 0.4})`;
            const glow =
              metric === "scans"
                ? `0 0 0 3px rgba(74, 141, 247, ${0.2 + intensity * 0.3})`
                : `0 0 0 3px rgba(255, 157, 80, ${0.2 + intensity * 0.3})`;
            const shareLabel = metricItem
              ? `${(metricItem.share * 100).toFixed(1)}%`
              : "—";
            return (
              <div
                key={zone.id}
                className="zone-map__marker"
                style={{
                  top: zone.top,
                  left: zone.left,
                  width: `${size}px`,
                  height: `${size}px`,
                  background: backgroundColor,
                  boxShadow: glow,
                }}
              >
                <span className="zone-map__value">{formatNumber(value)}</span>
                <span className="zone-map__name">{zone.label}</span>
                <span className="zone-map__share">{shareLabel}</span>
              </div>
            );
          })}
        </div>

        <aside className="field-insights">
          <div className="field-card">
            <span className="field-card__label">最高掃描區</span>
            <strong className="field-card__value">
              {fieldSummary.bestScanZone ? fieldSummary.bestScanZone.label : "尚無資料"}
            </strong>
            <span className="field-card__note">
              {fieldSummary.bestScanZone
                ? `${formatNumber(fieldSummary.bestScanZone.scans)} 次掃描`
                : "待串接"}
            </span>
          </div>
          <div className="field-card">
            <span className="field-card__label">互動強度偏低</span>
            <strong className="field-card__value field-card__value--alert">
              {fieldSummary.lowestEngagementZone
                ? fieldSummary.lowestEngagementZone.label
                : "尚無資料"}
            </strong>
            <span className="field-card__note">
              平均 {formatEngagement(fieldSummary.avgEngagement)}，此區{" "}
              {fieldSummary.lowestEngagementZone
                ? formatEngagement(fieldSummary.lowestEngagementZone.engagement)
                : "—"}
            </span>
          </div>
          <div className="field-card">
            <span className="field-card__label">平均日掃描</span>
            <strong className="field-card__value">
              {formatNumber(Math.round(fieldSummary.totalScans / dayCount))}
            </strong>
            <span className="field-card__note">{dayCount} 日區間</span>
          </div>
        </aside>
      </div>

      <div className="field-chart">
        {fieldSummary.metrics.map((item) => {
          const activeValue = metric === "scans" ? item.scans : item.clicks;
          const intensity =
            metric === "scans"
              ? Math.min(1, item.scans / maxScans)
              : Math.min(1, item.clicks / maxClicks);
          return (
            <div key={item.id} className="field-chart__row">
              <div className="field-chart__label">{item.label}</div>
              <div className="field-chart__bar">
                <span
                  className="field-chart__fill"
                  style={{
                    width: `${Math.max(6, intensity * 100)}%`,
                    background: metric === "scans" ? "#4a8df7" : "#ff9f43",
                  }}
                />
              </div>
              <div className="field-chart__meta">
                <span className="field-chart__value">{formatNumber(activeValue)}</span>
                <span className="field-chart__secondary">
                  互動強度 {formatEngagement(item.engagement)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="field-users">
        <div className="field-users__cards">
          <div className="field-card">
            <span className="field-card__label">Landing Page 總進入</span>
            <strong className="field-card__value">
              {formatNumber(fieldSummary.landing.total)}
            </strong>
            <span className="field-card__note">掃描後完成導頁</span>
          </div>
          <div className="field-card">
            <span className="field-card__label">中文環境</span>
            <strong className="field-card__value">
              {formatNumber(fieldSummary.landing.zh)}
            </strong>
            <span className="field-card__note">裝置預設語言為繁/簡中</span>
          </div>
          <div className="field-card">
            <span className="field-card__label">英文環境</span>
            <strong className="field-card__value">
              {formatNumber(fieldSummary.landing.en)}
            </strong>
            <span className="field-card__note">裝置預設語言為英文</span>
          </div>
        </div>

        <div className="field-users__chart">
          <div className="field-users__chart-row">
            <span className="field-users__chart-label">中文</span>
            <div className="field-users__chart-bar">
              <span
                className="field-users__chart-fill field-users__chart-fill--zh"
                style={{
                  width: `${calculateShare(fieldSummary.landing.zh, fieldSummary.landing.total)}%`,
                }}
              />
            </div>
            <span className="field-users__chart-value">
              {formatShare(fieldSummary.landing.zh, fieldSummary.landing.total)}
            </span>
          </div>
          <div className="field-users__chart-row">
            <span className="field-users__chart-label">英文</span>
            <div className="field-users__chart-bar">
              <span
                className="field-users__chart-fill field-users__chart-fill--en"
                style={{
                  width: `${calculateShare(fieldSummary.landing.en, fieldSummary.landing.total)}%`,
                }}
              />
            </div>
            <span className="field-users__chart-value">
              {formatShare(fieldSummary.landing.en, fieldSummary.landing.total)}
            </span>
          </div>
        </div>
      </div>

      <div className="field-table">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th scope="col">區域</th>
                <th scope="col">掃描量</th>
                <th scope="col">物件點擊</th>
                <th scope="col">互動強度 (次/掃描)</th>
                <th scope="col">掃描佔比</th>
                <th scope="col">日均掃描</th>
                <th scope="col">建議</th>
              </tr>
            </thead>
            <tbody>
              {fieldSummary.metrics.map((item) => (
                <tr key={item.id}>
                  <th scope="row">{item.label}</th>
                  <td>{formatNumber(item.scans)}</td>
                  <td>{formatNumber(item.clicks)}</td>
                  <td>{formatRatio(item.engagement)}</td>
                  <td>{(item.share * 100).toFixed(1)}%</td>
                  <td>{formatNumber(Math.round(item.scans / dayCount))}</td>
                  <td>{item.recommendation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="field-footnote">
        * 掃描數據來自燈具事件；物件點擊為示意值，實際互動成效需與 AR 事件資料串接。
      </p>
    </div>
  );
}

function FieldDataCenterSection({ data }: { data: DashboardData }) {
  return (
    <div className="section">
      <Panel
        title="場域熱力分析"
        subtitle="對照園區六大區域的掃描與互動熱度，快速找出導覽與行銷優化方向。"
      >
        <FieldManagementContent data={data} />
      </Panel>
    </div>
  );
}

function MemberManagement({
  ownerDomains,
  projects,
}: {
  ownerDomains: string[];
  projects: Project[];
}) {
  const members = useMemo(() => {
    if (projects.length === 0) {
      return [
        { email: "rd@lig.com.tw", project: "研發專案" },
        { email: "kai.chang@lig.com.tw", project: "kai專案" },
        { email: "part_time_worker@lig.com.tw", project: "彈性人力支援" },
        { email: "sunny.sha0@lig.com.tw", project: "館務支援" },
      ];
    }

    const rows: { email: string; project: string }[] = [];
    projects.forEach((project) => {
      project.ownerEmails.forEach((email) => {
        rows.push({
          email,
          project: project.name,
        });
      });
    });

    return rows.slice(0, 12);
  }, [projects]);

  return (
    <div className="member-panel">
      <header className="member-panel__header">
        <div>
          <p className="member-panel__greeting">
            Hi {ownerDomains[0] ? `admin@${ownerDomains[0]}` : "admin@lig.com.tw"}
          </p>
          <h3 className="member-panel__title">會員列表</h3>
        </div>
        <button type="button" className="member-panel__create button button--success">
          新增使用者
        </button>
      </header>

      <div className="member-table">
        <div className="member-table__head">
          <span>帳號</span>
          <span>專案名稱</span>
          <span className="member-table__actions-heading">操作</span>
        </div>
        <ul className="member-table__body">
          {members.map((member, index) => (
            <li key={`${member.email}-${index}`} className="member-table__row">
              <span className="member-table__cell member-table__cell--email">
                {member.email}
              </span>
              <span className="member-table__cell">{member.project}</span>
              <span className="member-table__cell member-table__cell--actions">
                <button type="button" className="member-table__btn member-table__btn--edit">
                  編輯會員
                </button>
                <button type="button" className="member-table__btn member-table__btn--delete">
                  刪除
                </button>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p className="member-panel__note">
        角色權限：館方管理者、營運夥伴、研究人員、志工。敏感操作須二次驗證。
      </p>
    </div>
  );
}

function ProjectManagement({ data }: { data: DashboardData }) {
  const representativeOwner = useMemo(() => {
    for (const project of data.projects) {
      if (project.ownerEmails.length) return project.ownerEmails[0];
    }
    return "admin@lig.com.tw";
  }, [data.projects]);

  const rows = useMemo(() => {
    const coordinateByLight = new Map<number, number | null>();
    data.lights.forEach((light) => {
      coordinateByLight.set(light.ligId, light.coordinateSystemId);
    });

    return data.projects.map((project, index) => {
      const lightCount = project.lightIds.length;
      const coordinateSystems = new Set<number>();
      project.lightIds.forEach((id) => {
        const csId = coordinateByLight.get(id);
        if (typeof csId === "number") coordinateSystems.add(csId);
      });

      const usageMb = Math.max(
        12,
        Number((lightCount * 3.2 + project.scenes.length * 5.7).toFixed(3))
      );

      return {
        id: project.projectId,
        sceneName: project.name,
        previewLabel: project.scenes[0] ?? project.name,
        status: project.isActive ? "Ready" : "草稿",
        compression: "檢視",
        usage: usageMb,
        coordinateCount: coordinateSystems.size,
        arObjectCount: project.scenes.length || project.lightIds.length,
        isActive: project.isActive,
        link: `#project-${project.projectId}`,
        index,
      };
    });
  }, [data.projects, data.lights]);

  return (
    <div className="project-panel">
      <header className="project-panel__header">
        <div>
          <h3 className="project-panel__title">專案：{representativeOwner}</h3>
          <p className="project-panel__subtitle">
            掌握場景壓縮檔、座標系統與 AR 物件狀態，可直接執行發佈作業。
          </p>
        </div>
        <button type="button" className="button button--success project-panel__create">
          新增場景
        </button>
      </header>

      <div className="project-table">
        <div className="project-table__head">
          <span>場景縮圖</span>
          <span>場景名稱</span>
          <span>場景壓縮檔</span>
          <span>Usage (MB)</span>
          <span>座標系量</span>
          <span>AR 物件數量</span>
          <span>操作</span>
        </div>
        <ul className="project-table__body">
          {rows.map((row) => (
            <li key={row.id} className="project-table__row">
              <span className="project-table__cell project-table__cell--thumb">
                <span className="project-table__badge">{row.status}</span>
              </span>
              <span className="project-table__cell project-table__cell--link">
                <a href={row.link}>{row.sceneName}</a>
              </span>
              <span className="project-table__cell">
                <button type="button" className="pill-button pill-button--outline">
                  {row.compression}
                </button>
              </span>
              <span className="project-table__cell">{row.usage.toFixed(3)}</span>
              <span className="project-table__cell">{row.coordinateCount}</span>
              <span className="project-table__cell">{row.arObjectCount}</span>
              <span className="project-table__cell project-table__cell--actions">
                <button type="button" className="pill-button pill-button--sky">
                  複製場景及物件
                </button>
                <button type="button" className="pill-button pill-button--amber">
                  傳送場景至座標系
                </button>
                <button type="button" className="pill-button pill-button--danger">
                  刪除
                </button>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function AiDataSection({ data }: { data: DashboardData }) {
  const [preset, setPreset] = useState<RangePreset>("7d");
  const [customRange, setCustomRange] = useState<DateRangeSelection>(() =>
    createRollingRange(7)
  );

  const effectiveRange = useMemo<DateRangeSelection>(() => {
    if (preset === "7d") return createRollingRange(7);
    if (preset === "30d") return createRollingRange(30);
    return normalizeRange(customRange);
  }, [preset, customRange]);

  const aiStats = useMemo(
    () => computeAiStats(data, effectiveRange.start, effectiveRange.end),
    [data, effectiveRange.start, effectiveRange.end]
  );

  const rangeLabel = `${formatDate(effectiveRange.start)} - ${formatDate(effectiveRange.end)}`;

  const handleCustomChange = (key: keyof DateRangeSelection, value: string) => {
    const parsed = parseDateInput(value);
    if (!parsed) return;
    setPreset("custom");
    setCustomRange((prev) => {
      const next = { ...prev, [key]: truncateToDay(parsed) };
      return normalizeRange(next);
    });
  };

  return (
    <div className="section">
      <Panel
        title="AI 數據中心"
        subtitle="統計導覽期間的 AI 調用量，並將問題自動分類，協助園方規劃內容。"
      >
        <div className="ai-panel">
          <div className="ai-controls field-controls">
            <div className="field-controls__group">
              <span className="field-controls__label">時間區段</span>
              <div className="field-controls__toggles">
                <button
                  type="button"
                  className={`chip${preset === "7d" ? " chip--active" : ""}`}
                  onClick={() => setPreset("7d")}
                >
                  最近七日
                </button>
                <button
                  type="button"
                  className={`chip${preset === "30d" ? " chip--active" : ""}`}
                  onClick={() => setPreset("30d")}
                >
                  最近 30 日
                </button>
                <button
                  type="button"
                  className={`chip${preset === "custom" ? " chip--active" : ""}`}
                  onClick={() => setPreset("custom")}
                >
                  自訂
                </button>
              </div>
              {preset === "custom" && (
                <div className="field-controls__custom">
                  <label>
                    開始
                    <input
                      type="date"
                      value={formatDateInput(effectiveRange.start)}
                      onChange={(event) => handleCustomChange("start", event.target.value)}
                    />
                  </label>
                  <label>
                    結束
                    <input
                      type="date"
                      value={formatDateInput(effectiveRange.end)}
                      onChange={(event) => handleCustomChange("end", event.target.value)}
                    />
                  </label>
                </div>
              )}
              <span className="field-controls__range-label">{rangeLabel}</span>
            </div>
          </div>

          <div className="ai-summary field-users__cards">
            <div className="card card--metric">
              <span className="card__label">AI 調用總數</span>
              <span className="card__value">{formatNumber(aiStats.total)}</span>
              <span className="card__note">掃描後觸發 AI 導覽</span>
            </div>
            <div className="card card--metric">
              <span className="card__label">中文環境</span>
              <span className="card__value">{formatNumber(aiStats.zh)}</span>
              <span className="card__note">約 {formatShare(aiStats.zh, aiStats.total)} 佔比</span>
            </div>
            <div className="card card--metric">
              <span className="card__label">英文環境</span>
              <span className="card__value">{formatNumber(aiStats.en)}</span>
              <span className="card__note">約 {formatShare(aiStats.en, aiStats.total)} 佔比</span>
            </div>
          </div>

          <div className="ai-trend">
            <h3 className="ai-trend__title">日趨勢</h3>
            <ul className="ai-trend__list">
              {aiStats.trend.map((item) => (
                <li key={item.label} className="ai-trend__item">
                  <span className="ai-trend__date">{item.label}</span>
                  <span className="ai-trend__total">{formatNumber(item.total)}</span>
                  <span className="ai-trend__lang ai-trend__lang--zh">
                    中文 {formatNumber(item.zh)}
                  </span>
                  <span className="ai-trend__lang ai-trend__lang--en">
                    英文 {formatNumber(item.en)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="ai-categories">
            <h3 className="ai-categories__title">問題分類 (LLM 分析)</h3>
            <ul className="ai-categories__list">
              {aiStats.categories.map((item) => (
                <li key={item.category} className="ai-categories__item">
                  <span className="ai-categories__label">{item.category}</span>
                  <span className="ai-categories__count">{formatNumber(item.count)}</span>
                  <span className="ai-categories__share">
                    {formatShare(item.count, aiStats.total)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="ai-panel__note">* 使用 LLM 將訪客提問分類，協助園方了解熱門議題。</p>
          </div>

          <div className="ai-questions">
            <div className="ai-questions__header">
              <h3 className="ai-questions__title">用戶問答紀錄</h3>
              <button type="button" className="button button--ghost">
                下載問答紀錄 CSV
              </button>
            </div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th scope="col">問題</th>
                    <th scope="col">分類</th>
                    <th scope="col">語言</th>
                    <th scope="col">時間</th>
                  </tr>
                </thead>
                <tbody>
                  {aiStats.questions.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="table__empty">
                        尚無問答紀錄，可透過 AI 導覽收集訪客問題。
                      </td>
                    </tr>
                  ) : (
                    aiStats.questions.map((question) => (
                      <tr key={question.id}>
                        <th scope="row">{question.question}</th>
                        <td>{question.category}</td>
                        <td>{formatLanguage(question.language)}</td>
                        <td>{formatDateTime(question.time)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}

function UserActivitySection({ data }: { data: DashboardData }) {
  const logs = useMemo(() => buildUserLogs(data), [data]);

  const refererChecklist = useMemo(
    () => [
      {
        label: "Referrer",
        note: "待與前端埋點串接，提供來源網址與媒體。",
        status: "待串接",
      },
      {
        label: "URL",
        note: "確認進入頁與導覽任務對應。",
        status: "規格確認",
      },
      {
        label: "時間",
        note: "需採用 UTC 儲存，前端顯示轉換為台灣時間。",
        status: "設計完成",
      },
    ],
    []
  );

  const alerts = useMemo(
    () => [
      {
        title: "同 IP 於 5 分鐘內大量掃描",
        note: "觸發通知並暫停該 IP，防止惡意攻擊。",
      },
      {
        title: "關鍵場域連續 3 小時無掃描",
        note: "可能裝置故障或導覽流程中斷，需要場務確認。",
      },
      {
        title: "使用者切換語系後未成功載入",
        note: "需檢查資產對應與快取設定。",
      },
    ],
    []
  );

  return (
    <div className="section">
      <Panel
        title="即時操作紀錄"
        subtitle="整合掃描與點擊事件，後續可加上自訂事件"
        actions={<span className="panel__hint">支援 CSV 匯出</span>}
      >
        <ul className="log-list">
          {logs.map((log) => (
            <li key={log.id} className="log-list__item">
              <div className="log-list__time">{formatDateTime(log.time)}</div>
              <div className="log-list__type">
                <span className={`badge badge--${log.type}`}>{log.typeLabel}</span>
              </div>
              <div className="log-list__content">
                <span className="log-list__title">{log.title}</span>
                <span className="log-list__note">{log.note}</span>
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      <div className="split-grid">
        <Panel title="最初進入來源" subtitle="Referrer / URL / 時間">
          <ul className="checklist checklist--plain">
            {refererChecklist.map((item) => (
              <li key={item.label} className="checklist__item">
                <span className="checklist__label">{item.label}</span>
                <span className="checklist__note">{item.note}</span>
                <span className="badge badge--muted">{item.status}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="操作告警" subtitle="自訂規則與通知設計">
          <ul className="feature-list">
            {alerts.map((alert) => (
              <li key={alert.title}>
                <span className="badge badge--accent">預警</span>
                <span className="feature-list__content">
                  <strong>{alert.title}</strong> — {alert.note}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="state state--loading" role="status" aria-live="polite">
      <div className="state__spinner" aria-hidden="true" />
      <p>資料載入中，請稍候…</p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="state state--error" role="alert">
      <h2>載入失敗</h2>
      <p>{message}</p>
      <p className="state__hint">請檢查 API 憑證或重新整理頁面。</p>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="panel">
      <header className="panel__header">
        <div>
          <h2 className="panel__title">{title}</h2>
          {subtitle ? <p className="panel__subtitle">{subtitle}</p> : null}
        </div>
        {actions ? <div className="panel__actions">{actions}</div> : null}
      </header>
      <div className="panel__body">{children}</div>
    </section>
  );
}

interface LogItem {
  id: string;
  time: Date;
  type: "scan" | "click";
  typeLabel: string;
  title: string;
  note: string;
}

interface GalleryAsset {
  id: string;
  name: string;
  size: string;
  format: string;
  type: string;
  thumbnailLabel: string;
}

function computeLastUpdated(data?: DashboardData): Date | null {
  if (!data) return null;
  let latest = Number.NEGATIVE_INFINITY;

  for (const scan of data.scans) {
    const ts = scan.time.getTime();
    if (ts > latest) latest = ts;
  }

  for (const click of data.clicks) {
    const ts = click.time.getTime();
    if (ts > latest) latest = ts;
  }

  for (const light of data.lights) {
    if (light.updatedAt) {
      const ts = light.updatedAt.getTime();
      if (ts > latest) latest = ts;
    }
  }

  return Number.isFinite(latest) ? new Date(latest) : null;
}

function computeFieldMetrics(
  data: DashboardData,
  startDate: Date,
  endDate: Date
): FieldMetricSummary {
  let start = truncateToDay(startDate);
  let end = truncateToDay(endDate);
  if (start.getTime() > end.getTime()) {
    [start, end] = [end, start];
  }

  const zoneTotal = new Map<string, { scans: number; clicks: number }>();
  FIELD_ZONES.forEach((zone) => zoneTotal.set(zone.id, { scans: 0, clicks: 0 }));

  const zoneByLight = new Map<number, string>();
  data.lights.forEach((light, index) => {
    zoneByLight.set(light.ligId, resolveZoneId(light, index));
  });

  const startMs = start.getTime();
  const endMs = end.getTime();

  data.scans.forEach((scan) => {
    const time = scan.time.getTime();
    if (time < startMs || time > endMs) return;
    const zoneId =
      zoneByLight.get(scan.ligId) ??
      FIELD_ZONES[(scan.ligId - 1) % FIELD_ZONES.length]?.id ??
      FIELD_ZONES[0].id;
    if (!zoneTotal.has(zoneId)) {
      zoneTotal.set(zoneId, { scans: 0, clicks: 0 });
    }
    zoneTotal.get(zoneId)!.scans += 1;
  });

  FIELD_ZONES.forEach((zone, index) => {
    if (!zoneTotal.has(zone.id)) {
      zoneTotal.set(zone.id, { scans: 0, clicks: 0 });
    }
    const entry = zoneTotal.get(zone.id)!;
    const ratio = 0.35 + ((index % 3) * 0.1);
    entry.clicks = Math.round(entry.scans * ratio);
  });

  const metricsDraft = FIELD_ZONES.map((zone) => {
    const entry = zoneTotal.get(zone.id) ?? { scans: 0, clicks: 0 };
    return {
      id: zone.id,
      label: zone.label,
      scans: entry.scans,
      clicks: entry.clicks,
    };
  });

  const totalScans = metricsDraft.reduce((sum, item) => sum + item.scans, 0);
  const totalClicks = metricsDraft.reduce((sum, item) => sum + item.clicks, 0);
  const avgEngagement = totalScans > 0 ? totalClicks / totalScans : 0;
  const landing = computeLandingSummary(data, start, end);

  const metrics = metricsDraft.map<FieldZoneMetric>((item) => {
    const share = totalScans > 0 ? item.scans / totalScans : 0;
    const engagement = item.scans > 0 ? item.clicks / item.scans : 0;
    const deltaFromAverage = engagement - avgEngagement;
    const recommendation = buildFieldRecommendation(share, engagement, avgEngagement, item.scans);
    return {
      id: item.id,
      label: item.label,
      scans: item.scans,
      clicks: item.clicks,
      share,
      engagement,
      deltaFromAverage,
      recommendation,
    };
  });

  const bestScanZone =
    metrics.reduce<FieldZoneMetric | null>(
      (best, curr) => (best === null || curr.scans > best.scans ? curr : best),
      null
    ) ?? null;
  const lowestScanZone =
    metrics.reduce<FieldZoneMetric | null>(
      (lowest, curr) => (lowest === null || curr.scans < lowest.scans ? curr : lowest),
      null
    ) ?? null;
  const highestEngagementZone =
    metrics.reduce<FieldZoneMetric | null>(
      (best, curr) => (best === null || curr.engagement > best.engagement ? curr : best),
      null
    ) ?? null;
  const lowestEngagementZone =
    metrics.reduce<FieldZoneMetric | null>(
      (lowest, curr) => (lowest === null || curr.engagement < lowest.engagement ? curr : lowest),
      null
    ) ?? null;

  return {
    metrics,
    totalScans,
    totalClicks,
    avgEngagement,
    landing,
    bestScanZone,
    lowestScanZone,
    highestEngagementZone,
    lowestEngagementZone,
  };
}

function computeLandingSummary(
  data: DashboardData,
  start: Date,
  end: Date
): LandingSummary {
  const startMs = start.getTime();
  const endMs = end.getTime();
  let zh = 0;
  let en = 0;

  data.scans.forEach((scan) => {
    const time = scan.time.getTime();
    if (time < startMs || time > endMs) return;
    const preferred = (scan as unknown as { lang?: string }).lang ?? inferLanguageFromClient(scan.clientId);
    if (preferred === "zh" || preferred === "zh-TW" || preferred === "zh-CN") {
      zh += 1;
    } else {
      en += 1;
    }
  });

  if (zh + en === 0) {
    return {
      total: 0,
      zh: 0,
      en: 0,
    };
  }

  return {
    total: zh + en,
    zh,
    en,
  };
}

function computeAiStats(
  data: DashboardData,
  startDate: Date,
  endDate: Date
): AiStats {
  let start = truncateToDay(startDate);
  let end = truncateToDay(endDate);
  if (start.getTime() > end.getTime()) {
    [start, end] = [end, start];
  }

  const startMs = start.getTime();
  const endMs = end.getTime() + MS_PER_DAY - 1;

  const trendMap = new Map<string, { date: Date; total: number; zh: number; en: number }>();
  const categoryMap = new Map<string, number>();
  const questions: AiQuestion[] = [];

  let zh = 0;
  let en = 0;

  data.clicks.forEach((click, index) => {
    const time = click.time.getTime();
    if (time < startMs || time > endMs) return;
    const language = detectLanguage(click.codeName);
    language === "zh" ? (zh += 1) : (en += 1);

    const day = truncateToDay(click.time);
    const key = day.toISOString();
    if (!trendMap.has(key)) {
      trendMap.set(key, { date: day, total: 0, zh: 0, en: 0 });
    }
    const trend = trendMap.get(key)!;
    trend.total += 1;
    if (language === "zh") trend.zh += 1;
    else trend.en += 1;

    const question = buildAiQuestion(click, language, index);
    questions.push(question);

    const category = question.category;
    categoryMap.set(category, (categoryMap.get(category) ?? 0) + 1);
  });

  const total = zh + en;
  const trend = Array.from(trendMap.values())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((item) => ({
      label: formatDate(item.date),
      total: item.total,
      zh: item.zh,
      en: item.en,
    }));

  const categories = Array.from(categoryMap.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  return {
    total,
    zh,
    en,
    trend,
    categories,
    questions: questions.slice(0, 12),
  };
}

function buildUserLogs(data: DashboardData): LogItem[] {
  const entries: LogItem[] = [];

  data.scans.forEach((scan, index) => {
    entries.push({
      id: `scan-${index}-${scan.time.getTime()}`,
      time: scan.time,
      type: "scan",
      typeLabel: "掃描",
      title: `掃描燈具 #${scan.ligId}`,
      note: scan.clientId ? `Client ${scan.clientId}` : "匿名訪客",
    });
  });

  data.clicks.forEach((click, index) => {
    entries.push({
      id: `click-${index}-${click.time.getTime()}`,
      time: click.time,
      type: "click",
      typeLabel: "點擊",
      title: `互動物件 #${click.objId}`,
      note: click.codeName || "未命名物件",
    });
  });

  return entries
    .sort((a, b) => b.time.getTime() - a.time.getTime())
    .slice(0, 20);
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function resolveZoneId(light: LightRecord, index: number): string {
  if (light.fieldId !== null && light.fieldId >= 1 && light.fieldId <= FIELD_ZONES.length) {
    return `Zone${light.fieldId}`;
  }
  if (light.coordinateSystemName) {
    const match = light.coordinateSystemName.match(/zone\s*(\d+)/i);
    if (match) {
      const zoneNumber = Number(match[1]);
      if (!Number.isNaN(zoneNumber)) {
        return `Zone${zoneNumber}`;
      }
    }
  }
  return FIELD_ZONES[index % FIELD_ZONES.length]?.id ?? FIELD_ZONES[0].id;
}

function buildFieldRecommendation(
  share: number,
  engagement: number,
  avgEngagement: number,
  scans: number
): string {
  if (scans === 0) return "尚未有掃描，建議加強導引或宣傳。";
  if (share < 0.12) return "人流偏低，可安排現場活動或指標導流。";
  if (engagement < Math.max(0, avgEngagement - 0.4)) {
    return "互動強度偏低，建議檢查導覽內容與 CTA。";
  }
  if (engagement > avgEngagement + 0.4) {
    return "互動強度亮眼，可複製成功腳本到其他區。";
  }
  return "表現穩定，持續追蹤即可。";
}

function createRollingRange(days: number): DateRangeSelection {
  const end = truncateToDay(new Date());
  const start = truncateToDay(new Date(end.getTime() - (Math.max(1, days) - 1) * MS_PER_DAY));
  return { start, end };
}

function inferLanguageFromClient(clientId: string): "zh" | "en" {
  if (!clientId) return "zh";
  const lowered = clientId.toLowerCase();
  if (lowered.includes("tw") || lowered.includes("zh") || lowered.includes("cn")) {
    return "zh";
  }
  return "en";
}

function detectLanguage(text: string): "zh" | "en" {
  if (!text) return "zh";
  return /[\u3400-\u9FFF]/.test(text) ? "zh" : "en";
}

function buildAiQuestion(
  click: ClickRecord,
  language: "zh" | "en",
  index: number
): AiQuestion {
  const questionText = click.codeName?.trim() || `AI 問題 #${click.objId}`;
  const category = classifyAiQuestion(questionText);
  return {
    id: `ai-${index}-${click.objId}`,
    question: questionText,
    category,
    language,
    time: click.time,
  };
}

function classifyAiQuestion(question: string): string {
  const text = question.toLowerCase();
  if (/[\u3400-\u9FFF]/.test(question) && text.includes("餵")) {
    return "飼養照護";
  }
  if (text.includes("feeding") || text.includes("food")) {
    return "飼養照護";
  }
  if (text.includes("ticket") || text.includes("開館") || text.includes("時間")) {
    return "票務 / 開放時間";
  }
  if (text.includes("交通") || text.includes("parking") || text.includes("路線")) {
    return "交通動線";
  }
  if (text.includes("souvenir") || text.includes("shop") || text.includes("紀念")) {
    return "商店與活動";
  }
  return "一般諮詢";
}

function normalizeRange(range: DateRangeSelection): DateRangeSelection {
  const start = truncateToDay(range.start);
  const end = truncateToDay(range.end);
  if (start.getTime() <= end.getTime()) {
    return { start, end };
  }
  return { start: end, end: start };
}

function parseDateInput(value: string): Date | null {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function formatDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatEngagement(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return `${value.toFixed(1)} 次/掃描`;
}

function formatRatio(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return value.toFixed(2);
}

function formatShare(part: number, total: number): string {
  return total > 0 ? `${((part / total) * 100).toFixed(1)}%` : "—";
}

function calculateShare(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.max(6, Math.min(100, (part / total) * 100));
}

function formatLanguage(language: "zh" | "en"): string {
  return language === "zh" ? "中文" : "英文";
}

function deriveOwnerDomains(projects: Project[]): string[] {
  const domains = new Set<string>();
  projects.forEach((project) => {
    project.ownerEmails.forEach((email) => {
      const parts = email.split("@");
      if (parts.length === 2) {
        domains.add(parts[1].toLowerCase());
      }
    });
  });
  return Array.from(domains).sort();
}

function truncateToDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatNumber(value: number): string {
  return Number.isFinite(value)
    ? new Intl.NumberFormat("zh-TW").format(value)
    : "—";
}

function formatDay(date: Date): string {
  return date.toLocaleDateString("zh-TW", {
    month: "2-digit",
    day: "2-digit",
  });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatDateTime(date: Date): string {
  return date.toLocaleString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export default App;
