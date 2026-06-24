import { base44 } from '@/api/base44Client';

export async function logAudit(action, details = {}) {
  try {
    const me = await base44.auth.me().catch(() => null);
    if (!me) return;
    const workspaceId = typeof localStorage !== 'undefined'
      ? localStorage.getItem('tuesday_current_workspace')
      : null;
    await base44.entities.AuditLog.create({
      user: me.id,
      user_name: me.full_name,
      action,
      module: details.module || null,
      record_type: details.record_type || null,
      record_id: details.record_id || null,
      workspace: workspaceId || null,
      before_value: details.before_value ? JSON.stringify(details.before_value) : null,
      after_value: details.after_value ? JSON.stringify(details.after_value) : null,
    });
  } catch (e) {
    // silent fail - audit logging should never block operations
  }
}

export const AUDIT_ACTIONS = {
  LOGIN: 'login',
  LOGOUT: 'logout',
  INVITE_SENT: 'invite_sent',
  INVITE_ACCEPTED: 'invite_accepted',
  ROLE_CHANGED: 'role_changed',
  WORKSPACE_SWITCHED: 'workspace_switched',
  WORKSPACE_CREATED: 'workspace_created',
  WORKSPACE_UPDATED: 'workspace_updated',
  SECURITY_SETTING_CHANGED: 'security_setting_changed',
  RECORD_CREATED: 'record_created',
  RECORD_UPDATED: 'record_updated',
  RECORD_DELETED: 'record_deleted',
  USER_DISABLED: 'user_disabled',
  USER_ENABLED: 'user_enabled',
};