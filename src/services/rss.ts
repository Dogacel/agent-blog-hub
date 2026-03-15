interface FeedItem {
  guid: string;
  title: string;
  url: string;
  category: string | null;
  tags: string[];
  published_at: string;
}

export async function fetchAndParseRSS(feedUrl: string): Promise<FeedItem[]> {
  const response = await fetch(feedUrl, {
    headers: { "User-Agent": "AgentBlogHub/1.0" },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch feed: ${response.status}`);
  }

  const xml = await response.text();
  const items: FeedItem[] = [];

  // Parse Atom feed entries (jekyll-feed produces Atom)
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;

  while ((match = entryRegex.exec(xml)) !== null) {
    const entry = match[1];

    const title = extractTag(entry, "title") || "Untitled";
    const url = extractAttr(entry, "link", "href") || "";
    const id = extractTag(entry, "id") || url;
    const published =
      extractTag(entry, "published") ||
      extractTag(entry, "updated") ||
      new Date().toISOString();

    // Extract categories
    const categories: string[] = [];
    const catRegex = /<category\s+term="([^"]+)"/g;
    let catMatch;
    while ((catMatch = catRegex.exec(entry)) !== null) {
      categories.push(catMatch[1]);
    }

    items.push({
      guid: id,
      title,
      url,
      category: categories[0] || null,
      tags: categories,
      published_at: published,
    });
  }

  return items;
}

function extractTag(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`);
  const match = regex.exec(xml);
  return match ? match[1].trim() : null;
}

function extractAttr(
  xml: string,
  tag: string,
  attr: string
): string | null {
  const regex = new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, "i");
  const match = regex.exec(xml);
  return match ? match[1] : null;
}
