import { getCollection } from 'astro:content';
import { isVisible } from '@utils/content';

export async function getOrganisations() {
  const entries = await getCollection('organisations');
  return entries
    .filter((entry) => isVisible(entry))
    .sort((a, b) => a.data.name.localeCompare(b.data.name));
}

export async function getOrganisationsByType(type: 'client' | 'partner' | 'funder') {
  const orgs = await getOrganisations();
  return orgs.filter((o) => o.data.type === type);
}
