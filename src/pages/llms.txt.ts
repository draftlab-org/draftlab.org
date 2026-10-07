/**
 * /llms.txt — a plain-text summary of Draftlab for LLM crawlers and answer
 * engines (https://llmstxt.org). Generated from the content collections so it
 * never drifts from the site.
 */
import { getCollection, getEntry } from 'astro:content';
import type { APIContext } from 'astro';
import { isVisible } from '@utils/content';
import { getProjects } from '@utils/projects';

const PHASE_ORDER = ['understand', 'define', 'deliver', 'sustain'];

const oneLine = (s = '') => s.replace(/\s+/g, ' ').trim();
const stripMd = (s = '') =>
  oneLine(s.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*_`#>]/g, ''));
const year = (d?: string) => (d ? d.slice(0, 4) : undefined);

export async function GET({ site }: APIContext) {
  const base = site ?? new URL('https://draftlab.org');
  const abs = (p: string) => new URL(p, base).href;

  const [config, about, phases, modalities, skills, people, projects, orgs] =
    await Promise.all([
      getEntry('site', 'config'),
      getEntry('pages', 'about'),
      getCollection('phases'),
      getCollection('modalities'),
      getCollection('skills'),
      getCollection('people'),
      getProjects(),
      getCollection('organisations'),
    ]);
  if (!config) throw new Error('Site configuration not found');
  const c = config.data;
  const orgById = new Map(orgs.map((o) => [o.data.id, o.data]));

  const phaseLines = phases
    .filter((p) => isVisible(p))
    .sort((a, b) => PHASE_ORDER.indexOf(a.data.slug) - PHASE_ORDER.indexOf(b.data.slug))
    .map(
      (p) =>
        `- ${p.data.name} (${p.data.tagline}): ${stripMd(p.data.description)}`
    );

  const modalityLines = modalities
    .filter((m) => isVisible(m))
    .sort((a, b) => a.data.order - b.data.order)
    .map(
      (m) =>
        `- ${m.data.symbol} ${m.data.name} — ${m.data.tagline} ${stripMd(m.data.description)}`
    );

  const skillLines = skills
    .filter((s) => isVisible(s))
    .map((s) => s.data)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((s) => `- ${s.name}: ${oneLine(s.description)}`);

  const peopleLines = people
    .filter((p) => isVisible(p))
    .map((p) => p.data)
    .map((p) => {
      const role = [p.title, p.role].filter(Boolean).join(', ');
      return `- [${p.name}](${abs(`/people/${p.id}`)})${role ? ` — ${role}` : ''}${p.bio ? `: ${oneLine(p.bio)}` : ''}`;
    });

  const projectLines = projects.map(({ data: p }) => {
    const client = p.client ? orgById.get(p.client)?.name : undefined;
    const partners = (p.partners ?? [])
      .map((id) => orgById.get(id)?.name)
      .filter(Boolean);
    const span = [year(p.dateStart), p.projectStatus === 'active' ? 'ongoing' : year(p.dateEnd)]
      .filter(Boolean)
      .filter((v, i, a) => a.indexOf(v) === i)
      .join('–');
    const meta = [
      client && `for ${client}`,
      partners.length && `with ${partners.join(', ')}`,
      span,
      `phases: ${p.phases.join(', ')}`,
      `modality: ${p.modalities.join(', ')}`,
    ]
      .filter(Boolean)
      .join('; ');
    return `- [${p.name}](${abs(`/projects/${p.slug}`)}): ${oneLine(p.description)} (${meta})`;
  });

  const clients = orgs
    .filter((o) => o.data.type === 'client')
    .map((o) => o.data.name)
    .sort();
  const partners = orgs
    .filter((o) => o.data.type !== 'client')
    .map((o) => o.data.name)
    .sort();

  const social = Object.entries(c.social ?? {})
    .filter(([, url]) => url)
    .map(([k, url]) => `- ${k[0].toUpperCase()}${k.slice(1)}: ${url}`);

  const text = `# ${c.title}

> ${c.description}

${stripMd(about?.data.description ?? '')}

Draftlab is a design and technology studio and a collective of independent
practitioners. It works with civil society organisations, NGOs, humanitarians,
open-source projects and multi-stakeholder initiatives on appropriate technology:
secure where it needs to be, sovereign where it matters, simple where complexity
would be a burden. Part of the work is pro bono, supported by the Open Technology
Fund's UXD Lab. All original site content is CC-BY-SA.

## Key pages

- [Home](${abs('/')})
- [About](${abs('/about')}): approach, framework, skills and people
- [Projects](${abs('/projects')}): filterable list of projects, quotes and notes
- [Get in touch](${abs('/get-in-touch')}): book a 30-minute conversation
- [RSS feed](${abs('/rss.xml')})

## How Draftlab works

Every engagement sits on two axes: the project *phase* (where the client is in
their journey) and the *modality* (how Draftlab shows up). Clients can enter at
any phase, in any modality.

### Phases (timeline)

${phaseLines.join('\n')}

### Modalities (engagement type)

${modalityLines.join('\n')}

## Skills

${skillLines.join('\n')}

## People

${peopleLines.join('\n')}

## Projects

${projectLines.join('\n')}

## Clients and partners

Clients: ${clients.join(', ')}.
Partners and funders: ${partners.join(', ')}.

## Contact

${c.email ? `- Email: ${c.email}\n` : ''}- Book a call: ${abs('/get-in-touch')}
${social.join('\n')}
`;

  return new Response(text, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
