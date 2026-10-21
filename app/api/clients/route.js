import { NextResponse } from 'next/server';
import { listClients, createClientIfMissing } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const clients = await listClients();
    return NextResponse.json({ clients });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { id, name } = await req.json();
    if (!id || !name) return NextResponse.json({ error: 'Faltan id y name' }, { status: 400 });
    const client = await createClientIfMissing(id, name);
    return NextResponse.json({ client });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
