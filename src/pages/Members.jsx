import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useWorkspace } from '@/lib/WorkspaceContext';
import usePermissions from '@/hooks/usePermissions';
import { ACCOUNT_ROLE_PERMISSIONS, WORKSPACE_ROLE_PERMISSIONS, WORKBOARD_ROLE_PERMISSIONS } from '@/config/PermissionConfig';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import PageHeader from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useConfirm } from '@/components/shared/ConfirmDialog';
import { logAudit, AUDIT_ACTIONS } from '@/lib/auditLogger';
import { 
  UserPlus, Mail, Shield, Ban, Trash2, Clock, Check, Crown, Eye, 
  LayoutGrid, Briefcase, Target, Building2, CalendarDays, Brush 
} from 'lucide-react';
import InviteUserDialog from '@/components/shared/InviteUserDialog';
import BoardAccessDrawer from '@/components/workboards/BoardAccessDrawer';
import ArchivedBoards from '@/components/workboards/ArchivedBoards';
import { getActiveWorkboards, getArchivedWorkboards, getValidBoardIds } from '@/lib/workboardHelpers';

const ACCOUNT_ROLE_LABELS = {
  system_admin: 'System Admin',
  executive: 'Executive',
  manager: 'Manager',
  member: 'Member',
  viewer: 'Viewer',
};

const ACCOUNT_ROLE_COLORS = {
  system_admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  executive: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  manager: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  member: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  viewer: 'bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300',
};

const WORKSPACE_ROLE_LABELS = {
  workspace_owner: 'Workspace Owner',
  workspace_manager: 'Workspace Manager',
  workspace_member: 'Workspace Member',
  workspace_viewer: 'Workspace Viewer',
  workspace_observer: 'Workspace Observer',
};

const WORKSPACE_ROLE_ICONS = {
  workspace_owner: Crown,
  workspace_manager: Shield,
  workspace_member: Check,
  workspace_viewer: Eye,
  workspace_observer: Eye,
};

const WORKBOARD_ROLE_LABELS = {
  workboard_owner: 'Board Owner',
  workboard_editor: 'Board Editor',
  workboard_contributor: 'Contributor',
  assigned_contributor: 'Assigned',
  workboard_viewer: 'Viewer',
};

export default function Members() {
  const { user, currentWorkspaceId, currentWorkspace, refresh } = useWorkspace();
  const { 
    canManageMembers, 
    canViewExecutiveDashboard,
    loading: permLoading 
  } = usePermissions();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [users, setUsers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [members, setMembers] = useState([]);
  const [workboards, setWorkboards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberWorkboards, setMemberWorkboards] = useState({});
  const [cleaningStale, setCleaningStale] = useState(false);
  const [normalizing, setNormalizing] = useState(false);
  const [boardAccessMember, setBoardAccessMember] = useState(null);
  const [allBoards, setAllBoards] = useState([]);
  const [hygiene, setHygiene] = useState({ activeBoards: 0, archivedBoards: 0, stale: 0, duplicates: 0 });

  const loadData = async () => {
    if (!currentWorkspaceId) return;
    setLoading(true);
    try {
      const [allUsers, invs, mems, boards] = await Promise.all([
        base44.entities.User.list().catch(() => []),
        base44.entities.Invitation.filter({ workspace: currentWorkspaceId }, '-created_date').catch(() => []),
        base44.entities.WorkspaceMember.filter({ workspace: currentWorkspaceId }, '-created_date').catch(() => []),
        base44.entities.Workboard.filter({ workspace: currentWorkspaceId }).catch(() => []),
      ]);
      setUsers(allUsers);
      setInvitations(invs);
      setMembers(mems);
      // Store only active, deduplicated boards in state
      const activeBoards = getActiveWorkboards(boards, currentWorkspaceId);
      setWorkboards(activeBoards);
      setAllBoards(boards.filter(b => b && b.id));

      const activeBoardIds = new Set(activeBoards.map(b => b.id));
      const archivedCount = getArchivedWorkboards(boards, currentWorkspaceId).length;
      // Load workboard memberships for each member
      const wbMemberships = {};
      const allWbMembers = [];
      for (const member of mems) {
        const wbMembers = await base44.entities.WorkboardMember.filter({ 
          workspace: currentWorkspaceId, 
          user: member.user 
        }).catch(() => []);
        allWbMembers.push(...wbMembers);
        // Only count memberships for active boards with active membership status
        wbMemberships[member.id] = wbMembers.filter(wm => activeBoardIds.has(wm.workboard) && wm.status !== 'removed');
      }
      setMemberWorkboards(wbMemberships);

      // Compute hygiene stats — stale = memberships for deleted/non-existent boards or non-existent users
      const validBoardIds = getValidBoardIds(boards, currentWorkspaceId);
      const userIds = new Set(allUsers.map(u => u.id));
      const staleCount = allWbMembers.filter(wm => !validBoardIds.has(wm.workboard) || !userIds.has(wm.user)).length;
      const seenPairs = new Set();
      let dupCount = 0;
      const sortedWm = [...allWbMembers].sort((a, b) => (a.created_date || '').localeCompare(b.created_date || ''));
      for (const wm of sortedWm) {
        const key = `${wm.user}::${wm.workboard}`;
        if (seenPairs.has(key)) { dupCount++; } else { seenPairs.add(key); }
      }
      setHygiene({ activeBoards: activeBoards.length, archivedBoards: archivedCount, stale: staleCount, duplicates: dupCount });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (canManageMembers) loadData(); }, [canManageMembers, currentWorkspaceId]);

  if (permLoading || loading) return <LoadingSpinner />;
  if (!canManageMembers) {
    return (
      <div className="py-16 text-center">
        <Shield className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">You don't have access to manage members.</p>
      </div>
    );
  }

  const handleInvite = async (email, accountRole, workspaceRole, department, invitationScope, workboards = []) => {
    try {
      const appRole = accountRole === 'system_admin' || accountRole === 'executive' || accountRole === 'manager' ? 'admin' : 'user';
      await base44.users.inviteUser(email, appRole);
      
      const expires = new Date();
      expires.setDate(expires.getDate() + 7);
      
      await base44.entities.Invitation.create({
        email, 
        invited_by: user.id, 
        invited_by_name: user.full_name,
        workspace: currentWorkspaceId, 
        workspace_name: currentWorkspace?.workspace_name,
        role: workspaceRole,
        account_role: accountRole,
        department, 
        invitation_scope: invitationScope,
        workboards: workboards.map(w => w.id),
        workboard_names: workboards.map(w => w.name),
        status: 'pending', 
        expires_date: expires.toISOString(),
      });
      
      await base44.entities.WorkspaceMember.create({
        workspace: currentWorkspaceId, 
        workspace_name: currentWorkspace?.workspace_name,
        user_email: email, 
        role: workspaceRole, 
        account_role: accountRole,
        department, 
        status: 'invited', 
        invited_by: user.id,
        access_type: invitationScope === 'workboards_only' ? 'selected_workboards' : 'all_workboards',
        accessible_workboards: invitationScope === 'workboards_only' ? workboards.map(w => w.id) : [],
      });
      
      logAudit(AUDIT_ACTIONS.INVITE_SENT, { 
        record_type: 'Invitation', 
        after_value: { email, account_role: accountRole, workspace_role: workspaceRole } 
      });
      
      toast({ 
        title: 'Invitation sent', 
        description: `Invited ${email} as ${ACCOUNT_ROLE_LABELS[accountRole]} / ${WORKSPACE_ROLE_LABELS[workspaceRole]}` 
      });
      setInviteOpen(false);
      loadData();
    } catch (e) {
      toast({ title: 'Failed to invite', description: e.message, variant: 'destructive' });
    }
  };

  const handleRevoke = async (inv) => {
    try {
      await base44.entities.Invitation.update(inv.id, { status: 'revoked' });
      logAudit(AUDIT_ACTIONS.RECORD_UPDATED, { record_type: 'Invitation', record_id: inv.id, after_value: { status: 'revoked' } });
      toast({ title: 'Invitation revoked' });
      loadData();
    } catch (e) { toast({ title: 'Failed to revoke', variant: 'destructive' }); }
  };

  const handleChangeWorkspaceRole = async (memberId, newRole) => {
    try {
      const member = members.find(m => m.id === memberId);
      const oldRole = member?.role;
      await base44.entities.WorkspaceMember.update(memberId, { role: newRole });
      logAudit(AUDIT_ACTIONS.ROLE_CHANGED, { 
        record_type: 'WorkspaceMember', 
        record_id: memberId, 
        before_value: { role: oldRole }, 
        after_value: { role: newRole } 
      });
      toast({ title: 'Workspace role updated' });
      loadData();
    } catch (e) { toast({ title: 'Failed to update role', variant: 'destructive' }); }
  };

  const handleChangeAccountRole = async (userId, newRole) => {
    try {
      const userRecord = users.find(u => u.id === userId);
      const oldRole = userRecord?.account_role;
      await base44.entities.User.update(userId, { account_role: newRole });
      logAudit(AUDIT_ACTIONS.ROLE_CHANGED, { 
        record_type: 'User', 
        record_id: userId, 
        before_value: { account_role: oldRole }, 
        after_value: { account_role: newRole } 
      });
      toast({ title: 'Account role updated' });
      loadData();
    } catch (e) { toast({ title: 'Failed to update account role', variant: 'destructive' }); }
  };

  const handleSuspendMember = async (member) => {
    try {
      await base44.entities.WorkspaceMember.update(member.id, { status: 'suspended' });
      logAudit(AUDIT_ACTIONS.USER_DISABLED, { record_type: 'WorkspaceMember', record_id: member.id });
      toast({ title: 'Member suspended' });
      loadData();
    } catch (e) { toast({ title: 'Failed to suspend', variant: 'destructive' }); }
  };

  const handleRemoveMember = async (member) => {
    try {
      await base44.entities.WorkspaceMember.update(member.id, { status: 'removed' });
      logAudit(AUDIT_ACTIONS.USER_DISABLED, { record_type: 'WorkspaceMember', record_id: member.id, after_value: { status: 'removed' } });
      toast({ title: 'Access removed' });
      loadData();
    } catch (e) { toast({ title: 'Failed to remove', variant: 'destructive' }); }
  };

  const handleReactivateMember = async (member) => {
    try {
      await base44.entities.WorkspaceMember.update(member.id, { status: 'active' });
      logAudit(AUDIT_ACTIONS.USER_ENABLED, { record_type: 'WorkspaceMember', record_id: member.id });
      toast({ title: 'Member reactivated' });
      loadData();
    } catch (e) { toast({ title: 'Failed to reactivate', variant: 'destructive' }); }
  };

  const handleRepairBoardData = async () => {
    const ok = await confirm({
      title: 'Repair Board Data?',
      description: 'Repairs old board records, fixes archive/delete flags, removes stale memberships, and refreshes board counts.',
      confirmLabel: 'Repair',
      variant: 'warning',
    });
    if (!ok) return;
    setNormalizing(true);
    try {
      // 1. Fetch all boards for workspace
      const boards = await base44.entities.Workboard.filter({ workspace: currentWorkspaceId }).catch(() => []);

      // 2. Repair board lifecycle flags
      let normalizedCount = 0;
      for (const b of boards) {
        const updates = {};
        // set status=deleted for records with deleted_date
        if (b.deleted_date && b.status !== 'deleted') {
          updates.status = 'deleted';
        }
        // set archived=true for status archived
        if (b.status === 'archived' && b.archived !== true) {
          updates.archived = true;
          if (!b.archived_date) updates.archived_date = new Date().toISOString();
        }
        // set status=archived for archived=true (unless already deleted)
        if (b.archived === true && b.status !== 'archived' && b.status !== 'deleted') {
          updates.status = 'archived';
          if (!b.archived_date) updates.archived_date = new Date().toISOString();
        }
        if (Object.keys(updates).length > 0) {
          await base44.entities.Workboard.update(b.id, updates);
          normalizedCount++;
        }
      }

      // 3. Fetch all workboard members
      const [allWbMembers, allUsers] = await Promise.all([
        base44.entities.WorkboardMember.filter({ workspace: currentWorkspaceId }),
        base44.entities.User.list().catch(() => []),
      ]);

      const validBoardIds = getValidBoardIds(boards, currentWorkspaceId);
      const userIds = new Set(allUsers.map(u => u.id));

      // 4. Remove memberships for deleted/non-existent boards or non-existent users
      const stale = allWbMembers.filter(wm =>
        !validBoardIds.has(wm.workboard) || !userIds.has(wm.user)
      );

      // 5. Remove duplicate memberships (same user + same board)
      const seenPairs = new Set();
      const duplicates = [];
      const sorted = [...allWbMembers].sort((a, b) => (a.created_date || '').localeCompare(b.created_date || ''));
      for (const wm of sorted) {
        const key = `${wm.user}::${wm.workboard}`;
        if (seenPairs.has(key)) {
          duplicates.push(wm);
        } else {
          seenPairs.add(key);
        }
      }

      const toDelete = [...stale, ...duplicates];
      const uniqueToDelete = [...new Map(toDelete.map(wm => [wm.id, wm])).values()];

      for (const wm of uniqueToDelete) {
        await base44.entities.WorkboardMember.delete(wm.id);
      }

      logAudit(AUDIT_ACTIONS.RECORD_UPDATED, {
        record_type: 'Workboard',
        after_value: { boardsNormalized: normalizedCount, membershipsRemoved: uniqueToDelete.length },
      });

      toast({
        title: 'Board data repaired',
        description: `${normalizedCount} board(s) repaired, ${uniqueToDelete.length} membership(s) removed`,
        duration: 4000,
      });
      await loadData();
      window.dispatchEvent(new Event('workboards-changed'));
    } catch (e) {
      toast({ title: 'Failed to repair board data', description: e.message, variant: 'destructive' });
    } finally {
      setNormalizing(false);
    }
  };

  const handleCleanStaleMemberships = async () => {
    const ok = await confirm({
      title: 'Clean stale memberships?',
      description: 'This will remove board memberships where the related board no longer exists, is archived, is a template, or is duplicated.',
      confirmLabel: 'Clean Memberships',
      variant: 'warning',
    });
    if (!ok) return;
    setCleaningStale(true);
    try {
      const [allWbMembers, allUsers] = await Promise.all([
        base44.entities.WorkboardMember.filter({ workspace: currentWorkspaceId }),
        base44.entities.User.list().catch(() => []),
      ]);
      const validBoardIds = getValidBoardIds(workboards, currentWorkspaceId);
      const userIds = new Set(allUsers.map(u => u.id));

      // Identify stale: board doesn't exist, is deleted, or user doesn't exist
      const stale = allWbMembers.filter(wm =>
        !validBoardIds.has(wm.workboard) || !userIds.has(wm.user)
      );

      // Identify duplicates: same user + same board appearing more than once
      const seenPairs = new Set();
      const duplicates = [];
      const sorted = [...allWbMembers].sort((a, b) => (a.created_date || '').localeCompare(b.created_date || ''));
      for (const wm of sorted) {
        const key = `${wm.user}::${wm.workboard}`;
        if (seenPairs.has(key)) {
          duplicates.push(wm);
        } else {
          seenPairs.add(key);
        }
      }

      const toDelete = [...stale, ...duplicates];
      const uniqueToDelete = [...new Map(toDelete.map(wm => [wm.id, wm])).values()];

      if (uniqueToDelete.length === 0) {
        toast({ title: 'No stale memberships found', duration: 3000 });
        return;
      }
      for (const wm of uniqueToDelete) {
        await base44.entities.WorkboardMember.delete(wm.id);
      }
      logAudit(AUDIT_ACTIONS.RECORD_DELETED, { record_type: 'WorkboardMember', count: uniqueToDelete.length });
      toast({ title: `Removed ${uniqueToDelete.length} stale/duplicate membership${uniqueToDelete.length > 1 ? 's' : ''}`, duration: 4000 });
      await loadData();
      // Trigger a sidebar refresh so Recent boards update
      window.dispatchEvent(new Event('workboards-changed'));
    } catch (e) {
      toast({ title: 'Failed to clean stale memberships', description: e.message, variant: 'destructive' });
    } finally {
      setCleaningStale(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Members" subtitle="Manage members, roles, and access">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRepairBoardData} disabled={normalizing} title="Repairs old board records, fixes archive/delete flags, removes stale memberships, and refreshes board counts.">
            <Brush className="w-4 h-4 mr-2" /> {normalizing ? 'Repairing...' : 'Repair Board Data'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleCleanStaleMemberships} disabled={cleaningStale}>
            <Brush className="w-4 h-4 mr-2" /> {cleaningStale ? 'Cleaning...' : 'Clean Stale Memberships'}
          </Button>
          <Button onClick={() => setInviteOpen(true)} size="sm">
            <UserPlus className="w-4 h-4 mr-2" /> Invite Member
          </Button>
        </div>
      </PageHeader>

      {canManageMembers && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card><CardContent className="p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Active Boards</p>
            <p className="text-xl font-bold text-green-600 dark:text-green-400">{hygiene.activeBoards}</p>
          </CardContent></Card>
          <Card><CardContent className="p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Archived Boards</p>
            <p className="text-xl font-bold text-muted-foreground">{hygiene.archivedBoards}</p>
          </CardContent></Card>
          <Card><CardContent className="p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Stale Memberships</p>
            <p className={`text-xl font-bold ${hygiene.stale > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>{hygiene.stale}</p>
          </CardContent></Card>
          <Card><CardContent className="p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Duplicate Memberships</p>
            <p className={`text-xl font-bold ${hygiene.duplicates > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>{hygiene.duplicates}</p>
          </CardContent></Card>
        </div>
      )}

      <InviteUserDialog 
        open={inviteOpen} 
        onOpenChange={setInviteOpen} 
        onInvite={handleInvite}
        workboards={workboards}
      />

      <Tabs defaultValue="members">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="members">Workspace Members ({members.length})</TabsTrigger>
          <TabsTrigger value="invitations">Invitations ({invitations.filter(i => i.status === 'pending').length})</TabsTrigger>
          <TabsTrigger value="users">All Users ({users.length})</TabsTrigger>
          <TabsTrigger value="archived">Archived Boards</TabsTrigger>
          <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
        </TabsList>

        {/* Workspace Members */}
        <TabsContent value="members">
          <Card><CardContent className="p-0">
            {members.length === 0 ? (
              <EmptyRow message="No workspace members yet" />
            ) : (
              <div className="divide-y">
                {members.map(m => {
                  const RoleIcon = WORKSPACE_ROLE_ICONS[m.role] || Check;
                  const wbMemberships = memberWorkboards[m.id] || [];
                  return (
                    <div key={m.id} className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary shrink-0">
                        {m.user_name?.split(' ').map(n => n[0]).slice(0, 2).join('') || m.user_email?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{m.user_name || m.user_email || 'Unknown'}</p>
                          <Badge variant="outline" className="text-[10px]">
                            <RoleIcon className="w-2.5 h-2.5 mr-1" />
                            {WORKSPACE_ROLE_LABELS[m.role] || m.role}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          {m.user_email && <span className="truncate max-w-[200px]">{m.user_email}</span>}
                          {m.department && (
                            <span className="flex items-center gap-1">
                              <Building2 className="w-2.5 h-2.5" /> {m.department}
                            </span>
                          )}
                          {m.last_active_date && (
                            <span className="flex items-center gap-1">
                              <CalendarDays className="w-2.5 h-2.5" /> 
                              {new Date(m.last_active_date).toLocaleDateString()}
                            </span>
                          )}
                          {wbMemberships.length > 0 && (
                            <span className="flex items-center gap-1">
                              <LayoutGrid className="w-2.5 h-2.5" />
                              {wbMemberships.length} board{wbMemberships.length > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                      {m.status === 'active' ? (
                        <div className="flex items-center gap-2">
                           <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setBoardAccessMember(m)}>
                             <LayoutGrid className="w-3.5 h-3.5 mr-1.5" />
                             Board Access
                           </Button>
                           <Select defaultValue={m.role} onValueChange={(v) => handleChangeWorkspaceRole(m.id, v)}>
                             <SelectTrigger className="w-40 h-8 text-xs">
                               <SelectValue placeholder="Workspace Role" />
                             </SelectTrigger>
                             <SelectContent>
                               <SelectItem value="workspace_owner">Workspace Owner</SelectItem>
                               <SelectItem value="workspace_manager">Workspace Manager</SelectItem>
                               <SelectItem value="workspace_member">Workspace Member</SelectItem>
                               <SelectItem value="workspace_viewer">Workspace Viewer</SelectItem>
                               <SelectItem value="workspace_observer">Workspace Observer</SelectItem>
                             </SelectContent>
                           </Select>
                           {m.role !== 'workspace_owner' && (
                             <>
                               <Button variant="ghost" size="icon" onClick={() => handleSuspendMember(m)} title="Suspend" className="text-amber-600 hover:text-amber-700">
                                 <Ban className="w-4 h-4" />
                               </Button>
                               <Button variant="ghost" size="icon" onClick={() => handleRemoveMember(m)} title="Remove Access" className="text-destructive hover:text-destructive">
                                 <Trash2 className="w-4 h-4" />
                               </Button>
                             </>
                           )}
                         </div>
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

        {/* Invitations */}
        <TabsContent value="invitations">
          <Card><CardContent className="p-0">
            {invitations.length === 0 ? (
              <EmptyRow message="No invitations sent" />
            ) : (
              <div className="divide-y">
                {invitations.map(inv => (
                  <div key={inv.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                      <Mail className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{inv.email}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span>By {inv.invited_by_name}</span>
                        {inv.account_role && (
                          <Badge className={`text-[10px] ${ACCOUNT_ROLE_COLORS[inv.account_role]}`}>
                            {ACCOUNT_ROLE_LABELS[inv.account_role]}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-[10px]">
                          {WORKSPACE_ROLE_LABELS[inv.role] || inv.role}
                        </Badge>
                        {inv.invitation_scope === 'workboards_only' && inv.workboard_names?.length > 0 && (
                          <span className="text-[10px] text-muted-foreground">
                            · {inv.workboard_names.length} board{inv.workboard_names.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
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

        {/* All Users */}
        <TabsContent value="users">
          <Card><CardContent className="p-0">
            {users.length === 0 ? (
              <EmptyRow message="No users found" />
            ) : (
              <div className="divide-y">
                {users.map(u => (
                  <div key={u.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary shrink-0">
                      {u.full_name?.split(' ').map(n => n[0]).slice(0, 2).join('') || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{u.full_name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {u.account_role && (
                        <Badge className={`text-[10px] ${ACCOUNT_ROLE_COLORS[u.account_role]}`}>
                          {ACCOUNT_ROLE_LABELS[u.account_role]}
                        </Badge>
                      )}
                      {u.disabled && <Badge variant="destructive" className="text-[10px]">Disabled</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent></Card>
        </TabsContent>

        {/* Archived Boards */}
        <TabsContent value="archived">
          <ArchivedBoards workspaceId={currentWorkspaceId} onRefresh={loadData} />
        </TabsContent>

        {/* Roles & Permissions */}
        <TabsContent value="roles">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-3">Account Roles</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(ACCOUNT_ROLE_PERMISSIONS).map(([key, role]) => (
                  <Card key={key}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Badge className={ACCOUNT_ROLE_COLORS[key]}>{role.label}</Badge>
                      </CardTitle>
                      <CardDescription className="text-xs">Level {role.level} access</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <ul className="space-y-1.5">
                        {role.canViewAllWorkspaces && <li className="text-xs text-muted-foreground">• View all workspaces</li>}
                        {role.canViewAllWorkboards && <li className="text-xs text-muted-foreground">• View all workboards</li>}
                        {role.canCreateOrganizationAutomations && <li className="text-xs text-muted-foreground">• Organization automations</li>}
                        {role.canCreateWorkspaceAutomations && <li className="text-xs text-muted-foreground">• Workspace automations</li>}
                        {role.canCreateWorkboardAutomations && <li className="text-xs text-muted-foreground">• Workboard automations</li>}
                        {role.canManagePermissions && <li className="text-xs text-muted-foreground">• Manage permissions</li>}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">Workspace Roles</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(WORKSPACE_ROLE_PERMISSIONS).map(([key, role]) => (
                  <Card key={key}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Badge variant="outline">{role.label}</Badge>
                      </CardTitle>
                      <CardDescription className="text-xs">Level {role.level} workspace access</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <ul className="space-y-1.5">
                        {role.canManageWorkspace && <li className="text-xs text-muted-foreground">• Manage workspace</li>}
                        {role.canInviteUsers && <li className="text-xs text-muted-foreground">• Invite users</li>}
                        {role.canCreateWorkboards && <li className="text-xs text-muted-foreground">• Create workboards</li>}
                        {role.canManageWorkspaceAutomations && <li className="text-xs text-muted-foreground">• Workspace automations</li>}
                        {role.canAccessAllWorkboards && <li className="text-xs text-muted-foreground">• Access all workboards</li>}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <BoardAccessDrawer
        member={boardAccessMember}
        workboards={allBoards}
        workspaceId={currentWorkspaceId}
        isOpen={!!boardAccessMember}
        onClose={() => setBoardAccessMember(null)}
        onRefresh={loadData}
      />
      </div>
      );
      }

function EmptyRow({ message }) {
  return <div className="py-10 text-center text-sm text-muted-foreground">{message}</div>;
}