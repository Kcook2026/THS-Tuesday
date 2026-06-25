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
import { useToast } from '@/components/ui/use-toast';
import { Calendar, CheckCircle, MessageSquare, Paperclip, ListTree } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { STATUS_COLORS, PRIORITY_COLORS, GROUP_COLOR_CLASSES } from './WorkboardConstants';
import { getUserInitials } from '@/lib/userHelpers';
import UpdatesSection from './UpdatesSection';
import FilesSection from './FilesSection';
import SubItemsList from './SubItemsList';

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
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && item) {
      setLocalItem(item);
      setActiveTab('overview');
      loadBoardData();
    }
  }, [isOpen, item]);

  const loadBoardData = async () => {
    try {
      const [s, p, g, u, subs] = await Promise.all([
        base44.entities.StatusOption.filter({ workboard: boardId }),
        base44.entities.PriorityOption.filter({ workboard: boardId }),
        base44.entities.BoardGroup.filter({ workboard: boardId, archived: false }),
        base44.entities.User.list(),
        item?.id ? base44.entities.WorkboardItem.filter({ parent_item: item.id, archived: false }).catch(() => []) : [],
      ]);
      setStatusOptions(s.sort((a, b) => a.sort_order - b.sort_order));
      setPriorityOptions(p.sort((a, b) => a.sort_order - b.sort_order));
      setGroups(g.sort((a, b) => a.sort_order - b.sort_order));
      setUsers(u);
      setSubItems(subs);
    } catch (error) {
      console.error('Error loading board data:', error);
    }
  };

  const handleUpdateField = async (field, value) => {
    setSaving(true);
    try {
      let updateData = {};

      if (field === 'owner') {
        updateData.owner = value === 'unassigned' ? null : value;
      } else if (field === 'status') {
        const status = statusOptions.find(s => s.label === value);
        updateData.status = value;
        if (status) updateData.status_color = status.color;
      } else if (field === 'priority') {
        const priority = priorityOptions.find(p => p.label === value);
        updateData.priority = value;
        if (priority) updateData.priority_color = priority.color;
      } else if (field === 'progress_percentage') {
        updateData.progress_percentage = parseInt(value) || 0;
      } else if (field === 'due_date') {
        updateData.due_date = value || null;
      } else {
        updateData = { [field]: value };
      }

      await base44.entities.WorkboardItem.update(item.id, updateData);
      setLocalItem(prev => ({ ...prev, ...updateData }));
      onUpdate?.({ ...item, ...updateData });
      toast({ title: 'Updated', duration: 2000 });
    } catch (error) {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive', duration: 5000 });
    } finally {
      setSaving(false);
      setEditingField(null);
    }
  };

  const handleDescriptionChange = async (value) => {
    try {
      await base44.entities.WorkboardItem.update(item.id, { description: value });
      setLocalItem(prev => ({ ...prev, description: value }));
      onUpdate?.({ ...item, description: value });
      toast({ title: 'Description saved', duration: 2000 });
    } catch (error) {
      toast({ title: 'Failed to save description', description: error.message, variant: 'destructive', duration: 5000 });
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
          <SheetTitle className="text-lg">{localItem?.title}</SheetTitle>
          <SheetDescription>
            {groups.find(g => g.id === localItem?.group)?.name || 'No group'}
          </SheetDescription>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="subitems">
              <ListTree className="w-3.5 h-3.5 mr-1.5" />
              Sub-items
            </TabsTrigger>
            <TabsTrigger value="updates">
              <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
              Updates
            </TabsTrigger>
            <TabsTrigger value="files">
              <Paperclip className="w-3.5 h-3.5 mr-1.5" />
              Files
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            {/* Status */}
            <div className="space-y-2">
              <Label>Status</Label>
              {editingField === 'status' ? (
                <Select value={localItem.status || ''} onValueChange={(v) => handleUpdateField('status', v)} onOpenChange={(open) => { if (!open) setEditingField(null); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(s => (
                      <SelectItem key={s.id} value={s.label}>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${GROUP_COLOR_CLASSES[s.color] || 'bg-gray-500'}`} />
                          {s.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Button variant="outline" className="w-full justify-start" onClick={() => setEditingField('status')} disabled={saving}>
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
                <Select value={localItem.priority || ''} onValueChange={(v) => handleUpdateField('priority', v)} onOpenChange={(open) => { if (!open) setEditingField(null); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {priorityOptions.map(p => (
                      <SelectItem key={p.id} value={p.label}>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${GROUP_COLOR_CLASSES[p.color] || 'bg-gray-500'}`} />
                          {p.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Button variant="outline" className="w-full justify-start" onClick={() => setEditingField('priority')} disabled={saving}>
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
                <Select value={localItem.owner || 'unassigned'} onValueChange={(v) => handleUpdateField('owner', v)} onOpenChange={(open) => { if (!open) setEditingField(null); }}>
                  <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.full_name || u.email || 'Unassigned'}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Button variant="outline" className="w-full justify-start" onClick={() => setEditingField('owner')} disabled={saving}>
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
                  defaultValue={localItem.due_date ? localItem.due_date.split('T')[0] : ''}
                  onBlur={(e) => handleUpdateField('due_date', e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleUpdateField('due_date', e.target.value); if (e.key === 'Escape') setEditingField(null); }}
                  autoFocus
                />
              ) : (
                <Button variant="outline" className="w-full justify-start" onClick={() => setEditingField('due_date')} disabled={saving}>
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
                  defaultValue={localItem.progress_percentage || 0}
                  onBlur={(e) => handleUpdateField('progress_percentage', e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleUpdateField('progress_percentage', e.target.value); if (e.key === 'Escape') setEditingField(null); }}
                  autoFocus
                />
              ) : (
                <div className="flex items-center gap-3">
                  <Progress value={localItem.progress_percentage || 0} className="flex-1 h-2" />
                  <span className="text-sm text-muted-foreground w-10">{localItem.progress_percentage || 0}%</span>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingField('progress_percentage')} disabled={saving}>
                    <CheckCircle className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                defaultValue={localItem.description || ''}
                onBlur={(e) => {
                  if (e.target.value !== (localItem.description || '')) {
                    handleDescriptionChange(e.target.value);
                  }
                }}
                rows={4}
                placeholder="Add a description..."
              />
            </div>
          </TabsContent>

          <TabsContent value="subitems" className="mt-4">
            <SubItemsList
              item={localItem}
              subItems={subItems}
              statusOptions={statusOptions}
              priorityOptions={priorityOptions}
              users={users}
              onAddSubItem={async (title) => {
                const savedSub = await base44.entities.WorkboardItem.create({
                  title,
                  workspace: localItem.workspace,
                  workboard: localItem.workboard,
                  parent_item: localItem.id,
                  group: localItem.group,
                  item_type: 'sub_item',
                  status: 'Not Started',
                  status_color: 'gray',
                  priority: 'Medium',
                  priority_color: 'yellow',
                  progress_percentage: 0,
                  sort_order: subItems.length,
                  archived: false,
                });
                setSubItems(prev => [...prev, savedSub]);
              }}
              onUpdateSubItem={async (subId, updateData) => {
                await base44.entities.WorkboardItem.update(subId, updateData);
                setSubItems(prev => prev.map(s => s.id === subId ? { ...s, ...updateData } : s));
              }}
            />
          </TabsContent>

          <TabsContent value="updates" className="mt-4">
            <UpdatesSection item={localItem} boardId={boardId} users={users} />
          </TabsContent>

          <TabsContent value="files" className="mt-4">
            <FilesSection item={localItem} canEdit={true} />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}