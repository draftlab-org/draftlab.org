import { getCollection } from 'astro:content';

export type SkillData = {
  name: string;
  slug: string;
  description: string;
  icon: string;
  status?: 'draft' | 'published' | 'archived';
};

let skillsPromise: Promise<Map<string, SkillData>> | null = null;

function loadSkillsMap() {
  if (!skillsPromise) {
    skillsPromise = getCollection('skills').then(
      (entries) => new Map(entries.map((e) => [e.data.slug, e.data as SkillData]))
    );
  }
  return skillsPromise;
}

export async function getSkillBySlug(slug: string): Promise<SkillData | undefined> {
  const map = await loadSkillsMap();
  return map.get(slug);
}
