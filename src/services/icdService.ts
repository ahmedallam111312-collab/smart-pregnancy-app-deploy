// src/services/icdService.ts

export interface IcdCode {
  code: string;
  title: string;
}

/**
 * Strips HTML tags from a string returned by the ICD-11 API.
 */
const stripHtml = (html: string): string =>
  html.replace(/<[^>]*>/g, '').trim();

/**
 * Queries the /api/search-icd serverless function and returns
 * the top 3 matching ICD-11 codes with clean titles.
 */
export const searchIcd11 = async (query: string): Promise<IcdCode[]> => {
  if (!query.trim()) return [];

  const response = await fetch(
    `/api/search-icd?q=${encodeURIComponent(query)}`
  );

  if (!response.ok) {
    console.error('ICD-11 search error:', response.status, response.statusText);
    return [];
  }

  const data = await response.json();

  const entities: any[] = data?.destinationEntities ?? [];

  return entities.slice(0, 3).map((entity) => ({
    code: entity.theCode ?? entity.id ?? 'N/A',
    title: stripHtml(entity.title ?? entity.titleEn ?? ''),
  }));
};