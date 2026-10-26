import { NextResponse } from 'next/server';
import { upsertOccurrence } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const data = await req.json();
    const item = await upsertOccurrence(data);
    return NextResponse.json({ item });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
