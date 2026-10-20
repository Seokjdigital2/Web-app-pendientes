import { NextResponse } from 'next/server';
import { listItems, createItem } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const items = await listItems();
    return NextResponse.json({ items });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const data = await req.json();
    const item = await createItem(data);
    return NextResponse.json({ item });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
