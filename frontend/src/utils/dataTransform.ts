import type { DashboardData } from "../types";

export function scopeDashboardData(
  data: DashboardData,
  projectIds: Set<number>
): DashboardData {
  const scopedProjects = data.projects.filter((project) =>
    projectIds.has(project.projectId)
  );

  const scopedProjectById = scopedProjects.reduce<
    Record<number, (typeof scopedProjects)[number]>
  >((acc, project) => {
    acc[project.projectId] = project;
    return acc;
  }, {});

  const scopedLightToProjectIds: Record<number, number[]> = {};
  for (const [lightIdRaw, ids] of Object.entries(data.lightToProjectIds)) {
    const lightId = Number(lightIdRaw);
    const matches = ids.filter((id) => projectIds.has(id));
    if (matches.length > 0) {
      scopedLightToProjectIds[lightId] = matches;
    }
  }

  const scopedScans = data.scans.filter((scan) => {
    const mapped = scopedLightToProjectIds[scan.ligId];
    return mapped && mapped.length > 0;
  });

  return {
    ...data,
    projects: scopedProjects,
    projectById: scopedProjectById,
    lightToProjectIds: scopedLightToProjectIds,
    scans: scopedScans,
  };
}
