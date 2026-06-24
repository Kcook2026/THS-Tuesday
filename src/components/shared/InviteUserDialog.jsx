import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useWorkspace } from '@/lib/WorkspaceContext';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { UserPlus, Building2, LayoutGrid, Check, Shield, Users } from 'lucide-react';

const SCOPE_OPTIONS = [
  { 
    value: 'workspace', 
    label: 'Entire Workspace', 
    description: 'User can access the workspace and all workboards',
    icon: Building2
  },
  { 
    value: 'workboards_only', 
    label: 'Specific Workboards Only', 
    description: 'User can access only selected workboards, not the full workspace',
    icon: LayoutGrid
  },
  { 
    value: 'workspace_selected', 
    label: 'Workspace With Selected Workboards', 
    description: 'User can access workspace shell but only selected workboards',
    icon: Users
  },
];

const WORKSPACE_ROLES = [
  { value: 'workspace_admin', label: 'Workspace Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'member', label: 'Member' },
  { value: 'viewer', label: 'Viewer' },
];

const WORKBOARD_ROLES = [
  { value: 'owner', label: 'Owner' },
  { value: 'editor', label: 'Editor' },
  { value: 'member', label: 'Member' },
  { value: 'viewer', label: 'Viewer' },
];

export default function InviteUserDialog({ open, onOpenChange }) {
  const { user, currentWorkspaceId, currentWorkspace } = useWorkspace();
  const { toast } = useToast();
  
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [scope, setScope] = useState('workspace');
  const [selectedWorkboards, setSelectedWorkboards] = useState([]);
  const [workboards, setWorkboards] = useState([]);
  const [workspaceRole, setWorkspaceRole] = useState('member');
  const [workboardRole, setWorkboardRole] = useState('member');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && currentWorkspaceId) {
      loadWorkboards();
      resetForm();
    }
  }, [open, currentWorkspaceId]);

  const resetForm = () => {
    setStep(1);
    setEmail('');
    setScope('workspace');
    setSelectedWorkboards([]);
    setWorkspaceRole('member');
    setWorkboardRole('member');
    setMessage('');
  };

  const loadWorkboards = async () => {
    try {
      const boards = await base44.entities.Workboard.filter({ 
        workspace: currentWorkspaceId,
        status: 'active'
      });
      setWorkboards(boards);
    } catch (error) {
      console.error('Error loading workboards:', error);
    }
  };

  const handleNext = () => {
    if (step === 1 && !email.trim()) {
      toast({ title: 'Email required', variant: 'destructive' });
      return;
    }
    if (step === 2 && scope !== 'workspace' && selectedWorkboards.length === 0) {
      toast({ title: 'Select at least one workboard', variant: 'destructive' });
      return;
    }
    setStep(step + 1);
  };

  const handleBack = () => setStep(step - 1);

  const handleInvite = async () => {
    if (!email.trim() || !currentWorkspaceId) return;
    
    setLoading(true);
    try {
      const appRole = workspaceRole === 'workspace_admin' ? 'admin' : 'user';
      
      await base44.users.inviteUser(email.trim(), appRole);
      
      const expires = new Date();
      expires.setDate(expires.getDate() + 7);
      
      const selectedBoards = workboards.filter(w => selectedWorkboards.includes(w.id));
      const workboardNames = selectedBoards.map(w => w.name);
      
      await base44.entities.Invitation.create({
        email: email.trim(),
        invited_by: user.id,
        invited_by_name: user.full_name,
        workspace: currentWorkspaceId,
        workspace_name: currentWorkspace?.workspace_name,
        role: workspaceRole,
        invitation_scope: scope,
        workboards: scope !== 'workspace' ? selectedWorkboards : [],
        workboard_names: scope !== 'workspace' ? workboardNames : [],
        message: message.trim(),
        status: 'pending',
        expires_date: expires.toISOString(),
      });
      
      const accessType = scope === 'workspace' ? 'all_workboards' : 'selected_workboards';
      await base44.entities.WorkspaceMember.create({
        workspace: currentWorkspaceId,
        workspace_name: currentWorkspace?.workspace_name,
        user_email: email.trim(),
        role: workspaceRole,
        access_type: accessType,
        accessible_workboards: scope !== 'workspace' ? selectedWorkboards : [],
        status: 'invited',
        invited_by: user.id,
      });
      
      if (scope !== 'workspace') {
        const wbMemberships = selectedWorkboards.map(wbId => {
          const wb = workboards.find(w => w.id === wbId);
          return {
            workspace: currentWorkspaceId,
            workspace_name: currentWorkspace?.workspace_name,
            workboard: wbId,
            workboard_name: wb?.name,
            user_email: email.trim(),
            role: workboardRole,
            status: 'invited',
            added_by: user.id,
          };
        });
        await base44.entities.WorkboardMember.bulkCreate(wbMemberships);
      }
      
      toast({ 
        title: 'Invitation sent', 
        description: `Invited ${email.trim()} with ${scope === 'workspace' ? 'full workspace' : 'selected workboard'} access` 
      });
      resetForm();
      onOpenChange(false);
    } catch (error) {
      toast({ title: 'Failed to send invitation', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const toggleWorkboard = (wbId) => {
    setSelectedWorkboards(prev => 
      prev.includes(wbId) ? prev.filter(id => id !== wbId) : [...prev, wbId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Invite User
          </DialogTitle>
          <DialogDescription>
            Step {step} of 3: {step === 1 ? 'Email' : step === 2 ? 'Access Scope' : 'Role & Send'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="colleague@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <Label>Access Scope</Label>
              <div className="grid gap-3">
                {SCOPE_OPTIONS.map(opt => {
                  const Icon = opt.icon;
                  return (
                    <Card
                      key={opt.value}
                      className={`cursor-pointer transition-all ${
                        scope === opt.value 
                          ? 'border-primary bg-accent/50' 
                          : 'hover:bg-accent/30'
                      }`}
                      onClick={() => setScope(opt.value)}
                    >
                      <CardContent className="p-4 flex items-start gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          scope === opt.value ? 'border-primary bg-primary' : 'border-muted'
                        }`}>
                          {scope === opt.value && <Check className="w-3 h-3 text-primary-foreground" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{opt.label}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{opt.description}</p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {scope !== 'workspace' && (
                <div className="mt-4">
                  <Label>Select Workboards</Label>
                  <div className="grid gap-2 mt-2 max-h-48 overflow-y-auto border rounded-md p-2">
                    {workboards.map(wb => (
                      <div
                        key={wb.id}
                        className="flex items-center gap-2 p-2 rounded hover:bg-accent/50 cursor-pointer"
                        onClick={() => toggleWorkboard(wb.id)}
                      >
                        <Checkbox checked={selectedWorkboards.includes(wb.id)} />
                        <span className="text-sm flex-1">{wb.name}</span>
                        {wb.board_type && (
                          <Badge variant="secondary" className="text-[10px]">{wb.board_type.replace('_', ' ')}</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {selectedWorkboards.length} workboard{selectedWorkboards.length !== 1 ? 's' : ''} selected
                  </p>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <Label>Workspace Role</Label>
                <Select value={workspaceRole} onValueChange={setWorkspaceRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WORKSPACE_ROLES.map(role => (
                      <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {workspaceRole === 'workspace_admin' && 'Full access to manage workspace and all workboards'}
                  {workspaceRole === 'manager' && 'Can create workboards and manage members'}
                  {workspaceRole === 'member' && 'Can view and edit assigned items'}
                  {workspaceRole === 'viewer' && 'View-only access'}
                </p>
              </div>

              {scope !== 'workspace' && (
                <div>
                  <Label>Workboard Role</Label>
                  <Select value={workboardRole} onValueChange={setWorkboardRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WORKBOARD_ROLES.map(role => (
                        <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label htmlFor="message">Personal Message (Optional)</Label>
                <Textarea
                  id="message"
                  placeholder="Add a personal note to the invitation..."
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={3}
                />
              </div>

              <Card className="bg-muted/50">
                <CardContent className="p-3 text-sm space-y-1">
                  <p><strong>Inviting:</strong> {email}</p>
                  <p><strong>Scope:</strong> {SCOPE_OPTIONS.find(o => o.value === scope)?.label}</p>
                  {scope !== 'workspace' && (
                    <p><strong>Workboards:</strong> {selectedWorkboards.length} selected</p>
                  )}
                  <p><strong>Workspace Role:</strong> {WORKSPACE_ROLES.find(r => r.value === workspaceRole)?.label}</p>
                  {scope !== 'workspace' && (
                    <p><strong>Workboard Role:</strong> {WORKBOARD_ROLES.find(r => r.value === workboardRole)?.label}</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <DialogFooter>
          {step > 1 && (
            <Button variant="outline" onClick={handleBack}>Back</Button>
          )}
          {step < 3 ? (
            <Button onClick={handleNext}>Next</Button>
          ) : (
            <Button onClick={handleInvite} disabled={loading || !email.trim()}>
              {loading ? 'Sending...' : 'Send Invitation'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}