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
import { UserPlus, Shield, Trash2 } from 'lucide-react';

const ROLE_CONFIG = {
  owner: { label: 'Owner', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
  editor: { label: 'Editor', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  member: { label: 'Member', color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  viewer: { label: 'Viewer', color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300' },
};

export default function WorkboardMembers({ workboardId, wb }) {
  const { user, currentWorkspaceId, currentWorkspace } = useWorkspace();
  const { toast } = useToast();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');

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
      toast({ title: 'Error loading members', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, [workboardId, currentWorkspaceId]);

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !workboardId) return;
    try {
      await base44.entities.WorkboardMember.create({
        workspace: currentWorkspaceId,
        workspace_name: currentWorkspace?.workspace_name,
        workboard: workboardId,
        workboard_name: wb?.name,
        user_email: inviteEmail.trim(),
        role: inviteRole,
        status: 'invited',
        added_by: user.id,
      });
      toast({ title: 'Invitation sent', description: `Invited ${inviteEmail.trim()} to workboard` });
      setInviteEmail('');
      setInviteRole('member');
      setInviteOpen(false);
      loadMembers();
    } catch (error) {
      toast({ title: 'Failed to invite', description: error.message, variant: 'destructive' });
    }
  };

  const handleChangeRole = async (memberId, newRole) => {
    try {
      await base44.entities.WorkboardMember.update(memberId, { role: newRole });
      toast({ title: 'Role updated' });
      loadMembers();
    } catch (error) {
      toast({ title: 'Failed to update role', description: error.message, variant: 'destructive' });
    }
  };

  const handleRemove = async (memberId) => {
    try {
      await base44.entities.WorkboardMember.update(memberId, { status: 'removed' });
      toast({ title: 'Member removed' });
      loadMembers();
    } catch (error) {
      toast({ title: 'Failed to remove', description: error.message, variant: 'destructive' });
    }
  };

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
              {members.map(member => (
                <div key={member.id} className="flex items-center gap-3 p-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary shrink-0">
                    {member.user_name?.charAt(0) || member.user_email?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{member.user_name || member.user_email}</p>
                    <p className="text-xs text-muted-foreground">{member.user_email}</p>
                  </div>
                  <Select 
                    defaultValue={member.role} 
                    onValueChange={(v) => handleChangeRole(member.id, v)}
                  >
                    <SelectTrigger className="w-32 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ROLE_CONFIG).map(([value, config]) => (
                        <SelectItem key={value} value={value}>{config.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Badge className={`text-[10px] ${ROLE_CONFIG[member.role]?.color}`}>
                    {ROLE_CONFIG[member.role]?.label}
                  </Badge>
                  {member.role !== 'owner' && (
                    <Button variant="ghost" size="icon" onClick={() => handleRemove(member.id)} className="text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite to Workboard</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="invite-email">Email Address</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
              />
            </div>
            <div>
              <Label>Workboard Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_CONFIG).map(([value, config]) => (
                    <SelectItem key={value} value={value}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button onClick={handleInvite} disabled={!inviteEmail.trim()}>Send Invitation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}