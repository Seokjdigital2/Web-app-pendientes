import { NextResponse } from 'next/server';
import { listPeople, upsertPerson } from '@/lib/store';

export const dynamic = 'force-dynamic';

function slug(n) {
  return String(n)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function GET() {
  try {
    const people = await listPeople();
    return NextResponse.json({ people });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { label } = await req.json();
    if (!label || !label.trim()) return NextResponse.json({ error: 'Falta el nombre' }, { status: 400 });
    let id = slug(label);
    if (id === 'ali' || id === 'alitzel') id = 'ali';
    const person = await upsertPerson(id, id === 'ali' ? 'Ali' : label.trim());
    return NextResponse.json({ person });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
