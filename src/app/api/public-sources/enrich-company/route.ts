/**
 * GET /api/public-sources/enrich-company?domain=...
 * or
 * GET /api/public-sources/enrich-company?name=...
 */

import { NextResponse } from 'next/server';
import { enrichCompany } from '@/lib/data/public-sources';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const domain = searchParams.get('domain');
  const name = searchParams.get('name');
  const input = (domain || name || '').trim();
  if (!input) return NextResponse.json({ candidates: [], employees: [] });
  try {
    const result = await enrichCompany(input);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ candidates: [], employees: [], error: (err as Error).message }, { status: 500 });
  }
}
