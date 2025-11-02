export interface ZooZoneConfig {
  id: string;
  label: string;
  alias: string;
  ligId: number;
  coordinateSystemId: number;
  coordinateSystemName: string;
  sceneId: number;
  position: {
    top: string;
    left: string;
  };
}

export const ZOO_ZONE_CONFIGS: ZooZoneConfig[] = [
  {
    id: "Zone1",
    label: "第一區",
    alias: "Zone 1",
    ligId: 4952,
    coordinateSystemId: 444,
    coordinateSystemName: "動物園_第一區",
    sceneId: 3919,
    position: { top: "18%", left: "55%" },
  },
  {
    id: "Zone2",
    label: "第二區",
    alias: "Zone 2",
    ligId: 3075,
    coordinateSystemId: 445,
    coordinateSystemName: "動物園-第二區",
    sceneId: 3917,
    position: { top: "33%", left: "28%" },
  },
  {
    id: "Zone3",
    label: "第三區",
    alias: "Zone 3",
    ligId: 3783,
    coordinateSystemId: 446,
    coordinateSystemName: "動物園-第三區",
    sceneId: 3943,
    position: { top: "64%", left: "26%" },
  },
  {
    id: "Zone4",
    label: "第四區",
    alias: "Zone 4",
    ligId: 3514,
    coordinateSystemId: 447,
    coordinateSystemName: "動物園-第四區",
    sceneId: 4010,
    position: { top: "70%", left: "46%" },
  },
  {
    id: "Zone5",
    label: "第五區",
    alias: "Zone 5",
    ligId: 366,
    coordinateSystemId: 448,
    coordinateSystemName: "動物園-第五區",
    sceneId: 4012,
    position: { top: "46%", left: "71%" },
  },
  {
    id: "Zone6",
    label: "第六區",
    alias: "Zone 6",
    ligId: 3417,
    coordinateSystemId: 454,
    coordinateSystemName: "動物園-第六區",
    sceneId: 4018,
    position: { top: "24%", left: "74%" },
  },
];

export const ZOO_LIG_ID_SET = new Set(
  ZOO_ZONE_CONFIGS.map((zone) => zone.ligId)
);

export const ZOO_SCENE_ID_SET = new Set(
  ZOO_ZONE_CONFIGS.map((zone) => zone.sceneId)
);

export const ZOO_COORDINATE_SYSTEM_ID_SET = new Set(
  ZOO_ZONE_CONFIGS.map((zone) => zone.coordinateSystemId)
);

export const ZOO_ZONE_BY_ID = new Map(
  ZOO_ZONE_CONFIGS.map((zone) => [zone.id, zone])
);

export const ZOO_ZONE_BY_LIG_ID = new Map(
  ZOO_ZONE_CONFIGS.map((zone) => [zone.ligId, zone])
);

export const ZOO_ZONE_BY_SCENE_ID = new Map(
  ZOO_ZONE_CONFIGS.map((zone) => [zone.sceneId, zone])
);

export const ZOO_ZONE_BY_COORDINATE_SYSTEM_ID = new Map(
  ZOO_ZONE_CONFIGS.map((zone) => [zone.coordinateSystemId, zone])
);

export function isZooLigId(ligId: number): boolean {
  return ZOO_LIG_ID_SET.has(ligId);
}

export function isZooSceneId(sceneId: number | null | undefined): boolean {
  if (sceneId === null || sceneId === undefined) return false;
  return ZOO_SCENE_ID_SET.has(sceneId);
}

export function isZooCoordinateSystemId(
  coordinateSystemId: number | null | undefined
): boolean {
  if (coordinateSystemId === null || coordinateSystemId === undefined) return false;
  return ZOO_COORDINATE_SYSTEM_ID_SET.has(coordinateSystemId);
}

