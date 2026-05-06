import rss from '@astrojs/rss';
import { getEntry } from 'astro:content';
import type { APIContext } from 'astro';
import { marked } from 'marked';
import { getOrganisations } from '@utils/organisations';
import { getProjects } from '@utils/projects';

const firstParagraph = (md: string) =>
  md.split(/\n{2,}/, 1)[0]?.trim() ?? md;

export async function GET(context: APIContext) {
  const [siteEntry, projects, organisations] = await Promise.all([
    getEntry('site', 'config'),
    getProjects(),
    getOrganisations(),
  ]);

  if (!siteEntry) throw new Error('Site configuration not found');
  const orgById = new Map(organisations.map((o) => [o.data.id, o.data]));

  const items = projects
    .flatMap((project) => {
      const clientName = project.data.client
        ? orgById.get(project.data.client)?.name
        : undefined;
      return (project.data.updates ?? []).map((u) => {
        const projectTitle = clientName
          ? `${project.data.name} (with ${clientName})`
          : project.data.name;
        const title = u.title
          ? `${projectTitle}: ${u.title}`
          : `${projectTitle} — update`;
        const body = u.body ? `${u.update}\n\n${u.body}` : u.update;
        return {
          title,
          description: firstParagraph(u.update),
          link: `/projects/${project.data.slug}/`,
          pubDate: new Date(u.date),
          content: marked.parse(body, { async: false }) as string,
        };
      });
    })
    .sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());

  return rss({
    title: siteEntry.data.title,
    description: siteEntry.data.description,
    site: context.site!,
    items,
    customData: `<language>en-us</language>`,
  });
}
