import rss from '@astrojs/rss';
import { siteConfig } from '@lib/config';
import {
  getArticleExcerpt,
  getArticleUrl,
  getPublishedArticles,
  sortArticlesByDate,
} from '@utils/articles';
import type { APIContext } from 'astro';

/**
 * /rss.xml — visible articles, newest first. Each item carries the article's
 * plain-text excerpt (written, or generated from the body) rather than the
 * rendered body, so the feed needs no markdown pipeline.
 */
export async function GET(context: APIContext) {
  const articles = sortArticlesByDate(await getPublishedArticles());

  return rss({
    title: siteConfig.title,
    description: siteConfig.description,
    site: context.site ?? siteConfig.url,
    items: articles.map((article) => ({
      title: article.data.title,
      link: getArticleUrl(article),
      pubDate: article.data.publishedDate,
      description: getArticleExcerpt(article),
      categories: article.data.categories,
    })),
    customData: '<language>en</language>',
  });
}
