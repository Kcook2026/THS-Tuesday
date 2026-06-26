import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const {
      recipient,
      sender,
      sender_name,
      type,
      title,
      message,
      record_type,
      record_id,
      target_url,
      workspace,
      workboard,
    } = await req.json();

    if (!recipient || !title) {
      return Response.json({ error: 'Missing required fields: recipient, title' }, { status: 400 });
    }

    // Validate target_url to prevent open redirect vulnerability
    if (target_url) {
      const allowedPrefixes = ['/', '/workboards/', '/forms/', '/tasks/', '/projects/', '/calendar/', '/processes/'];
      const isValidUrl = allowedPrefixes.some(prefix => target_url.startsWith(prefix));
      if (!isValidUrl) {
        return Response.json({ error: 'Invalid target_url: must be a relative path' }, { status: 400 });
      }
    }

    // Validate workspace access if workspace is provided
    if (workspace) {
      const membership = await base44.asServiceRole.entities.WorkspaceMember.filter({
        workspace,
        user: user.id,
        status: 'active'
      }).then(m => m[0] || null);

      if (!membership && user.account_role !== 'system_admin' && user.account_role !== 'executive') {
        return Response.json({ error: 'Forbidden: Not a member of this workspace' }, { status: 403 });
      }
    }

    const notification = await base44.entities.Notification.create({
      recipient,
      sender: sender || user.id,
      sender_name: sender_name || user.full_name || user.email || 'User',
      type: type || 'system',
      title,
      message: message || '',
      record_type: record_type || '',
      record_id: record_id || '',
      target_url: target_url || '',
      workspace: workspace || '',
      workboard: workboard || '',
      read_status: false,
    });

    return Response.json({ notification });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});