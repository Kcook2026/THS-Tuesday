import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useWorkspace } from '@/lib/WorkspaceContext';
import usePermissions from '@/hooks/usePermissions';
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
import { useToast } from '@/components/ui/use-toast';
import { Shield, Lock, KeyRound, Check, AlertTriangle, Info } from 'lucide-react';

export default function SecuritySettings() {
  const { isAdmin, loading: permLoading } = usePermissions();
  const { toast } = useToast();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [domainInput, setDomainInput] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const records = await base44.asServiceRole.entities.IdentityProviderSettings.list();
        if (records.length > 0) {
          setSettings(records[0]);
        }
      } catch (e) {
        // silent
      } finally {
        setLoading(false);
      }
    }
    if (isAdmin) load();
    else setLoading(false);
  }, [isAdmin]);

  const update = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

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
          tenant_id: settings.tenant_id,
          client_id: settings.client_id,
          status: settings.status,
        });
      } else {
        const created = await base44.asServiceRole.entities.IdentityProviderSettings.create({
          provider_name: 'Microsoft Entra ID',
          provider_type: 'microsoft_entra_id',
          status: settings.status || 'not_configured',
          tenant_id: settings.tenant_id || '',
          client_id: settings.client_id || '',
          domain_restrictions: settings.domain_restrictions || [],
          auto_provision_users: settings.auto_provision_users || false,
          default_role: settings.default_role || 'team_member',
          invitation_only: settings.invitation_only !== false,
          session_timeout_minutes: settings.session_timeout_minutes || 60,
        });
        setSettings(created);
      }
      toast({ title: 'Security settings saved' });
    } catch (e) {
      toast({ title: 'Failed to save', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const addDomain = () => {
    if (!domainInput.trim()) return;
    update('domain_restrictions', [...(settings.domain_restrictions || []), domainInput.trim()]);
    setDomainInput('');
  };

  const removeDomain = (idx) => {
    update('domain_restrictions', (settings.domain_restrictions || []).filter((_, i) => i !== idx));
  };

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
    invitation_only: true,
    auto_provision_users: false,
    default_role: 'team_member',
    domain_restrictions: [],
    session_timeout_minutes: 60,
    status: 'not_configured',
    tenant_id: '',
    client_id: '',
  };

  const entraStatus = s.status || 'not_configured';

  return (
    <div className="space-y-6">
      <PageHeader title="Security Settings" subtitle="Authentication, access control, and identity provider configuration" />

      {/* Entra ID Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <KeyRound className="w-4 h-4" /> Microsoft Entra ID
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                entraStatus === 'active' ? 'bg-green-100 dark:bg-green-900/40' :
                entraStatus === 'configured' ? 'bg-blue-100 dark:bg-blue-900/40' :
                'bg-gray-100 dark:bg-gray-800'
              }`}>
                {entraStatus === 'active' ? <Check className="w-5 h-5 text-green-600 dark:text-green-400" /> :
                 entraStatus === 'configured' ? <KeyRound className="w-5 h-5 text-blue-600 dark:text-blue-400" /> :
                 <AlertTriangle className="w-5 h-5 text-muted-foreground" />}
              </div>
              <div>
                <p className="text-sm font-medium">Entra ID SSO</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {entraStatus === 'not_configured' ? 'Not configured' : entraStatus}
                </p>
              </div>
            </div>
            <Badge variant={entraStatus === 'active' ? 'default' : 'secondary'} className="text-[10px]">
              {entraStatus === 'active' ? 'Connected' : entraStatus === 'configured' ? 'Configured' : 'Not Set Up'}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="entra-tenant">Entra Tenant ID</Label>
              <Input id="entra-tenant" value={s.tenant_id || ''} onChange={e => update('tenant_id', e.target.value)} placeholder="00000000-0000-0000-0000-000000000000" />
            </div>
            <div>
              <Label htmlFor="entra-client">Application (Client) ID</Label>
              <Input id="entra-client" value={s.client_id || ''} onChange={e => update('client_id', e.target.value)} placeholder="00000000-0000-0000-0000-000000000000" />
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

          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Full Microsoft Entra ID SSO integration will be available once supported by the platform.
              Configure your tenant and client IDs now to prepare for activation.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Access Control */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="w-4 h-4" /> Access Control
          </CardTitle>
        </CardHeader>
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

          <div className="py-2 border-t space-y-2">
            <div>
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
          </div>

          <div className="py-2 border-t space-y-2">
            <Label>Session Timeout (minutes)</Label>
            <Input type="number" value={s.session_timeout_minutes || 60} onChange={e => update('session_timeout_minutes', parseInt(e.target.value) || 60)} />
          </div>
        </CardContent>
      </Card>

      {/* Domain Restrictions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4" /> Domain Restrictions
          </CardTitle>
        </CardHeader>
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

      {/* MFA Note */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-medium">Multi-Factor Authentication</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                MFA is managed through Microsoft Entra ID. Once SSO is active, all MFA policies
                configured in your Entra tenant will apply automatically.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? 'Saving...' : 'Save Security Settings'}
        </Button>
      </div>
    </div>
  );
}