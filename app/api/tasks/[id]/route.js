import { NextResponse } from 'next/server';
import { updateTask, deleteTask } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function PATCH(req, { params }) {
  try {
    const { id } = await params;
    const patch = await req.json();
    const task = await updateTask(id, patch);
    return NextResponse.json({ task });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(_req, { params }) {
  try {
    const { id } = await params;
    await deleteTask(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
