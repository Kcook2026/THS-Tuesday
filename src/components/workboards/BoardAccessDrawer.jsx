import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { Trash2, Plus, LayoutGrid } from 'lucide-react';

const WORKBOARD_ROLE_LABELS = {
  workboard_owner: 'Board Owner',
  workboard_editor: 'Board Editor',
  workboard_contributor: 'Contributor',
  assigned_contributor: 'Assigned',
  workboard_viewer: 'Viewer',
};

/**
 * Drawer for managing a workspace member's board access.
 * Shows all active boards, the member's role on each board,
 * and allows adding/removing/changing roles.
 */
export default function BoardAccessDrawer({ member, workboards = [], isOpen, onClose, onRefresh }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [boardMemberships, setBoardMemberships] = useState([]);
  const [addingBoard, setAddingBoard] = useState(null);
  const [addingRole, setAddingRole] = useState('workboard_contributor');

  useEffect(() => {
    if (!member || !isOpen) return;
    loadMemberships();
  }, [member, isOpen]);

  const loadMemberships = async () => {
    if (!member) return;
    setLoading(true);
    try {
      const mems = await base44.entities.WorkboardMember.filter({
        workspace: member.workspace,
        user: member.user,
      }).catch(() => []);
      setBoardMemberships(mems);
    } catch (e) {
      console.error('Error loading memberships:', e);
    } finally {
      setLoading(false);
    }
  };

  // Only show active, non-archived boards in current workspace
  const activeBoards = workboards.filter(b => !b.archived && b.status !== 'archived' && b.status !== 'template');

  const getMembershipForBoard = (boardId) => {
    return boardMemberships.find(wm => wm.workboard === boardId);
  };

  const boardsWithAccess = activeBoards.filter(b => getMembershipForBoard(b.id));
  const boardsWithoutAccess = activeBoards.filter(b => !getMembershipForBoard(b.id));

  const handleChangeRole = async (membershipId, newRole) => {
    try {
      await base44.entities.WorkboardMember.update(membershipId, { role: newRole });
      toast({ title: 'Board role updated', duration: 2000 });
      loadMemberships();
      onRefresh?.();
    } catch (e) {
      toast({ title: 'Failed to update role', description: e.message, variant: 'destructive' });
    }
  };

  const handleRemoveAccess = async (membership) => {
    if (!confirm(`Remove access to "${membership.workboard_name}"?`)) return;
    try {
      await base44.entities.WorkboardMember.delete(membership.id);
      toast({ title: 'Board access removed', duration: 2000 });
      loadMemberships();
      onRefresh?.();
    } catch (e) {
      toast({ title: 'Failed to remove access', description: e.message, variant: 'destructive' });
    }
  };

  const handleAddAccess = async (boardId) => {
    if (!member) return;
    try {
      const board = activeBoards.find(b => b.id === boardId);
      await base44.entities.WorkboardMember.create({
        workspace: member.workspace,
        workboard: boardId,
        workboard_name: board?.name,
        user: member.user,
        user_name: member.user_name,
        user_email: member.user_email,
        role: addingRole,
        status: 'active',
        added_by: member.invited_by,
      });
      toast({ title: 'Board access granted', duration: 2000 });
      setAddingBoard(null);
      loadMemberships();
      onRefresh?.();
    } catch (e) {
      toast({ title: 'Failed to add access', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[500px] overflow-y-auto">
        <SheetHeader className="border-b pb-4 mb-4">
          <SheetTitle>Board Access — {member?.user_name || member?.user_email || 'Member'}</SheetTitle>
          <SheetDescription>
            Manage which boards this member can access and their role on each.
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="text-center py-8 text-sm text-muted-foreground">Loading...</div>
        ) : (
          <div className="space-y-6">
            {/* Boards with access */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <LayoutGrid className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Active Board Access ({boardsWithAccess.length})</h3>
              </div>
              {boardsWithAccess.length === 0 ? (
                <p className="text-xs text-muted-foreground px-1">Not a member of any active board.</p>
              ) : (
                <div className="space-y-2">
                  {boardsWithAccess.map(board => {
                    const membership = getMembershipForBoard(board.id);
                    return (
                      <div key={board.id} className="flex items-center gap-2 p-2 border rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{board.name}</p>
                          <Badge variant="outline" className="text-[10px] mt-0.5">{board.status}</Badge>
                        </div>
                        <Select
                          value={membership.role}
                          onValueChange={(v) => handleChangeRole(membership.id, v)}
                        >
                          <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(WORKBOARD_ROLE_LABELS).map(([val, label]) => (
                              <SelectItem key={val} value={val}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleRemoveAccess(membership)}
                          title="Remove access"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Add access to more boards */}
            {boardsWithoutAccess.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-3">Add to More Boards</h3>
                <div className="space-y-2">
                  {boardsWithoutAccess.map(board => (
                    <div key={board.id} className="flex items-center gap-2 p-2 border border-dashed rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{board.name}</p>
                      </div>
                      <Select
                        value={addingBoard === board.id ? addingRole : 'workboard_contributor'}
                        onValueChange={setAddingRole}
                      >
                        <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(WORKBOARD_ROLE_LABELS).map(([val, label]) => (
                            <SelectItem key={val} value={val}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAddAccess(board.id)}
                        title="Add to this board"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" /> Add
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}