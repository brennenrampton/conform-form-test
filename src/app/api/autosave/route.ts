import { NextResponse } from 'next/server';

import { autosavePayloadSchema, normalizeFormValues } from '@/lib/schema';
import { getLatestDraft, saveDraft } from '@/lib/storage';

export async function GET(): Promise<NextResponse> {
  const draft = await getLatestDraft();

  return NextResponse.json({
    ok: true,
    draft,
  });
}

export async function POST(request: Request): Promise<NextResponse> {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: 'Invalid JSON payload',
      },
      { status: 400 },
    );
  }

  const parsed = autosavePayloadSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: 'Invalid autosave payload',
      },
      { status: 400 },
    );
  }

  const values = normalizeFormValues(parsed.data);
  const savedDraft = await saveDraft(values);

  return NextResponse.json({
    ok: true,
    savedAt: savedDraft.savedAt,
  });
}
