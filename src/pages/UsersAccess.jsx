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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { logAudit, AUDIT_ACTIONS } from '@/lib/auditLogger';
import { UserPlus, Mail, Shield, Ban, Trash2, Clock, Check, Crown, Eye, Target, LayoutGrid } from 'lucide-react';
import InviteUserDialog from '@/components/shared/InviteUserDialog';

const ROLE_LABELS = {
  admin: 'Admin', executive: 'Executive', manager: 'Manager',
  team_member: 'Team Member', read_only: 'Read Only', user: 'Team Member',
};

const WS_ROLE_LABELS = {
  workspace_admin: 'Workspace Admin', manager: 'Manager', member: 'Member', viewer: 'Viewer',
};

const WS_ROLE_ICONS = {
  workspace_admin: Crown, manager: Shield, member: Check, viewer: Eye,
};

const ROLE_PERMISSIONS = [
  { role: 'Workspace Admin', permissions: ['Full access', 'Manage members', 'Manage settings', 'Delete workspace'], color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
  { role: 'Manager', permissions: ['Create & edit', 'Invite users', 'Manage boards', 'Manage processes'], color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  { role: 'Member', permissions: ['View workspace', 'Edit assigned items', 'Comment', 'Upload documents'], color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  { role: 'Viewer', permissions: ['View only', 'No editing', 'Comment'], color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300' },
];

export default function UsersAccess() {
  const { user, currentWorkspaceId, currentWorkspace, refresh } = useWorkspace();
  const { isAdmin, loading: permLoading } = usePermissions();
  const { toast } = useToast();
  const [users, setUsers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);

  const loadData = async () => {
    if (!currentWorkspaceId) return;
    setLoading(true);
    try {
      const [allUsers, invs, mems] = await Promise.all([
        base44.asServiceRole.entities.User.list().catch(() => []),
        base44.asServiceRole.entities.Invitation.filter({ workspace: currentWorkspaceId }, '-created_date').catch(() => []),
        base44.asServiceRole.entities.WorkspaceMember.filter({ workspace: currentWorkspaceId }, '-created_date').catch(() => []),
      ]);
      setUsers(allUsers);
      setInvitations(invs);
      setMembers(mems);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (isAdmin) loadData(); }, [isAdmin, currentWorkspaceId]);

  if (permLoading || loading) return <LoadingSpinner />;
  if (!isAdmin) {
    return (
      <div className="py-16 text-center">
        <Shield className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">You don't have access to this page. Admins only.</p>
      </div>
    );
  }

  const handleInvite = async (email, role, department) => {
    try {
      const appRole = role === 'workspace_admin' ? 'admin' : 'user';
      await base44.users.inviteUser(email, appRole);
      const expires = new Date();
      expires.setDate(expires.getDate() + 7);
      await base44.asServiceRole.entities.Invitation.create({
        email, invited_by: user.id, invited_by_name: user.full_name,
        workspace: currentWorkspaceId, workspace_name: currentWorkspace?.workspace_name,
        role, department, status: 'pending', expires_date: expires.toISOString(),
      });
      await base44.asServiceRole.entities.WorkspaceMember.create({
        workspace: currentWorkspaceId, workspace_name: currentWorkspace?.workspace_name,
        user_email: email, role, department, status: 'invited', invited_by: user.id,
      });
      logAudit(AUDIT_ACTIONS.INVITE_SENT, { record_type: 'Invitation', after_value: { email, role } });
      toast({ title: 'Invitation sent', description: `Invited ${email} as ${WS_ROLE_LABELS[role]}` });
      setInviteOpen(false);
      loadData();
    } catch (e) {
      toast({ title: 'Failed to invite', description: e.message, variant: 'destructive' });
    }
  };

  const handleRevoke = async (inv) => {
    try {
      await base44.asServiceRole.entities.Invitation.update(inv.id, { status: 'revoked' });
      logAudit(AUDIT_ACTIONS.RECORD_UPDATED, { record_type: 'Invitation', record_id: inv.id, after_value: { status: 'revoked' } });
      toast({ title: 'Invitation revoked' });
      loadData();
    } catch (e) { toast({ title: 'Failed to revoke', variant: 'destructive' }); }
  };

  const handleChangeMemberRole = async (memberId, newRole) => {
    try {
      const member = members.find(m => m.id === memberId);
      const oldRole = member?.role;
      await base44.asServiceRole.entities.WorkspaceMember.update(memberId, { role: newRole });
      logAudit(AUDIT_ACTIONS.ROLE_CHANGED, { record_type: 'WorkspaceMember', record_id: memberId, before_value: { role: oldRole }, after_value: { role: newRole } });
      toast({ title: 'Role updated' });
      loadData();
    } catch (e) { toast({ title: 'Failed to update role', variant: 'destructive' }); }
  };

  const handleSuspendMember = async (member) => {
    try {
      await base44.asServiceRole.entities.WorkspaceMember.update(member.id, { status: 'suspended' });
      logAudit(AUDIT_ACTIONS.USER_DISABLED, { record_type: 'WorkspaceMember', record_id: member.id });
      toast({ title: 'Member suspended' });
      loadData();
    } catch (e) { toast({ title: 'Failed to suspend', variant: 'destructive' }); }
  };

  const handleRemoveMember = async (member) => {
    try {
      await base44.asServiceRole.entities.WorkspaceMember.update(member.id, { status: 'removed' });
      logAudit(AUDIT_ACTIONS.USER_DISABLED, { record_type: 'WorkspaceMember', record_id: member.id, after_value: { status: 'removed' } });
      toast({ title: 'Access removed' });
      loadData();
    } catch (e) { toast({ title: 'Failed to remove', variant: 'destructive' }); }
  };

  const handleReactivateMember = async (member) => {
    try {
      await base44.asServiceRole.entities.WorkspaceMember.update(member.id, { status: 'active' });
      logAudit(AUDIT_ACTIONS.USER_ENABLED, { record_type: 'WorkspaceMember', record_id: member.id });
      toast({ title: 'Member reactivated' });
      loadData();
    } catch (e) { toast({ title: 'Failed to reactivate', variant: 'destructive' }); }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Users & Access" subtitle="Manage users, invitations, and workspace members">
        <Button onClick={() => setInviteOpen(true)} size="sm"><UserPlus className="w-4 h-4" /> Invite User</Button>
      </PageHeader>

      <InviteUserDialog open={inviteOpen} onOpenChange={setInviteOpen} />

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Active Users ({users.length})</TabsTrigger>
          <TabsTrigger value="invitations">Invitations ({invitations.filter(i => i.status === 'pending').length})</TabsTrigger>
          <TabsTrigger value="members">Workspace Members ({members.length})</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
        </TabsList>

        {/* Active Users */}
        <TabsContent value="users">
          <Card><CardContent className="p-0">
            {users.length === 0 ? <EmptyRow message="No users found" /> : (
              <div className="divide-y">
                {users.map(u => (
                  <div key={u.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary shrink-0">
                      {u.full_name?.split(' ').map(n => n[0]).slice(0, 2).join('') || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{u.full_name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                    {u.disabled && <Badge variant="destructive" className="text-[10px]">Disabled</Badge>}
                    <Badge variant="secondary" className="text-[10px]">{ROLE_LABELS[u.role] || u.role}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent></Card>
        </TabsContent>

        {/* Invitations */}
        <TabsContent value="invitations">
          <Card><CardContent className="p-0">
            {invitations.length === 0 ? <EmptyRow message="No invitations sent" /> : (
              <div className="divide-y">
                {invitations.map(inv => (
                  <div key={inv.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                      <Mail className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{inv.email}</p>
                      <p className="text-xs text-muted-foreground">By {inv.invited_by_name} · {WS_ROLE_LABELS[inv.role] || inv.role}</p>
                    </div>
                    <Badge variant={inv.status === 'pending' ? 'default' : 'secondary'} className={`text-[10px] ${
                      inv.status === 'pending' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300' :
                      inv.status === 'accepted' ? 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-300' :
                      'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                    }`}>{inv.status}</Badge>
                    {inv.status === 'pending' && (
                      <Button variant="ghost" size="sm" onClick={() => handleRevoke(inv)} className="text-destructive hover:text-destructive">Revoke</Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent></Card>
        </TabsContent>

        {/* Workspace Members */}
        <TabsContent value="members">
          <Card><CardContent className="p-0">
            {members.length === 0 ? <EmptyRow message="No workspace members yet" /> : (
              <div className="divide-y">
                {members.map(m => {
                  const RoleIcon = WS_ROLE_ICONS[m.role] || Check;
                  return (
                    <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary shrink-0">
                        {m.user_name?.split(' ').map(n => n[0]).slice(0, 2).join('') || m.user_email?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{m.user_name || m.user_email || 'Unknown'}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {m.user_email && <span className="truncate">{m.user_email}</span>}
                          {m.last_active_date && (
                            <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> {new Date(m.last_active_date).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      {m.status === 'active' ? (
                        <>
                          <Select defaultValue={m.role} onValueChange={(v) => handleChangeMemberRole(m.id, v)}>
                            <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="workspace_admin">Workspace Admin</SelectItem>
                              <SelectItem value="manager">Manager</SelectItem>
                              <SelectItem value="member">Member</SelectItem>
                              <SelectItem value="viewer">Viewer</SelectItem>
                            </SelectContent>
                          </Select>
                          {m.role !== 'workspace_admin' && (
                            <Button variant="ghost" size="icon" onClick={() => handleSuspendMember(m)} title="Suspend" className="text-amber-600">
                              <Ban className="w-4 h-4" />
                            </Button>
                          )}
                          {m.role !== 'workspace_admin' && (
                            <Button variant="ghost" size="icon" onClick={() => handleRemoveMember(m)} title="Remove Access" className="text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[10px] capitalize">{m.status}</Badge>
                          {m.status === 'suspended' && (
                            <Button variant="ghost" size="sm" onClick={() => handleReactivateMember(m)}>Reactivate</Button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent></Card>
        </TabsContent>

        {/* Roles */}
        <TabsContent value="roles">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {ROLE_PERMISSIONS.map(rp => (
              <Card key={rp.role}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${rp.color}`}>{rp.role}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="space-y-1.5">
                    {rp.permissions.map((perm, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Check className="w-3 h-3 text-green-500" /> {perm}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}



function EmptyRow({ message }) {
  return <div className="py-10 text-center text-sm text-muted-foreground">{message}</div>;
}