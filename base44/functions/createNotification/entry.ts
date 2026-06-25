import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { type, userId, title, message, record_type, record_id, workspace } = await req.json();

    if (!type || !userId || !title) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const notification = await base44.entities.Notification.create({
      user: userId,
      type: type || 'system',
      title,
      message: message || '',
      record_type: record_type || '',
      record_id: record_id || '',
      workspace: workspace || '',
      read_status: false,
    });

    return Response.json({ notification });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});