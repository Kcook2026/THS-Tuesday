import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { logAudit, AUDIT_ACTIONS } from '@/lib/auditLogger';

export default function InviteUserDialog({ open, onClose, onSaved }) {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('user');
  const [saving, setSaving] = useState(false);

  const handleInvite = async () => {
    if (!email.trim()) return;
    setSaving(true);
    try {
      await base44.users.inviteUser(email.trim(), role);
      logAudit(AUDIT_ACTIONS.INVITE_SENT, {
        after_value: { email: email.trim(), role },
      });
      toast({ title: 'Invitation sent', description: email.trim() });
      onSaved?.();
      onClose();
      setEmail('');
      setRole('user');
    } catch (error) {
      toast({ title: 'Error sending invitation', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Invite User</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Email *</Label>
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="colleague@company.com"
            />
          </div>
          <div>
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Team Member</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleInvite} disabled={saving || !email.trim()}>
              {saving ? 'Sending...' : 'Send Invitation'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}