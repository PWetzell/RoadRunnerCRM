/**
 * POST /api/resume/parse
 *
 * Accepts a multipart/form-data upload with a single "file" field (PDF or
 * DOCX). Returns a `ParsedResume` with best-effort extracted fields.
 *
 * Runs server-side only — keeps the binary parsing libs out of the client
 * bundle and protects us from large-file memory pressure.
 */

import { NextResponse } from 'next/server';
import { parseResume } from '@/lib/resume/parser';

export const runtime = 'nodejs';
// Resumes can be up to ~10 MB but we cap at 8 MB to protect the server.
export const maxDuration = 30;

const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(req: Request) {
  // Guard against malformed or missing multipart body — without this, `req.formData()`
  // throws a 500 when the client posts no body at all.
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Expected multipart/form-data with a "file" field' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file uploaded — expected field "file"' }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: 'Uploaded file is empty' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: `File too large (max ${MAX_BYTES / 1024 / 1024} MB)` }, { status: 413 });
  }

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const parsed = await parseResume(buf, file.type, file.name);
    return NextResponse.json({ ...parsed, filename: file.name, size: file.size });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Parse failed';
    // Unsupported file type is a client error, not a server error.
    const status = /unsupported|no text|extract any text/i.test(msg) ? 415 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
