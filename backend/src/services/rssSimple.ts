/**
 * Parseur RSS 2.0 minimal (sans dépendance npm) pour Indeed et flux similaires.
 */
export interface RssItem {
  title: string;
  link: string;
  description: string;
  pubDate: string | null;
}

function decodeEntities(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
}

function extractTag(block: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const m = block.match(re);
  return m ? stripTags(m[1]) : '';
}

export function parseRssXml(xml: string): RssItem[] {
  const items: RssItem[] = [];
  const re = /<item[\s\S]*?<\/item>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const block = m[0];
    const title = extractTag(block, 'title');
    const link = extractTag(block, 'link');
    const description = extractTag(block, 'description') || extractTag(block, 'content:encoded');
    const pubRaw = extractTag(block, 'pubDate');
    let pubDate: string | null = null;
    if (pubRaw) {
      const d = new Date(pubRaw);
      pubDate = Number.isNaN(d.getTime()) ? null : d.toISOString();
    }
    if (title && link) {
      items.push({ title, link, description: description || '', pubDate });
    }
  }
  return items;
}
