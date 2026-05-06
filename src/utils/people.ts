import type { CollectionEntry } from 'astro:content';
import { getVisibleEntries } from '@utils/content';

export type Person = CollectionEntry<'people'>['data'];

export interface PersonData {
  id: string;
  name: string;
  title?: string;
  headshot?: any;
  [key: string]: any;
}

/**
 * Get all visible people from the collection
 */
export async function getAllPeople(): Promise<Person[]> {
  const entries = await getVisibleEntries('people');
  return entries.map((entry) => entry.data);
}

/**
 * Creates a map of people by ID for quick lookups
 */
export async function getPeopleMap(): Promise<Map<string, PersonData>> {
  const entries = await getVisibleEntries('people');
  return new Map(
    entries.map((person) => [person.data.id, person.data as PersonData])
  );
}

/**
 * Resolves person IDs to person names
 */
export async function getPersonNames(
  personIds: string[] | undefined,
  peopleMap?: Map<string, PersonData>
): Promise<string> {
  if (!personIds || personIds.length === 0) return '';
  const map = peopleMap ?? (await getPeopleMap());
  return personIds
    .map((id) => map.get(id)?.name)
    .filter(Boolean)
    .join(', ');
}

/**
 * Resolves person IDs to full person data
 */
export async function resolvePeople(
  personIds: string[] | undefined,
  peopleMap?: Map<string, PersonData>
): Promise<PersonData[]> {
  if (!personIds || personIds.length === 0) return [];
  const map = peopleMap ?? (await getPeopleMap());
  return personIds
    .map((id) => map.get(id))
    .filter((person): person is PersonData => person !== undefined);
}

/**
 * Get the URL for a person's profile
 */
export function getPersonUrl(person: Person): string {
  return `/people/${person.id}`;
}
