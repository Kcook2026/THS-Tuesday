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
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Users, Search, MoreHorizontal, Shield, Trash2, UserPlus } from 'lucide-react';
import { getUserInitials } from '@/lib/userHelpers';

const ROLE_CONFIG = {
  workboard_owner: { label: 'Owner', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
  workboard_editor: { label: 'Editor', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  workboard_contributor: { label: 'Member', color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  workboard_viewer: { label: 'Viewer', color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300' },
};

export default function MembersDrawer({ workboardId, wb }) {
  const { user, currentWorkspaceId } = useWorkspace();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [workspaceUsers, setWorkspaceUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [inviteRole, setInviteRole] = useState('workboard_contributor');
  const [memberToDelete, setMemberToDelete] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
      
      // Ensure creator is added as owner if not already a member
      if (wb?.created_by) {
        const allCreatorMembers = await base44.entities.WorkboardMember.filter({
          workboard: workboardId,
          workspace: currentWorkspaceId,
          user: wb.created_by,
        });
        if (!allCreatorMembers || allCreatorMembers.length === 0) {
          try {
            const creatorUser = await base44.entities.User.get(wb.created_by);
            const creatorMember = await base44.entities.WorkboardMember.create({
              workspace: currentWorkspaceId,
              workboard: workboardId,
              workboard_name: wb?.name,
              user: wb.created_by,
              user_name: creatorUser?.full_name || creatorUser?.email || 'Unassigned',
              user_email: creatorUser?.email || '',
              role: 'workboard_owner',
              status: 'active',
              added_by: wb.created_by,
              joined_date: new Date().toISOString().split('T')[0],
            });
            setMembers(prev => [...prev, creatorMember]);
          } catch (err) {
            console.error('Failed to add creator as member:', err);
          }
        }
      }
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
      setWorkspaceUsers(wsMembers.filter(m => m.user && (m.user_name || m.user_email)));
    } catch (error) {
      console.error('Error loading workspace users:', error);
      setWorkspaceUsers([]);
    }
  };

  useEffect(() => {
    loadMembers();
    loadWorkspaceUsers();
  }, [workboardId, currentWorkspaceId, open]);

  const handleAddMember = async () => {
    if (!selectedUserId || !workboardId) return;
    try {
      const userToAdd = workspaceUsers.find(u => u.user === selectedUserId);
      if (!userToAdd) return;
      
      const existingMember = members.find(m => m.user === selectedUserId);
      if (existingMember) {
        toast({ title: 'Already a member', description: 'This user is already on the workboard', variant: 'destructive', duration: 4000 });
        return;
      }
      
      await base44.entities.WorkboardMember.create({
        workspace: currentWorkspaceId,
        workboard: workboardId,
        workboard_name: wb?.name,
        user: userToAdd.user,
        user_name: userToAdd.user_name || userToAdd.user_email || 'Unassigned',
        user_email: userToAdd.user_email || '',
        role: inviteRole,
        status: 'active',
        added_by: user.id,
        joined_date: new Date().toISOString().split('T')[0],
      });
      toast({ title: 'Member added', description: `${userToAdd.user_name || 'User'} added to workboard`, duration: 2000 });
      setSelectedUserId('');
      setInviteRole('workboard_contributor');
      setSearchQuery('');
      loadMembers();
    } catch (error) {
      console.error('Error adding member:', error);
      toast({ title: 'Failed to add member', description: error.message, variant: 'destructive', duration: 5000 });
    }
  };

  const handleChangeRole = async (memberId, newRole) => {
    try {
      await base44.entities.WorkboardMember.update(memberId, { role: newRole });
      toast({ title: 'Role updated', duration: 2000 });
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m));
    } catch (error) {
      console.error('Error updating role:', error);
      toast({ title: 'Failed to update role', description: error.message, variant: 'destructive', duration: 5000 });
    }
  };

  const confirmRemove = (member) => {
    setMemberToDelete(member);
    setShowDeleteConfirm(true);
  };

  const handleRemove = async () => {
    if (!memberToDelete) return;
    const owners = members.filter(m => m.role === 'workboard_owner');
    if (memberToDelete.role === 'workboard_owner' && owners.length <= 1) {
      toast({ title: 'Cannot remove owner', description: 'The board must have at least one owner', variant: 'destructive', duration: 5000 });
      setShowDeleteConfirm(false);
      setMemberToDelete(null);
      return;
    }
    try {
      await base44.entities.WorkboardMember.update(memberToDelete.id, { status: 'removed' });
      toast({ title: 'Member removed', duration: 2000 });
      setMembers(prev => prev.filter(m => m.id !== memberToDelete.id));
      setShowDeleteConfirm(false);
      setMemberToDelete(null);
    } catch (error) {
      console.error('Error removing member:', error);
      toast({ title: 'Failed to remove member', description: error.message, variant: 'destructive', duration: 5000 });
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
                      placeholder="Search by name or username..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Select User</Label>
                    <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a user" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredUsers.map(u => (
                          <SelectItem key={u.user} value={u.user}>
                            {u.user_name || u.user_email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Role</Label>
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
                    const initial = getUserInitials(member);
                    return (
                      <div key={member.id} className="flex items-center gap-3 p-3 border rounded-lg">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary shrink-0">
                          {initial}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{member.user_name || member.user_email || 'Unassigned'}</p>
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
                            {member.user !== user.id && (
                              <DropdownMenuItem 
                                onClick={() => confirmRemove(member)}
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

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {memberToDelete?.user_name || 'this user'} from this workboard?
              They will lose access to all board content.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}