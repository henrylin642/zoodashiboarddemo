import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  fetchCsv,
  parseBoolean,
  parseDate,
  parseJsonArray,
  parseLatLon,
  parseNumber,
} from "../utils/csv";
import { fetchArObjectsWithMeta } from "../services/ligApi";
import type {
  ArObjectRecord,
  ClickRecord,
  CoordinateSystemRecord,
  DashboardData,
  DashboardDataState,
  LightRecord,
  Project,
  ScanCoordinateRecord,
  ScanRecord,
} from "../types";
import {
  isZooCoordinateSystemId,
  isZooLigId,
  isZooSceneId,
} from "../constants/zoo";

const DashboardDataContext = createContext<DashboardDataState>({
  status: "loading",
});

export function useDashboardData(): DashboardDataState {
  return useContext(DashboardDataContext);
}

export function DashboardDataProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [state, setState] = useState<DashboardDataState>({ status: "loading" });
  const [ligToken, setLigToken] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem("lig_token") ?? "";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (event: StorageEvent) => {
      if (event.key === "lig_token") {
        setLigToken(event.newValue ?? "");
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        setState({ status: "loading" });
        const [
          projectList,
          scanList,
          lightList,
          coordinateSystemList,
          clickList,
          arObjectList,
          scanCoordinateList,
        ] = await Promise.all([
          loadProjects(),
          loadScans(),
          loadLights(),
          loadCoordinateSystems(),
          loadClicks(),
          loadArObjects(ligToken || undefined),
          loadScanCoordinates(),
        ]);

        if (!isMounted) return;

        const lights = lightList.filter((light) => isZooLigId(light.ligId));
        const coordinateSystems = coordinateSystemList.filter((cs) =>
          isZooCoordinateSystemId(cs.id)
        );
        const scans = scanList.filter((scan) => isZooLigId(scan.ligId));
        const scanCoordinates = scanCoordinateList.filter((item) =>
          isZooLigId(item.lightId)
        );
        const arObjects = arObjectList.filter((item) =>
          isZooSceneId(item.sceneId)
        );
        const allowedObjectIds = new Set(arObjects.map((item) => item.id));
        const clicks = clickList.filter((click) =>
          allowedObjectIds.has(click.objId)
        );
        const projects = projectList
          .filter((project) => project.lightIds.some((id) => isZooLigId(id)))
          .map((project) => ({
            ...project,
            lightIds: project.lightIds.filter((id) => isZooLigId(id)),
          }));

        const projectById: Record<number, Project> = {};
        const lightToProjectIds: Record<number, number[]> = {};

        for (const project of projects) {
          projectById[project.projectId] = project;
          for (const lightId of project.lightIds) {
            if (!lightToProjectIds[lightId]) {
              lightToProjectIds[lightId] = [];
            }
            lightToProjectIds[lightId].push(project.projectId);
          }
        }

        const firstClickByUser = buildFirstClickByUser(clicks);

        const data: DashboardData = {
          projects,
          scans,
          lights,
          coordinateSystems,
          clicks,
          arObjects,
          scanCoordinates,
          projectById,
          lightToProjectIds,
          firstClickByUser,
        };

        setState({ status: "ready", data });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unknown data loading error";
        if (isMounted) {
          setState({ status: "error", error: message });
        }
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [ligToken]);

  const value = useMemo(() => state, [state]);

  return (
    <DashboardDataContext.Provider value={value}>
      {children}
    </DashboardDataContext.Provider>
  );
}

async function loadProjects(): Promise<Project[]> {
  const rows = await fetchCsv<Project>("/data/projects.csv", (row) => {
    const projectId = parseNumber(row["ProjectID"]);
    if (projectId === null) return null;

    const lightIds = parseJsonArray(row["Light ID"])
      .map((item) => parseNumber(item))
      .filter((val): val is number => val !== null);

    return {
      projectId,
      name: row["Project Name"]?.trim() ?? `Project ${projectId}`,
      startDate: parseDate(row["Start Date"]),
      endDate: parseDate(row["End Date"]),
      coordinates: parseJsonArray(row["Coordinates"]),
      lightIds,
      scenes: parseJsonArray(row["Scenes"]),
      isActive: parseBoolean(row["Is Active"]),
      latLon: parseLatLon(row["Latitude and Longitude"]),
      ownerEmails: parseJsonArray(row["Owner Email"]).sort(),
    };
  });
  return rows;
}

async function loadScans(): Promise<ScanRecord[]> {
  const transform = (row: Record<string, string>): ScanRecord | null => {
    const ligId = parseNumber(row["ligtag_id"]);
    if (ligId === null) return null;
    const time = parseDate(row["time"]);
    if (!time) return null;
    return {
      time,
      ligId,
      clientId: row["client_id"]?.trim() ?? "",
      coordinateSystemId: parseNumber(row["coordinate_system_id"]),
    };
  };

  try {
    return await fetchCsv<ScanRecord>("/data/scandata.csv", transform);
  } catch {
    return fetchCsv<ScanRecord>("/data/scans.csv", transform);
  }
}

async function loadLights(): Promise<LightRecord[]> {
  return fetchCsv<LightRecord>("/data/lights.csv", (row) => {
    const ligId = parseNumber(row["Id"]);
    if (ligId === null) return null;
    return {
      ligId,
      latitude: parseNumber(row["Latitude"]),
      longitude: parseNumber(row["Longitude"]),
      fieldId: parseNumber(row["Group"]),
      coordinateSystemId: parseNumber(row["Id [Coordinate systems]"]),
      coordinateSystemName: row["Name [Coordinate systems]"]?.trim() ?? null,
      updatedAt: parseDate(row["Updated at"]),
    };
  });
}

async function loadCoordinateSystems(): Promise<CoordinateSystemRecord[]> {
  return fetchCsv<CoordinateSystemRecord>(
    "/data/coordinate_systems.csv",
    (row) => {
      const id = parseNumber(row["Id"]);
      if (id === null) return null;
      return {
        id,
        name: row["Name"]?.trim() ?? "",
        sceneId: parseNumber(row["Id [Scenes]"]),
        sceneName: row["Name [Scenes]"]?.trim() ?? null,
        createdAt: parseDate(row["Created at"]),
        updatedAt: parseDate(row["Updated at"]),
      };
    }
  );
}

async function loadClicks(): Promise<ClickRecord[]> {
  const transform = (row: Record<string, string>): ClickRecord | null => {
    const objId = parseNumber(row["obj_id"]);
    const time = parseDate(row["time"]);
    if (objId === null || !time) return null;
    return {
      objId,
      time,
      codeName: row["code_name"]?.trim() ?? "",
    };
  };

  try {
    return await fetchCsv<ClickRecord>("/data/obj_click_log.csv", transform);
  } catch {
    return fetchCsv<ClickRecord>("/data/clicks.csv", transform);
  }
}

function buildFirstClickByUser(clicks: ClickRecord[]): Record<string, Date> {
  const result: Record<string, Date> = {};
  for (const click of clicks) {
    const userId = click.codeName;
    if (!userId) continue;
    const existing = result[userId];
    if (!existing || click.time < existing) {
      result[userId] = click.time;
    }
  }
  return result;
}

async function loadArObjects(token?: string): Promise<ArObjectRecord[]> {
  if (token) {
    try {
      const list = await fetchArObjectsWithMeta(token);
      if (list.length > 0) {
        return list.map((item) => {
          const idNum = Number(item.id);
          if (!Number.isFinite(idNum)) return null;
          return {
            id: idNum,
            name: item.name,
            sceneId: item.sceneId,
            sceneName: item.sceneName,
            locationX: item.location?.x ?? null,
            locationY: item.location?.y ?? null,
            locationZ: item.location?.z ?? null,
          } as ArObjectRecord;
        }).filter(Boolean) as ArObjectRecord[];
      }
    } catch (error) {
      console.warn("[DashboardData] 無法從 API 載入 AR objects，改用備援資料。", error);
    }
  }

  return fetchCsv<ArObjectRecord>("/data/ar_object_2025-10-21_11h55m15.csv", (row) => {
    const id = parseNumber(row["Id"]);
    if (id === null) return null;
    const { locationX, locationY, locationZ } = parseLocation(row["Location"]);
    return {
      id,
      name: row["Name"]?.trim() ?? "",
      sceneId: parseNumber(row["Id [Scene]"]),
      sceneName: row["Name [Scene]"]?.trim() ?? null,
      locationX,
      locationY,
      locationZ,
    };
  });
}

async function loadScanCoordinates(): Promise<ScanCoordinateRecord[]> {
  return fetchCsv<ScanCoordinateRecord>("/data/scan_coordinate.csv", (row) => {
    const id = parseNumber(row["Id"]);
    if (id === null) return null;
    const lightId = parseNumber(row["Light ID"]);
    if (lightId === null) return null;
    return {
      id,
      lightId,
      locationX: parseNumber(row["Location X"]),
      locationZ: parseNumber(row["Location Z"]),
      createdAt: parseDate(row["Created at"]),
    };
  });
}

function parseLocation(value: string | undefined): {
  locationX: number | null;
  locationY: number | null;
  locationZ: number | null;
} {
  if (!value) {
    return { locationX: null, locationY: null, locationZ: null };
  }

  const match = value
    .replace(/""/g, '"')
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .reduce<Record<string, number>>((acc, line) => {
      const [key, rawVal] = line.split(":").map((part) => part.trim());
      if (!key || rawVal === undefined) return acc;
      const parsedVal = parseNumber(rawVal.replace(/"/g, ""));
      if (parsedVal !== null) {
        acc[key.toLowerCase()] = parsedVal;
      }
      return acc;
    }, {});

  return {
    locationX: match["x"] ?? null,
    locationY: match["y"] ?? null,
    locationZ: match["z"] ?? null,
  };
}
