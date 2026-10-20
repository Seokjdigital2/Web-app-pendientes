import { NextResponse } from 'next/server';
import { listClients } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const clients = await listClients();
    return NextResponse.json({ clients });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
