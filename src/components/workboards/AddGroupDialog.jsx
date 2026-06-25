import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GROUP_COLOR_CLASSES } from './WorkboardConstants';

const COLOR_OPTIONS = ['gray', 'blue', 'green', 'red', 'yellow', 'orange', 'purple'];

export default function AddGroupDialog({ open, onOpenChange, onCreate, saving }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('gray');

  useEffect(() => {
    if (open) {
      setName('');
      setColor('gray');
    }
  }, [open]);

  const handleSubmit = () => {
    if (!name.trim()) return;
    onCreate(name.trim(), color);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Group</DialogTitle>
          <DialogDescription>Create a custom group for this workboard</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Group Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter group name..."
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
            />
          </div>
          <div>
            <Label>Color</Label>
            <div className="flex items-center gap-2 mt-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`w-7 h-7 rounded-full ${GROUP_COLOR_CLASSES[c]} ${color === c ? 'ring-2 ring-offset-2 ring-primary' : ''}`}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || saving}>
            {saving ? 'Creating...' : 'Create Group'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}