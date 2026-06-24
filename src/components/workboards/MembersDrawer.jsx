import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useWorkspace } from '@/lib/WorkspaceContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { Users, Search, MoreHorizontal, Shield, Trash2, UserPlus } from 'lucide-react';

const ROLE_CONFIG = {
  workboard_owner: { label: 'Owner', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
  workboard_editor: { label: 'Editor', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  workboard_contributor: { label: 'Member', color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  workboard_viewer: { label: 'Viewer', color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300' },
};

export default function MembersDrawer({ workboardId, wb, trigger }) {
  const { user, currentWorkspaceId, currentWorkspace } = useWorkspace();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [workspaceUsers, setWorkspaceUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [inviteRole, setInviteRole] = useState('workboard_contributor');

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
      setWorkspaceUsers(wsMembers.filter(m => m.user && m.user_name));
    } catch (error) {
      console.error('Error loading workspace users:', error);
      setWorkspaceUsers([]);
    }
  };

  useEffect(() => {
    if (open) {
      loadMembers();
      loadWorkspaceUsers();
    }
  }, [open, workboardId, currentWorkspaceId]);

  const handleAddMember = async () => {
    if (!selectedUserId || !workboardId) return;
    try {
      const userToAdd = workspaceUsers.find(u => u.user === selectedUserId);
      if (!userToAdd) return;
      
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
  }).filter(u => !members.find(m => m.user === u.user));

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Users className="w-4 h-4 mr-1.5" />
        Members ({members.length})
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>Workboard Access</SheetTitle>
            <SheetDescription>
              Manage who can access this workboard and their roles
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-6 space-y-6">
            {/* Add Member Section */}
            <div className="p-4 border rounded-lg bg-muted/50">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                Add Member
              </h3>
              <div className="space-y-3">
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
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Select User</Label>
                    <select
                      className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      value={selectedUserId}
                      onChange={e => setSelectedUserId(e.target.value)}
                    >
                      <option value="">Choose a user</option>
                      {filteredUsers.map(u => (
                        <option key={u.user} value={u.user}>
                          {u.user_name || u.user_email}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Role</Label>
                    <select
                      className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      value={inviteRole}
                      onChange={e => setInviteRole(e.target.value)}
                    >
                      <option value="workboard_owner">Owner</option>
                      <option value="workboard_editor">Editor</option>
                      <option value="workboard_contributor">Member</option>
                      <option value="workboard_viewer">Viewer</option>
                    </select>
                  </div>
                </div>
                <Button 
                  onClick={handleAddMember} 
                  disabled={!selectedUserId}
                  className="w-full"
                >
                  Add to Workboard
                </Button>
              </div>
            </div>

            {/* Members List */}
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Members ({members.length})
              </h3>
              {loading ? (
                <div className="text-center text-sm text-muted-foreground py-4">Loading...</div>
              ) : members.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-4">No members yet</div>
              ) : (
                <div className="space-y-2">
                  {members.map(member => {
                    const roleConfig = ROLE_CONFIG[member.role] || ROLE_CONFIG.workboard_contributor;
                    const initial = (member.user_name || member.user_email || 'U').charAt(0).toUpperCase();
                    return (
                      <div key={member.id} className="flex items-center gap-3 p-3 border rounded-lg">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary shrink-0">
                          {initial}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{member.user_name || member.user_email}</p>
                          <p className="text-xs text-muted-foreground">{member.user_email}</p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleChangeRole(member.id, 'workboard_owner')}>
                              Owner
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleChangeRole(member.id, 'workboard_editor')}>
                              Editor
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleChangeRole(member.id, 'workboard_contributor')}>
                              Member
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleChangeRole(member.id, 'workboard_viewer')}>
                              Viewer
                            </DropdownMenuItem>
                            {member.role !== 'workboard_owner' && member.user !== user.id && (
                              <DropdownMenuItem 
                                onClick={() => handleRemove(member.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="w-3.5 h-3.5 mr-2" />
                                Remove
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Badge className={`text-[10px] ${roleConfig.color}`}>
                          {roleConfig.label}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}