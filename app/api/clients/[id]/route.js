import { NextResponse } from 'next/server';
import { updateClient } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function PATCH(req, { params }) {
  try {
    const { id } = await params;
    const patch = await req.json();
    const client = await updateClient(id, patch);
    return NextResponse.json({ client });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
