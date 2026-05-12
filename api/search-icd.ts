// api/search-icd.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

const CLIENT_ID =
  process.env.ICD11_CLIENT_ID ||
  'c6716c8b-4908-4b3f-b1fb-1ffded904ad7_0a9197c2-25f7-4e87-bd82-533071573c03';
const CLIENT_SECRET =
  process.env.ICD11_CLIENT_SECRET ||
  'bzPTUvmQ1d0L7oz9RWijPehsw9VjbQE0nkMu0HM4BsM=';

const TOKEN_URL = 'https://icdaccessmanagement.who.int/connect/token';
const ICD_SEARCH_URL = 'https://id.who.int/icd/release/11/2024-01/mms/search';

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.value;
  }

  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    scope: 'icdapi_access',
    grant_type: 'client_credentials',
  });

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`ICD-11 token request failed: ${response.status} - ${err}`);
  }

  const data = await response.json();
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000, // 60s safety margin
  };

  return cachedToken.value;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { q } = req.query;
  if (!q || typeof q !== 'string' || q.trim() === '') {
    return res.status(400).json({ error: 'Missing query parameter "q"' });
  }

  try {
    const token = await getAccessToken();

    const searchUrl = `${ICD_SEARCH_URL}?q=${encodeURIComponent(q)}&releaseId=2024-01&linearizationname=mms`;

    const searchResponse = await fetch(searchUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Accept-Language': 'en',
        'API-Version': 'v2',
      },
    });

    if (!searchResponse.ok) {
      const err = await searchResponse.text();
      throw new Error(`ICD-11 search failed: ${searchResponse.status} - ${err}`);
    }

    const data = await searchResponse.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('ICD-11 API error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}