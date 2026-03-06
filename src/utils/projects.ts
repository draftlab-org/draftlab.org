import { getCollection } from 'astro:content';
import { isVisible } from '@utils/content';

export async function getProjects() {
  const entries = await getCollection('projects');
  return entries
    .filter((entry) => isVisible(entry))
    .sort((a, b) => (a.data.order ?? 999) - (b.data.order ?? 999));
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
