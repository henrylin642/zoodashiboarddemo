import {
  addMonths,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from "date-fns";
import type { DashboardData, Project, ScanRecord } from "../types";

export interface ScanSummary {
  totalProjects: number;
  activeProjects: number;
  totalScans: number;
  scansToday: number;
  scansYesterday: number;
  uniqueUsers: number;
}

export interface ProjectRankRow {
  projectId: number;
  name: string;
  lastMonth: number;
  thisMonth: number;
  lastWeek: number;
  thisWeek: number;
  yesterday: number;
  today: number;
  total: number;
}

export interface DailyScanPoint {
  date: Date;
  total: number;
  projects: Record<number, number>;
}

export interface HeatmapPoint {
  projectId: number;
  name: string;
  lat: number;
  lon: number;
  scans: number;
}

export interface ClickRankingRow {
  objId: number;
  name: string;
  sceneName: string | null;
  count: number;
}

export interface UserAcquisitionPoint {
  date: Date;
  newUsers: number;
  returningUsers: number;
  cumulativeUsers: number;
}

export interface ProjectUserAcquisitionRow {
  projectId: number;
  name: string;
  newUsers: number;
  activeUsers: number;
  topSceneName: string | null;
  topSceneNewUsers: number;
}

export interface SceneUserStatRow {
  sceneId: number;
  sceneName: string;
  newUsers: number;
  activeUsers: number;
  projectNames: string[];
}

export function computeScanSummary(
  data: DashboardData,
  referenceDate: Date = new Date()
): ScanSummary {
  const { projectScans } = buildProjectScanIndex(data);
  const todayStart = startOfDay(referenceDate);
  const todayEnd = endOfDay(referenceDate);
  const yesterdayStart = startOfDay(subDays(referenceDate, 1));
  const yesterdayEnd = endOfDay(subDays(referenceDate, 1));

  let scansToday = 0;
  let scansYesterday = 0;
  let totalScans = 0;

  for (const scans of Object.values(projectScans)) {
    totalScans += scans.length;
    for (const scan of scans) {
      if (scan.time >= todayStart && scan.time <= todayEnd) {
        scansToday += 1;
      } else if (scan.time >= yesterdayStart && scan.time <= yesterdayEnd) {
        scansYesterday += 1;
      }
    }
  }

  const activeProjects = Object.entries(projectScans).filter(
    ([, scans]) => scans.length > 0
  ).length;

  const uniqueUsers = new Set<string>();
  for (const click of data.clicks) {
    if (click.codeName) {
      uniqueUsers.add(click.codeName.trim());
    }
  }

  return {
    totalProjects: data.projects.length,
    activeProjects,
    totalScans,
    scansToday,
    scansYesterday,
    uniqueUsers: uniqueUsers.size,
  };
}

export function computeProjectRankRows(
  data: DashboardData,
  referenceDate: Date = new Date()
): ProjectRankRow[] {
  const { projectScans } = buildProjectScanIndex(data);
  const boundaries = createBoundaries(referenceDate);

  return data.projects.map<ProjectRankRow>((project) => {
    const scans = projectScans[project.projectId] ?? [];
    const counters = {
      lastMonth: countScans(scans, boundaries.lastMonth.start, boundaries.lastMonth.end),
      thisMonth: countScans(scans, boundaries.thisMonth.start, boundaries.thisMonth.end),
      lastWeek: countScans(scans, boundaries.lastWeek.start, boundaries.lastWeek.end),
      thisWeek: countScans(scans, boundaries.thisWeek.start, boundaries.thisWeek.end),
      yesterday: countScans(scans, boundaries.yesterday.start, boundaries.yesterday.end),
      today: countScans(scans, boundaries.today.start, boundaries.today.end),
    };

    return {
      projectId: project.projectId,
      name: project.name,
      ...counters,
      total: scans.length,
    };
  });
}

export function computeDailyScanSeries(
  data: DashboardData,
  start: Date,
  end: Date
): DailyScanPoint[] {
  const { projectScans } = buildProjectScanIndex(data);
  const days = eachDayOfInterval({ start: startOfDay(start), end: endOfDay(end) });

  return days.map((day) => {
    const dayStart = startOfDay(day);
    const dayEnd = endOfDay(day);
    const projects: Record<number, number> = {};
    let total = 0;

    for (const project of data.projects) {
      const scans = projectScans[project.projectId] ?? [];
      let count = 0;
      for (const scan of scans) {
        if (scan.time >= dayStart && scan.time <= dayEnd) {
          count += 1;
        }
      }
      if (count > 0) {
        projects[project.projectId] = count;
        total += count;
      }
    }

    return { date: dayStart, total, projects };
  });
}

export function computeHeatmapPoints(
  data: DashboardData,
  start?: Date,
  end?: Date
): HeatmapPoint[] {
  const { projectScans } = buildProjectScanIndex(data);
  return data.projects
    .map((project) => {
      const location = project.latLon;
      if (!location) return null;
      const scans = projectScans[project.projectId] ?? [];
      const filtered =
        start && end
          ? scans.filter((scan) => scan.time >= start && scan.time <= end)
          : scans;
      return {
        projectId: project.projectId,
        name: project.name,
        lat: location.lat,
        lon: location.lon,
        scans: filtered.length,
      };
    })
    .filter((item): item is HeatmapPoint => Boolean(item));
}

export function computeClickRanking(
  data: DashboardData,
  start: Date,
  end: Date,
  limit = 10
): ClickRankingRow[] {
  const arObjectById = data.arObjects.reduce<Record<number, typeof data.arObjects[number]>>((acc, obj) => {
    acc[obj.id] = obj;
    return acc;
  }, {});

  const counter = new Map<number, number>();
  for (const click of data.clicks) {
    if (click.time >= start && click.time <= end) {
      counter.set(click.objId, (counter.get(click.objId) ?? 0) + 1);
    }
  }

  const ranking = Array.from(counter.entries())
    .map(([objId, count]) => {
      const obj = arObjectById[objId];
      return {
        objId,
        count,
        name: obj?.name ?? String(objId),
        sceneName: obj?.sceneName ?? null,
      };
    })
    .sort((a, b) => b.count - a.count);

  return ranking.slice(0, limit);
}

export function computeUserAcquisitionSeries(
  data: DashboardData,
  windowDays = 30,
  referenceDate: Date = new Date()
): UserAcquisitionPoint[] {
  const end = endOfDay(referenceDate);
  const start = startOfDay(subDays(end, windowDays - 1));
  const days = eachDayOfInterval({ start, end });

  const newUserSets = new Map<number, Set<string>>();
  const returningUserSets = new Map<number, Set<string>>();
  for (const day of days) {
    const ts = day.getTime();
    newUserSets.set(ts, new Set());
    returningUserSets.set(ts, new Set());
  }

  const firstClickNormalized = new Map<string, number>();
  const firstDates: number[] = [];
  for (const [userId, firstDate] of Object.entries(data.firstClickByUser)) {
    const normalized = startOfDay(firstDate).getTime();
    firstClickNormalized.set(userId, normalized);
    firstDates.push(normalized);
  }
  firstDates.sort((a, b) => a - b);

  for (const click of data.clicks) {
    if (!click.codeName) continue;
    if (click.time < start || click.time > end) continue;
    const dayTs = startOfDay(click.time).getTime();
    const firstTs =
      firstClickNormalized.get(click.codeName) ??
      startOfDay(click.time).getTime();
    if (dayTs === firstTs) {
      newUserSets.get(dayTs)?.add(click.codeName);
    } else if (dayTs > firstTs) {
      returningUserSets.get(dayTs)?.add(click.codeName);
    }
  }

  const result: UserAcquisitionPoint[] = [];
  let cumulative = 0;
  let cursor = 0;

  for (const day of days) {
    const dayTs = day.getTime();
    while (cursor < firstDates.length && firstDates[cursor] <= dayTs) {
      cumulative += 1;
      cursor += 1;
    }

    result.push({
      date: day,
      newUsers: newUserSets.get(dayTs)?.size ?? 0,
      returningUsers: returningUserSets.get(dayTs)?.size ?? 0,
      cumulativeUsers: cumulative,
    });
  }

  return result;
}

export function computeUserAcquisitionMonthly(
  data: DashboardData
): UserAcquisitionPoint[] {
  const firstClickEntries = Object.entries(data.firstClickByUser);
  if (firstClickEntries.length === 0 || data.clicks.length === 0) {
    return [];
  }

  let earliestMonth = startOfMonth(firstClickEntries[0][1]);
  for (const [, firstDate] of firstClickEntries) {
    const month = startOfMonth(firstDate);
    if (month < earliestMonth) {
      earliestMonth = month;
    }
  }

  let latestClick = data.clicks[0].time;
  for (const click of data.clicks) {
    if (click.time > latestClick) {
      latestClick = click.time;
    }
  }
  const latestMonth = startOfMonth(latestClick);

  const newUsersByMonth = new Map<number, Set<string>>();
  const returningUsersByMonth = new Map<number, Set<string>>();

  for (const [userId, firstDate] of firstClickEntries) {
    const monthTs = startOfMonth(firstDate).getTime();
    if (!newUsersByMonth.has(monthTs)) {
      newUsersByMonth.set(monthTs, new Set());
    }
    newUsersByMonth.get(monthTs)!.add(userId);
  }

  for (const click of data.clicks) {
    if (!click.codeName) continue;
    const clickMonth = startOfMonth(click.time);
    const firstDate = data.firstClickByUser[click.codeName];
    if (!firstDate) continue;
    const firstMonth = startOfMonth(firstDate);
    if (clickMonth <= firstMonth) continue;
    const monthTs = clickMonth.getTime();
    if (!returningUsersByMonth.has(monthTs)) {
      returningUsersByMonth.set(monthTs, new Set());
    }
    returningUsersByMonth.get(monthTs)!.add(click.codeName);
  }

  const result: UserAcquisitionPoint[] = [];
  let cursor = earliestMonth;
  let cumulative = 0;

  while (cursor <= latestMonth) {
    const monthTs = cursor.getTime();
    const newUsers = newUsersByMonth.get(monthTs)?.size ?? 0;
    const returningUsers = returningUsersByMonth.get(monthTs)?.size ?? 0;
    cumulative += newUsers;

    result.push({
      date: cursor,
      newUsers,
      returningUsers,
      cumulativeUsers: cumulative,
    });

    cursor = addMonths(cursor, 1);
  }

  return result;
}

export function computeProjectUserAcquisition(
  data: DashboardData,
  start: Date,
  end: Date
): ProjectUserAcquisitionRow[] {
  if (data.projects.length === 0 || data.clicks.length === 0) return [];

  const startAt = startOfDay(start);
  const endAt = endOfDay(end);
  if (startAt > endAt) return [];

  const sceneToProjects = buildSceneProjectIndex(data.projects);
  if (sceneToProjects.size === 0) return [];

  const projectIdSet = new Set(data.projects.map((project) => project.projectId));

  const arObjectById = new Map<number, (typeof data.arObjects)[number]>();
  const sceneNameById = new Map<number, string>();
  for (const obj of data.arObjects) {
    arObjectById.set(obj.id, obj);
    if (obj.sceneId !== null && obj.sceneName && !sceneNameById.has(obj.sceneId)) {
      sceneNameById.set(obj.sceneId, obj.sceneName);
    }
  }

  const activeUsersByProject = new Map<number, Set<string>>();
  const newUsersByProject = new Map<number, number>();
  const newUsersByScene = new Map<number, Map<number, number>>();
  for (const project of data.projects) {
    activeUsersByProject.set(project.projectId, new Set());
    newUsersByScene.set(project.projectId, new Map());
  }

  const sortedClicks = [...data.clicks]
    .filter((click) => Boolean(click.codeName))
    .sort((a, b) => a.time.getTime() - b.time.getTime());

  const firstClickInfo = new Map<
    string,
    { time: Date; projectId: number | null; sceneId: number | null }
  >();

  for (const click of sortedClicks) {
    const userId = click.codeName!.trim();
    if (!userId) continue;
    const obj = arObjectById.get(click.objId);
    const sceneId = obj?.sceneId ?? null;
    const sceneProjects = sceneId !== null ? sceneToProjects.get(sceneId) : undefined;
    let primaryProject: number | null = null;
    if (sceneProjects) {
      for (const candidate of sceneProjects) {
        if (projectIdSet.has(candidate)) {
          primaryProject = candidate;
          break;
        }
      }
    }

    const existing = firstClickInfo.get(userId);
    if (!existing || click.time < existing.time) {
      firstClickInfo.set(userId, {
        time: click.time,
        projectId: primaryProject,
        sceneId,
      });
    }

    if (click.time < startAt || click.time > endAt) continue;
    if (!sceneProjects) continue;
    for (const projectId of sceneProjects) {
      if (!projectIdSet.has(projectId)) continue;
      activeUsersByProject.get(projectId)?.add(userId);
    }
  }

  for (const [, info] of firstClickInfo) {
    const { time, projectId, sceneId } = info;
    if (projectId === null) continue;
    if (!projectIdSet.has(projectId)) continue;
    if (time < startAt || time > endAt) continue;
    newUsersByProject.set(
      projectId,
      (newUsersByProject.get(projectId) ?? 0) + 1
    );
    if (sceneId !== null) {
      const sceneCounter = newUsersByScene.get(projectId);
      if (sceneCounter) {
        sceneCounter.set(sceneId, (sceneCounter.get(sceneId) ?? 0) + 1);
      }
    }
  }

  const rows: ProjectUserAcquisitionRow[] = [];

  for (const project of data.projects) {
    const activeUsers = activeUsersByProject.get(project.projectId)?.size ?? 0;
    const newUsers = newUsersByProject.get(project.projectId) ?? 0;
    if (activeUsers === 0 && newUsers === 0) continue;

    const sceneCounter = newUsersByScene.get(project.projectId) ?? new Map();
    let topSceneId: number | null = null;
    let topSceneCount = 0;
    for (const [sceneId, count] of sceneCounter.entries()) {
      if (count > topSceneCount) {
        topSceneId = sceneId;
        topSceneCount = count;
      }
    }

    rows.push({
      projectId: project.projectId,
      name: project.name,
      newUsers,
      activeUsers,
      topSceneName:
        topSceneId !== null
          ? sceneNameById.get(topSceneId) ?? `Scene ${topSceneId}`
          : null,
      topSceneNewUsers: topSceneCount,
    });
  }

  rows.sort((a, b) => {
    if (b.newUsers !== a.newUsers) return b.newUsers - a.newUsers;
    return b.activeUsers - a.activeUsers;
  });

  return rows;
}

export function computeSceneUserStats(
  data: DashboardData,
  start: Date,
  end: Date
): SceneUserStatRow[] {
  if (data.projects.length === 0 || data.clicks.length === 0) return [];

  const startAt = startOfDay(start);
  const endAt = endOfDay(end);
  if (startAt > endAt) return [];

  const arObjectById = new Map<number, (typeof data.arObjects)[number]>();
  for (const obj of data.arObjects) {
    arObjectById.set(obj.id, obj);
  }

  if (arObjectById.size === 0) return [];

  const sceneInfo = buildSceneInfo(data.projects, data.arObjects);

  const sceneActiveUsers = new Map<number, Set<string>>();
  const sceneNewUsers = new Map<number, Set<string>>();

  const sortedClicks = [...data.clicks]
    .filter((click) => Boolean(click.codeName))
    .sort((a, b) => a.time.getTime() - b.time.getTime());

  const firstClickByUser = new Map<
    string,
    { time: Date; sceneId: number | null }
  >();

  for (const click of sortedClicks) {
    const userId = click.codeName!.trim();
    if (!userId) continue;
    const obj = arObjectById.get(click.objId);
    const sceneId = obj?.sceneId ?? null;
    if (sceneId === null) continue;

    const existing = firstClickByUser.get(userId);
    if (!existing || click.time < existing.time) {
      firstClickByUser.set(userId, { time: click.time, sceneId });
    }

    if (click.time < startAt || click.time > endAt) continue;
    if (!sceneActiveUsers.has(sceneId)) sceneActiveUsers.set(sceneId, new Set());
    sceneActiveUsers.get(sceneId)!.add(userId);
  }

  for (const [userId, info] of firstClickByUser.entries()) {
    const { time, sceneId } = info;
    if (sceneId === null) continue;
    if (time < startAt || time > endAt) continue;
    if (!sceneNewUsers.has(sceneId)) sceneNewUsers.set(sceneId, new Set());
    sceneNewUsers.get(sceneId)!.add(userId);
  }

  const rows: SceneUserStatRow[] = [];

  const sceneIds = new Set([
    ...sceneActiveUsers.keys(),
    ...sceneNewUsers.keys(),
  ]);

  for (const sceneId of sceneIds) {
    const activeUsers = sceneActiveUsers.get(sceneId)?.size ?? 0;
    const newUsers = sceneNewUsers.get(sceneId)?.size ?? 0;
    if (activeUsers === 0 && newUsers === 0) continue;

    const info = sceneInfo.get(sceneId);
    const sceneName =
      info?.name ?? `Scene ${sceneId.toLocaleString(undefined)}`;
    const projectNames = info
      ? Array.from(info.projectNames).sort((a, b) =>
          a.localeCompare(b, undefined, { sensitivity: "base" })
        )
      : [];

    rows.push({
      sceneId,
      sceneName,
      newUsers,
      activeUsers,
      projectNames,
    });
  }

  rows.sort((a, b) => {
    if (b.newUsers !== a.newUsers) return b.newUsers - a.newUsers;
    return b.activeUsers - a.activeUsers;
  });

  return rows;
}

export function buildProjectScanIndex(data: DashboardData): {
  projectScans: Record<number, ScanRecord[]>;
  orphanScans: ScanRecord[];
} {
  const projectScans: Record<number, ScanRecord[]> = {};
  const orphanScans: ScanRecord[] = [];

  for (const project of data.projects) {
    projectScans[project.projectId] = [];
  }

  for (const scan of data.scans) {
    const projectIds = data.lightToProjectIds[scan.ligId];
    if (!projectIds || projectIds.length === 0) {
      orphanScans.push(scan);
      continue;
    }

    for (const projectId of projectIds) {
      if (!projectScans[projectId]) {
        projectScans[projectId] = [];
      }
      projectScans[projectId].push(scan);
    }
  }

  return { projectScans, orphanScans };
}

function buildSceneProjectIndex(projects: Project[]): Map<number, number[]> {
  const map = new Map<number, number[]>();
  for (const project of projects) {
    for (const sceneRaw of project.scenes) {
      const sceneId = extractSceneId(sceneRaw);
      if (sceneId === null) continue;
      if (!map.has(sceneId)) {
        map.set(sceneId, []);
      }
      const list = map.get(sceneId)!;
      if (!list.includes(project.projectId)) {
        list.push(project.projectId);
      }
    }
  }
  return map;
}

function extractSceneId(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = value.trim().match(/^(\d+)/);
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isFinite(id) ? id : null;
}

function extractSceneName(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  const index = trimmed.indexOf("-");
  if (index === -1 || index === trimmed.length - 1) return null;
  return trimmed.slice(index + 1).trim();
}

function buildSceneInfo(
  projects: Project[],
  arObjects: DashboardData["arObjects"]
): Map<number, { name: string | null; projectNames: Set<string> }> {
  const map = new Map<number, { name: string | null; projectNames: Set<string> }>();

  for (const project of projects) {
    for (const sceneRaw of project.scenes) {
      const sceneId = extractSceneId(sceneRaw);
      if (sceneId === null) continue;
      if (!map.has(sceneId)) {
        map.set(sceneId, { name: extractSceneName(sceneRaw), projectNames: new Set() });
      }
      map.get(sceneId)!.projectNames.add(project.name);
    }
  }

  for (const obj of arObjects) {
    if (obj.sceneId === null) continue;
    if (!map.has(obj.sceneId)) {
      map.set(obj.sceneId, { name: obj.sceneName ?? null, projectNames: new Set() });
    } else if (obj.sceneName) {
      const info = map.get(obj.sceneId)!;
      if (!info.name) info.name = obj.sceneName;
    }
  }

  return map;
}

function countScans(scans: ScanRecord[], start: Date, end: Date): number {
  let count = 0;
  for (const scan of scans) {
    if (scan.time >= start && scan.time <= end) {
      count += 1;
    }
  }
  return count;
}

function createBoundaries(referenceDate: Date) {
  const todayStart = startOfDay(referenceDate);
  const todayEnd = endOfDay(referenceDate);
  const yesterdayStart = startOfDay(subDays(referenceDate, 1));
  const yesterdayEnd = endOfDay(subDays(referenceDate, 1));

  const thisWeekStart = startOfWeek(referenceDate, { weekStartsOn: 1 });
  const thisWeekEnd = endOfWeek(referenceDate, { weekStartsOn: 1 });
  const lastWeekStart = startOfWeek(subDays(thisWeekStart, 1), { weekStartsOn: 1 });
  const lastWeekEnd = endOfWeek(subDays(thisWeekStart, 1), { weekStartsOn: 1 });

  const thisMonthStart = startOfMonth(referenceDate);
  const thisMonthEnd = endOfMonth(referenceDate);
  const lastMonthRef = subMonths(referenceDate, 1);
  const lastMonthStart = startOfMonth(lastMonthRef);
  const lastMonthEnd = endOfMonth(lastMonthRef);

  return {
    today: { start: todayStart, end: todayEnd },
    yesterday: { start: yesterdayStart, end: yesterdayEnd },
    thisWeek: { start: thisWeekStart, end: thisWeekEnd },
    lastWeek: { start: lastWeekStart, end: lastWeekEnd },
    thisMonth: { start: thisMonthStart, end: thisMonthEnd },
    lastMonth: { start: lastMonthStart, end: lastMonthEnd },
  };
}
