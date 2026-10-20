import { NextResponse } from 'next/server';
import { upsertClientMeeting, upsertTask } from '@/lib/store';

export const dynamic = 'force-dynamic';

function slug(n) {
  return String(n)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function POST(req) {
  const auth = req.headers.get('authorization') || '';
  const expected = `Bearer ${process.env.TACTIQ_SYNC_SECRET || ''}`;
  if (!process.env.TACTIQ_SYNC_SECRET || auth !== expected) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { client, meeting, tasks } = body;
    if (!client || !client.name || !meeting || !meeting.date || !meeting.title) {
      return NextResponse.json({ error: 'Faltan campos: client.name, meeting.date, meeting.title' }, { status: 400 });
    }
    const clientId = client.id || slug(client.name);

    const updatedClient = await upsertClientMeeting(clientId, client.name, meeting);

    const savedTasks = [];
    for (const t of tasks || []) {
      const id = t.id || `${clientId}-${slug(t.activity || 'tarea')}-${Date.now().toString(36)}`;
      const saved = await upsertTask({
        ...t,
        id,
        client: clientId,
        source: t.source || meeting.title,
        meetingUrl: meeting.url || '',
        meetingDate: meeting.date,
      });
      savedTasks.push(saved);
    }

    return NextResponse.json({ ok: true, client: updatedClient, tasks: savedTasks });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
