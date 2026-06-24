import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useWorkspace } from '@/lib/WorkspaceContext';
import usePermissions from '@/hooks/usePermissions';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import PageHeader from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { UserPlus, Mail, Shield, Clock, Ban, MoreHorizontal } from 'lucide-react';

const ROLE_LABELS = {
  admin: 'Admin',
  executive: 'Executive',
  manager: 'Manager',
  team_member: 'Team Member',
  read_only: 'Read Only',
  user: 'Team Member',
};

const WS_ROLE_LABELS = {
  workspace_admin: 'Workspace Admin',
  manager: 'Manager',
  member: 'Member',
  viewer: 'Viewer',
};

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

  useEffect(() => {
    if (isAdmin) loadData();
  }, [isAdmin, currentWorkspaceId]);

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
        email,
        invited_by: user.id,
        invited_by_name: user.full_name,
        workspace: currentWorkspaceId,
        workspace_name: currentWorkspace?.workspace_name,
        role,
        department,
        status: 'pending',
        expires_date: expires.toISOString(),
      });
      await base44.asServiceRole.entities.WorkspaceMember.create({
        workspace: currentWorkspaceId,
        workspace_name: currentWorkspace?.workspace_name,
        user_email: email,
        role,
        department,
        status: 'invited',
        invited_by: user.id,
      });
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
      toast({ title: 'Invitation revoked' });
      loadData();
    } catch (e) {
      toast({ title: 'Failed to revoke', variant: 'destructive' });
    }
  };

  const handleChangeMemberRole = async (memberId, newRole) => {
    try {
      await base44.asServiceRole.entities.WorkspaceMember.update(memberId, { role: newRole });
      toast({ title: 'Role updated' });
      loadData();
    } catch (e) {
      toast({ title: 'Failed to update role', variant: 'destructive' });
    }
  };

  const handleSuspendMember = async (member) => {
    try {
      await base44.asServiceRole.entities.WorkspaceMember.update(member.id, { status: 'suspended' });
      toast({ title: 'Member suspended' });
      loadData();
    } catch (e) {
      toast({ title: 'Failed to suspend', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Users & Access" subtitle="Manage users, invitations, and workspace members">
        <Button onClick={() => setInviteOpen(true)} size="sm">
          <UserPlus className="w-4 h-4" /> Invite User
        </Button>
      </PageHeader>

      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} onInvite={handleInvite} />

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Active Users ({users.length})</TabsTrigger>
          <TabsTrigger value="invitations">Pending Invitations ({invitations.filter(i => i.status === 'pending').length})</TabsTrigger>
          <TabsTrigger value="members">Workspace Members ({members.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardContent className="p-0">
              {users.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">No users found</div>
              ) : (
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
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {ROLE_LABELS[u.role] || u.role}
                      </span>
                      {u.disabled && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300">Disabled</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invitations">
          <Card>
            <CardContent className="p-0">
              {invitations.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">No invitations sent</div>
              ) : (
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
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                        inv.status === 'pending' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300' :
                        inv.status === 'accepted' ? 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-300' :
                        inv.status === 'revoked' ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300' :
                        'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                      }`}>{inv.status}</span>
                      {inv.status === 'pending' && (
                        <Button variant="ghost" size="sm" onClick={() => handleRevoke(inv)} className="text-destructive hover:text-destructive">
                          Revoke
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members">
          <Card>
            <CardContent className="p-0">
              {members.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">No workspace members yet</div>
              ) : (
                <div className="divide-y">
                  {members.map(m => (
                    <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary shrink-0">
                        {m.user_name?.split(' ').map(n => n[0]).slice(0, 2).join('') || m.user_email?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{m.user_name || m.user_email || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground truncate">{m.user_email || m.department}</p>
                      </div>
                      {m.status === 'active' ? (
                        <Select defaultValue={m.role} onValueChange={(v) => handleChangeMemberRole(m.id, v)}>
                          <SelectTrigger className="w-36 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="workspace_admin">Workspace Admin</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">{m.status}</span>
                      )}
                      {m.status === 'active' && m.role !== 'workspace_admin' && (
                        <Button variant="ghost" size="icon" onClick={() => handleSuspendMember(m)} className="text-destructive">
                          <Ban className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InviteDialog({ open, onOpenChange, onInvite }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [department, setDepartment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) return;
    setSubmitting(true);
    try {
      await onInvite(email.trim(), role, department.trim() || undefined);
      setEmail('');
      setRole('member');
      setDepartment('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite User</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="invite-email">Email Address</Label>
            <Input id="invite-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="colleague@company.com" />
          </div>
          <div>
            <Label>Workspace Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="workspace_admin">Workspace Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="invite-dept">Department (optional)</Label>
            <Input id="invite-dept" value={department} onChange={e => setDepartment(e.target.value)} placeholder="e.g. Engineering" />
          </div>
          <p className="text-xs text-muted-foreground">
            The invitee will receive an email invitation to join Tuesday Workspace.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting || !email.trim()}>
            {submitting ? 'Sending...' : 'Send Invitation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}