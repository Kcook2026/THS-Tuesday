import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useWorkspace } from '@/lib/WorkspaceContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { UserPlus, Shield, Trash2, Search } from 'lucide-react';

const ROLE_CONFIG = {
  workboard_owner: { label: 'Owner', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
  workboard_editor: { label: 'Editor', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  workboard_contributor: { label: 'Member', color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  workboard_viewer: { label: 'Viewer', color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300' },
};

export default function WorkboardMembers({ workboardId, wb }) {
  const { user, currentWorkspaceId, currentWorkspace } = useWorkspace();
  const { toast } = useToast();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [inviteRole, setInviteRole] = useState('workboard_contributor');
  const [workspaceUsers, setWorkspaceUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const loadMembers = async () => {
    if (!workboardId || !currentWorkspaceId) return;
    setLoading(true);
    try {
      const wbMembers = await base44.entities.WorkboardMember.filter({
        workboard: workboardId,
        workspace: currentWorkspaceId,
        status: 'active',
      });
      setMembers(wbMembers);
    } catch (error) {
      console.error('Error loading members:', error);
      toast({ title: 'Error loading members', description: error.message, variant: 'destructive', duration: 6000 });
    } finally {
      setLoading(false);
    }
  };
  
  const loadWorkspaceUsers = async () => {
    if (!currentWorkspaceId) return;
    try {
      const wsMembers = await base44.entities.WorkspaceMember.filter({
        workspace: currentWorkspaceId,
        status: 'active',
      });
      // Use WorkspaceMember records directly (they already have user_name and user_email)
      setWorkspaceUsers(wsMembers.filter(m => m.user && m.user_name));
    } catch (error) {
      console.error('Error loading workspace users:', error);
      setWorkspaceUsers([]);
    }
  };

  useEffect(() => {
    loadMembers();
    loadWorkspaceUsers();
  }, [workboardId, currentWorkspaceId]);

  const handleAddMember = async () => {
    if (!selectedUserId || !workboardId) return;
    try {
      const userToAdd = workspaceUsers.find(u => u.user === selectedUserId);
      if (!userToAdd) return;
      
      // Check if user is already a member
      const existingMember = members.find(m => m.user === selectedUserId);
      if (existingMember) {
        toast({ title: 'User already a member', variant: 'destructive', duration: 6000 });
        return;
      }
      
      await base44.entities.WorkboardMember.create({
        workspace: currentWorkspaceId,
        workspace_name: currentWorkspace?.workspace_name,
        workboard: workboardId,
        workboard_name: wb?.name,
        user: userToAdd.user,
        user_name: userToAdd.user_name,
        user_email: userToAdd.user_email,
        role: inviteRole,
        status: 'active',
        added_by: user.id,
        joined_date: new Date().toISOString().split('T')[0],
      });
      toast({ title: 'Member added', description: `${userToAdd.user_name} added to workboard`, duration: 3000 });
      setSelectedUserId('');
      setInviteRole('workboard_contributor');
      setInviteOpen(false);
      setSearchQuery('');
      loadMembers();
    } catch (error) {
      console.error('Error adding member:', error);
      toast({ title: 'Failed to add member', description: error.message, variant: 'destructive', duration: 6000 });
    }
  };

  const handleChangeRole = async (memberId, newRole) => {
    try {
      await base44.entities.WorkboardMember.update(memberId, { role: newRole });
      toast({ title: 'Role updated', duration: 3000 });
      loadMembers();
    } catch (error) {
      console.error('Error updating role:', error);
      toast({ title: 'Failed to update role', description: error.message, variant: 'destructive', duration: 6000 });
    }
  };

  const handleRemove = async (memberId) => {
    try {
      await base44.entities.WorkboardMember.update(memberId, { status: 'removed' });
      toast({ title: 'Member removed', duration: 3000 });
      loadMembers();
    } catch (error) {
      console.error('Error removing member:', error);
      toast({ title: 'Failed to remove', description: error.message, variant: 'destructive', duration: 6000 });
    }
  };
  
  const filteredUsers = workspaceUsers.filter(u => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (u.user_name?.toLowerCase().includes(query) || u.user_email?.toLowerCase().includes(query));
  }).filter(u => !members.find(m => m.user === u.user)); // Exclude existing members

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Workboard Members</h3>
        </div>
        <Button size="sm" onClick={() => setInviteOpen(true)}>
          <UserPlus className="w-4 h-4 mr-1.5" />
          Invite Member
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading members...</div>
          ) : members.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No members yet</div>
          ) : (
            <div className="divide-y">
              {members.map(member => {
                const roleConfig = ROLE_CONFIG[member.role] || ROLE_CONFIG.workboard_contributor;
                const roleLabel = roleConfig.label;
                const initial = (member.user_name || member.user_email || 'U').charAt(0).toUpperCase();
                return (
                  <div key={member.id} className="flex items-center gap-3 p-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary shrink-0">
                      {initial}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{member.user_name || member.user_email}</p>
                      <p className="text-xs text-muted-foreground">{member.user_email}</p>
                    </div>
                    <Badge className={`text-[10px] ${roleConfig.color}`}>
                      {roleLabel}
                    </Badge>
                    {member.role !== 'workboard_owner' && member.user !== user.id && (
                      <Button variant="ghost" size="icon" onClick={() => handleRemove(member.id)} className="text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Workboard Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="search-user">Search Users</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="search-user"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div>
              <Label>Select User</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a user" />
                </SelectTrigger>
                <SelectContent>
                  {filteredUsers.length === 0 ? (
                    <SelectItem disabled value="none">No available users</SelectItem>
                  ) : (
                    filteredUsers.map(u => (
                      <SelectItem key={u.user} value={u.user}>
                        {u.user_name || u.user_email}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Workboard Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="workboard_owner">Owner</SelectItem>
                  <SelectItem value="workboard_editor">Editor</SelectItem>
                  <SelectItem value="workboard_contributor">Member</SelectItem>
                  <SelectItem value="workboard_viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setInviteOpen(false); setSearchQuery(''); setSelectedUserId(''); }}>Cancel</Button>
            <Button onClick={handleAddMember} disabled={!selectedUserId}>Add Member</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}