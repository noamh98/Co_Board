const BASE = 'https://api.arasaac.org/v1';

export interface ArasaacSymbol {
  id: number;
  keywords: string[];
}

export async function searchSymbols(
  query: string,
  lang = 'he',
): Promise<ArasaacSymbol[]> {
  if (!query.trim()) return [];
  try {
    const res = await fetch(
      `${BASE}/pictograms/${lang}/search/${encodeURIComponent(query)}`,
    );
    if (!res.ok) return [];
    const data = (await res.json()) as Array<{
      _id: number;
      keywords: Array<{ keyword: string }>;
    }>;
    return data.slice(0, 20).map((item) => ({
      id: item._id,
      keywords: item.keywords.map((k) => k.keyword),
    }));
  } catch {
    return [];
  }
}

export function getImageUrl(id: number): string {
  return `https://static.arasaac.org/pictograms/${id}/${id}_2500.png`;
}
