import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useWorkspace } from '@/lib/WorkspaceContext';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import PageHeader from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { logAudit, AUDIT_ACTIONS } from '@/lib/auditLogger';
import { Shield, Lock, KeyRound, Check, AlertTriangle, Info, Activity, Globe, Clock, Settings } from 'lucide-react';

const ACTION_LABELS = {
  login: 'Login', logout: 'Logout', invite_sent: 'Invite Sent',
  invite_accepted: 'Invite Accepted', role_changed: 'Role Changed',
  workspace_switched: 'Workspace Switched', workspace_created: 'Workspace Created',
  workspace_updated: 'Workspace Updated', security_setting_changed: 'Security Setting Changed',
  record_created: 'Record Created', record_updated: 'Record Updated',
  record_deleted: 'Record Deleted', user_disabled: 'User Disabled', user_enabled: 'User Enabled',
};

export default function SecuritySettings() {
  const { isAdmin, loading: permLoading, currentWorkspaceId } = useWorkspace();
  const { toast } = useToast();
  const [settings, setSettings] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [domainInput, setDomainInput] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [settingsRecs, logs] = await Promise.all([
          base44.asServiceRole.entities.IdentityProviderSettings.list().catch(() => []),
          base44.asServiceRole.entities.AuditLog.filter({ workspace: currentWorkspaceId }, '-created_date', 20).catch(() => []),
        ]);
        if (settingsRecs.length > 0) setSettings(settingsRecs[0]);
        setAuditLogs(logs);
      } finally { setLoading(false); }
    }
    if (isAdmin && currentWorkspaceId) load();
    else setLoading(false);
  }, [isAdmin, currentWorkspaceId]);

  const update = (field, value) => setSettings(prev => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      if (settings.id) {
        await base44.asServiceRole.entities.IdentityProviderSettings.update(settings.id, {
          invitation_only: settings.invitation_only,
          auto_provision_users: settings.auto_provision_users,
          default_role: settings.default_role,
          domain_restrictions: settings.domain_restrictions || [],
          session_timeout_minutes: settings.session_timeout_minutes || 60,
          tenant_id: settings.tenant_id, client_id: settings.client_id,
          provider_type: settings.provider_type, status: settings.status,
          allowed_groups: settings.allowed_groups || [],
        });
      } else {
        const created = await base44.asServiceRole.entities.IdentityProviderSettings.create({
          provider_name: settings.provider_name || 'Microsoft Entra ID',
          provider_type: settings.provider_type || 'microsoft_entra_id',
          status: settings.status || 'not_configured',
          tenant_id: settings.tenant_id || '', client_id: settings.client_id || '',
          domain_restrictions: settings.domain_restrictions || [],
          auto_provision_users: settings.auto_provision_users || false,
          default_role: settings.default_role || 'team_member',
          allowed_groups: settings.allowed_groups || [],
          session_timeout_minutes: settings.session_timeout_minutes || 60,
          invitation_only: settings.invitation_only !== false,
        });
        setSettings(created);
      }
      logAudit(AUDIT_ACTIONS.SECURITY_SETTING_CHANGED, { record_type: 'IdentityProviderSettings' });
      toast({ title: 'Security settings saved' });
    } catch (e) {
      toast({ title: 'Failed to save', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const addDomain = () => {
    if (!domainInput.trim()) return;
    update('domain_restrictions', [...(settings.domain_restrictions || []), domainInput.trim()]);
    setDomainInput('');
  };
  const removeDomain = (idx) => update('domain_restrictions', (settings.domain_restrictions || []).filter((_, i) => i !== idx));

  if (permLoading || loading) return <LoadingSpinner />;
  if (!isAdmin) {
    return (
      <div className="py-16 text-center">
        <Shield className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">You don't have access to this page. Admins only.</p>
      </div>
    );
  }

  const s = settings || {
    provider_name: 'Microsoft Entra ID', provider_type: 'microsoft_entra_id',
    status: 'not_configured', tenant_id: '', client_id: '',
    domain_restrictions: [], auto_provision_users: false,
    default_role: 'team_member', allowed_groups: [],
    session_timeout_minutes: 60, invitation_only: true,
  };

  const providerStatus = s.status || 'not_configured';

  return (
    <div className="space-y-6">
      <PageHeader title="Security" subtitle="Authentication, identity providers, and access control" />

      <Tabs defaultValue="auth">
        <TabsList>
          <TabsTrigger value="auth">Authentication</TabsTrigger>
          <TabsTrigger value="providers">Identity Providers</TabsTrigger>
          <TabsTrigger value="domains">Allowed Domains</TabsTrigger>
          <TabsTrigger value="session">Session Settings</TabsTrigger>
          <TabsTrigger value="audit">Audit Summary</TabsTrigger>
        </TabsList>

        {/* Authentication */}
        <TabsContent value="auth" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Lock className="w-4 h-4" /> Authentication</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium">Invitation-Only Access</p>
                  <p className="text-xs text-muted-foreground">Only invited users can join the workspace</p>
                </div>
                <Switch checked={s.invitation_only !== false} onCheckedChange={v => update('invitation_only', v)} />
              </div>
              <div className="flex items-center justify-between py-2 border-t">
                <div>
                  <p className="text-sm font-medium">Auto-Provision Users</p>
                  <p className="text-xs text-muted-foreground">Automatically create accounts for SSO users on first login</p>
                </div>
                <Switch checked={s.auto_provision_users || false} onCheckedChange={v => update('auto_provision_users', v)} />
              </div>
              <div className="py-2 border-t">
                <Label>Default Role for New Users</Label>
                <Select value={s.default_role || 'team_member'} onValueChange={v => update('default_role', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="executive">Executive</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="team_member">Team Member</SelectItem>
                    <SelectItem value="read_only">Read Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">Tuesday Workspace is internal-only. No public registration or anonymous access is permitted.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Identity Providers */}
        <TabsContent value="providers" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><KeyRound className="w-4 h-4" /> Identity Providers</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {/* Provider Type Selector */}
              <div>
                <Label>Provider Type</Label>
                <Select value={s.provider_type || 'microsoft_entra_id'} onValueChange={v => update('provider_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="microsoft_entra_id">Microsoft Entra ID</SelectItem>
                    <SelectItem value="saml">SAML 2.0</SelectItem>
                    <SelectItem value="openid_connect">OpenID Connect</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    providerStatus === 'active' ? 'bg-green-100 dark:bg-green-900/40' :
                    providerStatus === 'configured' ? 'bg-blue-100 dark:bg-blue-900/40' :
                    'bg-gray-100 dark:bg-gray-800'
                  }`}>
                    {providerStatus === 'active' ? <Check className="w-5 h-5 text-green-600 dark:text-green-400" /> :
                     providerStatus === 'configured' ? <KeyRound className="w-5 h-5 text-blue-600 dark:text-blue-400" /> :
                     <AlertTriangle className="w-5 h-5 text-muted-foreground" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{s.provider_name || 'Identity Provider'}</p>
                    <p className="text-xs text-muted-foreground capitalize">{providerStatus === 'not_configured' ? 'Not configured' : providerStatus}</p>
                  </div>
                </div>
                <Badge variant={providerStatus === 'active' ? 'default' : 'secondary'} className="text-[10px]">
                  {providerStatus === 'active' ? 'Connected' : providerStatus === 'configured' ? 'Configured' : 'Not Set Up'}
                </Badge>
              </div>

              {/* Configuration Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tenant-id">{s.provider_type === 'saml' ? 'Entity ID' : s.provider_type === 'openid_connect' ? 'Issuer URL' : 'Entra Tenant ID'}</Label>
                  <Input id="tenant-id" value={s.tenant_id || ''} onChange={e => update('tenant_id', e.target.value)} placeholder={s.provider_type === 'saml' ? 'https://...' : '00000000-0000-0000-0000-000000000000'} />
                </div>
                <div>
                  <Label htmlFor="client-id">{s.provider_type === 'saml' ? 'ACS URL' : 'Application (Client) ID'}</Label>
                  <Input id="client-id" value={s.client_id || ''} onChange={e => update('client_id', e.target.value)} placeholder={s.provider_type === 'saml' ? 'https://...' : '00000000-0000-0000-0000-000000000000'} />
                </div>
              </div>

              <div>
                <Label>Connection Status</Label>
                <Select value={s.status || 'not_configured'} onValueChange={v => update('status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_configured">Not Configured</SelectItem>
                    <SelectItem value="configured">Configured</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="disabled">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {s.provider_type === 'microsoft_entra_id' && (
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">Configure your Entra ID tenant and client IDs to prepare for SSO activation. Full integration available in a future update.</p>
                </div>
              )}
              {s.provider_type === 'saml' && (
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">SAML 2.0 SSO preparation. Enter your IdP Entity ID and Assertion Consumer Service URL. Full SAML integration available in a future update.</p>
                </div>
              )}
              {s.provider_type === 'openid_connect' && (
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">OpenID Connect preparation. Enter your Issuer URL and Client ID. Full OIDC integration available in a future update.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Allowed Domains */}
        <TabsContent value="domains" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Globe className="w-4 h-4" /> Allowed Domains</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">Only allow registrations from these email domains</p>
              <div className="flex gap-2">
                <Input value={domainInput} onChange={e => setDomainInput(e.target.value)} placeholder="company.com" onKeyDown={e => e.key === 'Enter' && addDomain()} />
                <Button onClick={addDomain} variant="outline">Add</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(s.domain_restrictions || []).length === 0 ? (
                  <span className="text-xs text-muted-foreground">No domain restrictions set</span>
                ) : (
                  (s.domain_restrictions || []).map((domain, idx) => (
                    <span key={idx} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-xs">
                      {domain}
                      <button onClick={() => removeDomain(idx)} className="text-muted-foreground hover:text-destructive">×</button>
                    </span>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Session Settings */}
        <TabsContent value="session" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="w-4 h-4" /> Session Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Session Timeout (minutes)</Label>
                <Input type="number" value={s.session_timeout_minutes || 60} onChange={e => update('session_timeout_minutes', parseInt(e.target.value) || 60)} />
                <p className="text-xs text-muted-foreground mt-1">Users will be automatically logged out after this period of inactivity.</p>
              </div>
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-start gap-2">
                <Shield className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">Multi-Factor Authentication is managed through your identity provider. Once SSO is active, all MFA policies configured in your IdP will apply automatically.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Summary */}
        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Activity className="w-4 h-4" /> Audit Summary</CardTitle></CardHeader>
            <CardContent className="p-0">
              {auditLogs.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">No audit records yet</div>
              ) : (
                <div className="divide-y max-h-[500px] overflow-y-auto">
                  {auditLogs.map(log => (
                    <div key={log.id} className="flex items-start gap-3 px-4 py-3">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Activity className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{log.user_name || 'System'}</p>
                          <Badge variant="secondary" className="text-[9px]">{ACTION_LABELS[log.action] || log.action}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {log.record_type && <span>{log.record_type}</span>}
                          {log.record_id && <span> · {log.record_id.slice(0, 8)}</span>}
                          {log.module && <span> · {log.module}</span>}
                        </p>
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                          {new Date(log.created_date).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? 'Saving...' : 'Save Security Settings'}
        </Button>
      </div>
    </div>
  );
}