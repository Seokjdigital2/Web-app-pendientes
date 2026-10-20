import { NextResponse } from 'next/server';
import { updateTask, deleteTask, getTaskHistory } from '@/lib/store';

export const dynamic = 'force-dynamic';

const CODE_STATUS = {
  invalid_dates: 400,
  blocked_reason_required: 409,
  progress_required_on_reopen: 409,
};

export async function GET(_req, { params }) {
  try {
    const { id } = await params;
    const history = await getTaskHistory(id);
    return NextResponse.json({ history });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req, { params }) {
  try {
    const { id } = await params;
    const patch = await req.json();
    const task = await updateTask(id, patch);
    return NextResponse.json({ task });
  } catch (e) {
    const status = CODE_STATUS[e.code] || 500;
    return NextResponse.json({ error: e.message, code: e.code }, { status });
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
