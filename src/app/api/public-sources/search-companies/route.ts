/**
 * GET /api/public-sources/search-companies?q=...
 *
 * Server-side aggregator endpoint. Keeps API keys out of the client bundle
 * and sidesteps CORS restrictions on public data providers.
 */

import { NextResponse } from 'next/server';
import { searchCompanies } from '@/lib/data/public-sources';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || '';
  if (!q.trim()) return NextResponse.json({ results: [] });
  try {
    const results = await searchCompanies(q);
    return NextResponse.json({ results });
  } catch (err) {
    return NextResponse.json({ results: [], error: (err as Error).message }, { status: 500 });
  }
}
