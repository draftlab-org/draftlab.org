import { getCollection } from 'astro:content';
import { isVisible } from '@utils/content';

export async function getProjects() {
  const entries = await getCollection('projects');
  return entries.filter((entry) => isVisible(entry)).sort((a, b) => {
    const aActive = a.data.projectStatus === 'active' ? 0 : 1;
    const bActive = b.data.projectStatus === 'active' ? 0 : 1;
    if (aActive !== bActive) return aActive - bActive;

    const aEnd = a.data.dateEnd ? Date.parse(a.data.dateEnd) : -Infinity;
    const bEnd = b.data.dateEnd ? Date.parse(b.data.dateEnd) : -Infinity;
    if (aEnd !== bEnd) return bEnd - aEnd;

    const aStart = a.data.dateStart ? Date.parse(a.data.dateStart) : -Infinity;
    const bStart = b.data.dateStart ? Date.parse(b.data.dateStart) : -Infinity;
    if (aStart !== bStart) return bStart - aStart;

    return a.data.name.localeCompare(b.data.name);
  });
}

export async function getFeaturedProjects() {
  const projects = await getProjects();
  return projects.filter((p) => p.data.featured);
}

export async function getProjectsByPhase(phase: string) {
  const projects = await getProjects();
  return projects.filter((p) => p.data.phases.includes(phase as any));
}

export async function getProjectsByModality(modality: string) {
  const projects = await getProjects();
  return projects.filter((p) => p.data.modalities.includes(modality as any));
}

export async function getProjectsForCell(phase: string, modality: string) {
  const projects = await getProjects();
  return projects.filter(
    (p) =>
      p.data.phases.includes(phase as any) &&
      p.data.modalities.includes(modality as any)
  );
}
