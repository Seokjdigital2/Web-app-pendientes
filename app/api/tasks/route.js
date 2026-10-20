import { NextResponse } from 'next/server';
import { listTasks, createTask } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const tasks = await listTasks();
    return NextResponse.json({ tasks });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const data = await req.json();
    const task = await createTask(data);
    return NextResponse.json({ task });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
