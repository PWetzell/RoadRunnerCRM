/**
 * GET /api/public-sources/search-people?q=...&email=...
 */

import { NextResponse } from 'next/server';
import { searchPeople } from '@/lib/data/public-sources';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || '';
  const email = searchParams.get('email') || undefined;
  if (!q.trim() && !email) return NextResponse.json({ results: [] });
  try {
    const results = await searchPeople(q, email);
    return NextResponse.json({ results });
  } catch (err) {
    return NextResponse.json({ results: [], error: (err as Error).message }, { status: 500 });
  }
}
