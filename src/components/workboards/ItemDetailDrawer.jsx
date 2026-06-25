import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useWorkspace } from '@/lib/WorkspaceContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { 
  X, User, Calendar, CheckCircle, AlertCircle, Clock, 
  File, Paperclip, MessageSquare, Plus, Trash2, Save
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { STATUS_COLORS, PRIORITY_COLORS } from './WorkboardConstants';
import { getUserInitials } from '@/lib/userHelpers';

export default function ItemDetailDrawer({ item, boardId, workspaceId, isOpen, onClose, onUpdate }) {
  const { user, currentWorkspaceId } = useWorkspace();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [editingField, setEditingField] = useState(null);
  const [localItem, setLocalItem] = useState(item);
  const [users, setUsers] = useState([]);
  const [statusOptions, setStatusOptions] = useState([]);
  const [priorityOptions, setPriorityOptions] = useState([]);
  const [groups, setGroups] = useState([]);
  const [subItems, setSubItems] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [newUpdate, setNewUpdate] = useState('');
  const [newSubItemTitle, setNewSubItemTitle] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && item) {
      setLocalItem(item);
      loadBoardData();
      loadSubItems();
      // loadUpdates();
    }
  }, [isOpen, item]);

  const loadBoardData = async () => {
    try {
      const [s, p, g, u] = await Promise.all([
        base44.entities.StatusOption.filter({ workboard: boardId }),
        base44.entities.PriorityOption.filter({ workboard: boardId }),
        base44.entities.BoardGroup.filter({ workboard: boardId, archived: false }),
        base44.entities.User.list(),
      ]);
      setStatusOptions(s.sort((a, b) => a.sort_order - b.sort_order));
      setPriorityOptions(p.sort((a, b) => a.sort_order - b.sort_order));
      setGroups(g.sort((a, b) => a.sort_order - b.sort_order));
      setUsers(u);
    } catch (error) {
      console.error('Error loading board data:', error);
    }
  };

  const loadSubItems = async () => {
    if (!item?.id) return;
    try {
      const subs = await base44.entities.WorkboardItem.filter({ 
        parent_item: item.id,
        archived: false 
      });
      setSubItems(subs.sort((a, b) => a.sort_order - b.sort_order));
    } catch (error) {
      console.error('Error loading sub-items:', error);
    }
  };

  const handleUpdateField = async (field, value) => {
    setSaving(true);
    try {
      const updateData = { [field]: value };
      
      if (field === 'status') {
        const status = statusOptions.find(s => s.label === value);
        if (status) updateData.status_color = status.color;
      }
      if (field === 'priority') {
        const priority = priorityOptions.find(p => p.label === value);
        if (priority) updateData.priority_color = priority.color;
      }
      if (field === 'progress_percentage') {
        updateData.progress_percentage = parseInt(value) || 0;
      }
      
      await base44.entities.WorkboardItem.update(item.id, updateData);
      setLocalItem({ ...localItem, ...updateData });
      onUpdate?.({ ...item, ...updateData });
      toast({ title: 'Updated', duration: 2000 });
    } catch (error) {
      console.error('Error updating:', error);
      toast({ title: 'Update failed', description: error.message, variant: 'destructive', duration: 5000 });
    } finally {
      setSaving(false);
      setEditingField(null);
    }
  };

  const handleAddSubItem = async () => {
    if (!newSubItemTitle.trim()) return;
    
    setSaving(true);
    try {
      const newItem = {
        title: newSubItemTitle.trim(),
        workspace: currentWorkspaceId,
        workboard: boardId,
        parent_item: item.id,
        group: item.group,
        status: 'Not Started',
        status_color: 'gray',
        priority: 'Medium',
        priority_color: 'yellow',
        progress_percentage: 0,
        created_by: user?.id,
        archived: false,
      };
      
      await base44.entities.WorkboardItem.create(newItem);
      toast({ title: 'Sub-item added', duration: 2000 });
      setNewSubItemTitle('');
      loadSubItems();
    } catch (error) {
      toast({ title: 'Failed to add sub-item', description: error.message, variant: 'destructive', duration: 5000 });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSubItem = async (subItemId) => {
    if (!confirm('Delete this sub-item?')) return;
    try {
      await base44.entities.WorkboardItem.delete(subItemId);
      toast({ title: 'Sub-item deleted', duration: 2000 });
      loadSubItems();
    } catch (error) {
      toast({ title: 'Failed to delete sub-item', description: error.message, variant: 'destructive', duration: 5000 });
    }
  };

  const handleAddUpdate = async () => {
    if (!newUpdate.trim()) return;
    
    setSaving(true);
    try {
      // For now, just log to console - implement Comment entity later
      toast({ title: 'Update added', description: 'Comment system coming soon', duration: 3000 });
      setNewUpdate('');
    } catch (error) {
      toast({ title: 'Failed to add update', description: error.message, variant: 'destructive', duration: 5000 });
    } finally {
      setSaving(false);
    }
  };

  const getUserDisplay = (userId) => {
    if (!userId) return 'Unassigned';
    const u = users.find(u => u.id === userId);
    return u?.full_name || u?.email || 'Unassigned';
  };

  if (!item) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[500px] sm:w-[600px] overflow-y-auto">
        <SheetHeader className="border-b pb-4 mb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <SheetTitle className="text-lg">{localItem?.title}</SheetTitle>
              <SheetDescription>
                {groups.find(g => g.id === localItem?.group)?.name || 'No group'}
              </SheetDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="updates">Updates</TabsTrigger>
            <TabsTrigger value="subitems">Sub-items</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            {/* Status */}
            <div className="space-y-2">
              <Label>Status</Label>
              {editingField === 'status' ? (
                <Select value={localItem.status} onValueChange={(v) => handleUpdateField('status', v)} onOpenChange={() => setEditingField(null)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(s => (
                      <SelectItem key={s.id} value={s.label}>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full bg-${s.color}-500`} />
                          {s.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Button variant="outline" className="w-full justify-start" onClick={() => setEditingField('status')}>
                  <Badge className={`mr-2 ${STATUS_COLORS[localItem.status_color] || STATUS_COLORS.gray}`}>
                    {localItem.status || 'Not Started'}
                  </Badge>
                </Button>
              )}
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label>Priority</Label>
              {editingField === 'priority' ? (
                <Select value={localItem.priority} onValueChange={(v) => handleUpdateField('priority', v)} onOpenChange={() => setEditingField(null)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {priorityOptions.map(p => (
                      <SelectItem key={p.id} value={p.label}>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full bg-${p.color}-500`} />
                          {p.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Button variant="outline" className="w-full justify-start" onClick={() => setEditingField('priority')}>
                  <Badge className={`mr-2 ${PRIORITY_COLORS[localItem.priority_color] || PRIORITY_COLORS.gray}`}>
                    {localItem.priority || 'Medium'}
                  </Badge>
                </Button>
              )}
            </div>

            {/* Owner */}
            <div className="space-y-2">
              <Label>Owner</Label>
              {editingField === 'owner' ? (
                <Select value={localItem.owner || ''} onValueChange={(v) => handleUpdateField('owner', v)} onOpenChange={() => setEditingField(null)}>
                  <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Unassigned</SelectItem>
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Button variant="outline" className="w-full justify-start" onClick={() => setEditingField('owner')}>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                      {getUserInitials(users.find(u => u.id === localItem.owner))}
                    </div>
                    <span>{getUserDisplay(localItem.owner)}</span>
                  </div>
                </Button>
              )}
            </div>

            {/* Due Date */}
            <div className="space-y-2">
              <Label>Due Date</Label>
              {editingField === 'due_date' ? (
                <Input 
                  type="date" 
                  value={localItem.due_date ? localItem.due_date.split('T')[0] : ''} 
                  onChange={(e) => handleUpdateField('due_date', e.target.value)}
                  onBlur={() => setEditingField(null)}
                  autoFocus
                />
              ) : (
                <Button variant="outline" className="w-full justify-start" onClick={() => setEditingField('due_date')}>
                  <Calendar className="w-4 h-4 mr-2" />
                  {localItem.due_date ? new Date(localItem.due_date).toLocaleDateString() : 'No due date'}
                </Button>
              )}
            </div>

            {/* Progress */}
            <div className="space-y-2">
              <Label>Progress</Label>
              {editingField === 'progress_percentage' ? (
                <Input 
                  type="number" 
                  min="0" 
                  max="100" 
                  value={localItem.progress_percentage || 0} 
                  onChange={(e) => handleUpdateField('progress_percentage', e.target.value)}
                  onBlur={() => setEditingField(null)}
                  autoFocus
                />
              ) : (
                <div className="flex items-center gap-3">
                  <Progress value={localItem.progress_percentage || 0} className="flex-1 h-2" />
                  <span className="text-sm text-muted-foreground w-10">{localItem.progress_percentage || 0}%</span>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingField('progress_percentage')}>
                    <CheckCircle className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea 
                value={localItem.description || ''} 
                onChange={async (e) => {
                  await base44.entities.WorkboardItem.update(item.id, { description: e.target.value });
                  setLocalItem({ ...localItem, description: e.target.value });
                  toast({ title: 'Description saved', duration: 2000 });
                }}
                rows={4}
                placeholder="Add a description..."
              />
            </div>
          </TabsContent>

          <TabsContent value="updates" className="space-y-4 mt-4">
            <div className="space-y-3">
              <Label>Add Update</Label>
              <Textarea 
                value={newUpdate}
                onChange={(e) => setNewUpdate(e.target.value)}
                placeholder="Write an update..."
                rows={3}
              />
              <Button onClick={handleAddUpdate} disabled={saving || !newUpdate.trim()}>
                <MessageSquare className="w-4 h-4 mr-2" />
                Post Update
              </Button>
            </div>
            
            <div className="text-center text-sm text-muted-foreground py-8">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Updates and comments coming soon</p>
            </div>
          </TabsContent>

          <TabsContent value="subitems" className="space-y-4 mt-4">
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input 
                  value={newSubItemTitle}
                  onChange={(e) => setNewSubItemTitle(e.target.value)}
                  placeholder="New sub-item title..."
                  onKeyDown={(e) => e.key === 'Enter' && handleAddSubItem()}
                />
                <Button onClick={handleAddSubItem} disabled={saving || !newSubItemTitle.trim()} size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              {subItems.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-8">
                  <p>No sub-items yet</p>
                </div>
              ) : (
                subItems.map(sub => (
                  <Card key={sub.id} className="p-3">
                    <CardContent className="p-0 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-2 h-2 rounded-full bg-${sub.status_color}-500`} />
                        <span className="text-sm font-medium truncate">{sub.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className={`text-xs ${PRIORITY_COLORS[sub.priority_color]}`}>
                          {sub.priority}
                        </Badge>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeleteSubItem(sub.id)}>
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="files" className="space-y-4 mt-4">
            <div className="text-center text-sm text-muted-foreground py-8">
              <Paperclip className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>File attachments coming soon</p>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}