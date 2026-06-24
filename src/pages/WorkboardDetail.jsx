import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Search, MoreHorizontal, ChevronRight, ChevronDown, X, Save } from 'lucide-react';
import Breadcrumbs from '@/components/shared/Breadcrumbs';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { useToast } from '@/components/ui/use-toast';
import { useWorkspace } from '@/lib/WorkspaceContext';
import { logActivity } from '@/hooks/useActivityLogger';

const STATUS_CONFIG = {
  not_started: { label: 'Not Started', color: 'gray', bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300' },
  working_on_it: { label: 'Working On It', color: 'blue', bg: 'bg-blue-100 dark:bg-blue-800', text: 'text-blue-700 dark:text-blue-300' },
  stuck: { label: 'Stuck', color: 'red', bg: 'bg-red-100 dark:bg-red-800', text: 'text-red-700 dark:text-red-300' },
  waiting: { label: 'Waiting', color: 'orange', bg: 'bg-orange-100 dark:bg-orange-800', text: 'text-orange-700 dark:text-orange-300' },
  done: { label: 'Done', color: 'green', bg: 'bg-green-100 dark:bg-green-800', text: 'text-green-700 dark:text-green-300' },
};

const PRIORITY_CONFIG = {
  low: { label: 'Low', color: 'gray', bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300' },
  medium: { label: 'Medium', color: 'yellow', bg: 'bg-yellow-100 dark:bg-yellow-800', text: 'text-yellow-700 dark:text-yellow-300' },
  high: { label: 'High', color: 'orange', bg: 'bg-orange-100 dark:bg-orange-800', text: 'text-orange-700 dark:text-orange-300' },
  critical: { label: 'Critical', color: 'red', bg: 'bg-red-100 dark:bg-red-800', text: 'text-red-700 dark:text-red-300' },
};

const GROUPS = ['This Week', 'Next Week', 'Backlog', 'In Progress', 'Completed'];

export default function WorkboardDetail() {
  const { id } = useParams();
  const { currentWorkspaceId } = useWorkspace();
  const [board, setBoard] = useState(null);
  const [items, setItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');
  const [expandedItems, setExpandedItems] = useState({});
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [showNewItem, setShowNewItem] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemGroup, setNewItemGroup] = useState('This Week');
  const [user, setUser] = useState(null);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const [b, i, u, me] = await Promise.all([
        base44.entities.Workboard.get(id),
        base44.entities.Task.filter({ board: id }),
        base44.entities.User.list(),
        base44.auth.me(),
      ]);
      setBoard(b);
      setItems(i);
      setUsers(u);
      setUser(me);
    } catch (error) {
      toast({ title: 'Error loading board', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const userMap = Object.fromEntries(users.map(u => [u.id, u.full_name]));

  const mainItems = items.filter(item => !item.parent_task);
  const subItemsMap = items.reduce((acc, item) => {
    if (item.parent_task) {
      if (!acc[item.parent_task]) acc[item.parent_task] = [];
      acc[item.parent_task].push(item);
    }
    return acc;
  }, {});

  const filteredItems = mainItems.filter(item => {
    if (search && !item.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (groupFilter !== 'all' && item.group_name !== groupFilter) return false;
    return true;
  });

  const toggleExpand = (itemId) => {
    setExpandedItems(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const handleInlineEdit = async (itemId, field, value) => {
    try {
      const updateData = { [field]: value };
      
      // Auto-update color fields based on status/priority
      if (field === 'status' && STATUS_CONFIG[value]) {
        updateData.status_color = STATUS_CONFIG[value].color;
      }
      if (field === 'priority' && PRIORITY_CONFIG[value]) {
        updateData.priority_color = PRIORITY_CONFIG[value].color;
      }
      if (field === 'status' && value === 'done') {
        updateData.completion_percentage = 100;
      }
      
      await base44.entities.Task.update(itemId, updateData);
      
      setItems(prev => prev.map(item => 
        item.id === itemId ? { ...item, ...updateData } : item
      ));
      
      logActivity(user, `updated ${field.replace('_', ' ')} to ${value}`, 'Task', itemId, items.find(i => i.id === itemId)?.title);
      toast({ title: 'Updated successfully' });
    } catch (error) {
      toast({ title: 'Error updating', description: error.message, variant: 'destructive' });
    }
    setEditingCell(null);
  };

  const handleCreateItem = async () => {
    if (!newItemTitle.trim()) {
      toast({ title: 'Title required', variant: 'destructive' });
      return;
    }
    
    try {
      const newItem = {
        title: newItemTitle.trim(),
        workspace: currentWorkspaceId,
        board: id,
        status: 'not_started',
        status_color: 'gray',
        priority: 'medium',
        priority_color: 'yellow',
        group_name: newItemGroup,
        item_type: 'main_item',
        completion_percentage: 0,
      };
      
      const created = await base44.entities.Task.create(newItem);
      logActivity(user, 'created workboard item', 'Task', created.id, created.title);
      toast({ title: 'Item created' });
      setNewItemTitle('');
      setShowNewItem(false);
      load();
    } catch (error) {
      toast({ title: 'Error creating item', description: error.message, variant: 'destructive' });
    }
  };

  const handleCreateSubItem = async (parentTaskId) => {
    const title = prompt('Enter sub-item title:');
    if (!title || !title.trim()) return;
    
    try {
      const parent = items.find(i => i.id === parentTaskId);
      const newItem = {
        title: title.trim(),
        workspace: currentWorkspaceId,
        board: id,
        parent_task: parentTaskId,
        status: 'not_started',
        status_color: 'gray',
        priority: 'medium',
        priority_color: 'yellow',
        group_name: parent?.group_name || 'Backlog',
        item_type: 'sub_item',
        completion_percentage: 0,
      };
      
      const created = await base44.entities.Task.create(newItem);
      logActivity(user, 'created sub-item', 'Task', created.id, created.title);
      toast({ title: 'Sub-item created' });
      setExpandedItems(prev => ({ ...prev, [parentTaskId]: true }));
      load();
    } catch (error) {
      toast({ title: 'Error creating sub-item', description: error.message, variant: 'destructive' });
    }
  };

  const handleDeleteItem = async (item) => {
    if (!confirm(`Delete "${item.title}"?`)) return;
    
    try {
      // Delete sub-items first
      const subItems = subItemsMap[item.id] || [];
      for (const sub of subItems) {
        await base44.entities.Task.delete(sub.id);
      }
      await base44.entities.Task.delete(item.id);
      logActivity(user, 'deleted workboard item', 'Task', item.id, item.title);
      toast({ title: 'Item deleted' });
      load();
    } catch (error) {
      toast({ title: 'Error deleting item', description: error.message, variant: 'destructive' });
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!board) return <div className="py-16 text-center text-muted-foreground">Board not found</div>;

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[
        { label: 'Workboards', path: '/workboards' },
        { label: board.name },
      ]} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{board.name}</h1>
          {board.description && <p className="text-sm text-muted-foreground mt-0.5">{board.description}</p>}
        </div>
        <Button onClick={() => setShowNewItem(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Add Item
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={groupFilter} onValueChange={setGroupFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Groups</SelectItem>
            {GROUPS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* New Item Row */}
      {showNewItem && (
        <Card className="border-primary/50 bg-accent/50">
          <CardContent className="p-3">
            <div className="flex gap-2 items-center">
              <Input 
                value={newItemTitle} 
                onChange={e => setNewItemTitle(e.target.value)}
                placeholder="Enter item title..."
                className="flex-1"
                autoFocus
              />
              <Select value={newItemGroup} onValueChange={setNewItemGroup}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GROUPS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={handleCreateItem}>
                <Save className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowNewItem(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Items Table */}
      <div className="border rounded-xl overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Item Name</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <p>No items yet</p>
                      <Button size="sm" onClick={() => setShowNewItem(true)}>
                        <Plus className="w-4 h-4 mr-1.5" /> Add First Item
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item, index) => {
                  const subItems = subItemsMap[item.id] || [];
                  const isExpanded = expandedItems[item.id];
                  
                  return (
                    <React.Fragment key={item.id}>
                      <TableRow className="hover:bg-accent/50">
                        <TableCell>
                          {subItems.length > 0 && (
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleExpand(item.id)}>
                              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </Button>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${
                              item.item_type === 'milestone' ? 'bg-purple-500' :
                              item.item_type === 'sub_item' ? 'bg-blue-400' : 'bg-gray-400'
                            }`} />
                            {item.title}
                          </div>
                        </TableCell>
                        <TableCell>
                          {editingCell === `${item.id}-owner` ? (
                            <Select value={editValue} onValueChange={v => handleInlineEdit(item.id, 'owner', v)}>
                              <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          ) : (
                            <div 
                              className="cursor-pointer hover:bg-accent px-2 py-1 rounded"
                              onClick={() => { setEditingCell(`${item.id}-owner`); setEditValue(item.owner || ''); }}
                            >
                              {userMap[item.owner] || '—'}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {editingCell === `${item.id}-status` ? (
                            <Select value={editValue} onValueChange={v => handleInlineEdit(item.id, 'status', v)}>
                              <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <div 
                              className={`cursor-pointer inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_CONFIG[item.status]?.bg} ${STATUS_CONFIG[item.status]?.text}`}
                              onClick={() => { setEditingCell(`${item.id}-status`); setEditValue(item.status); }}
                            >
                              {STATUS_CONFIG[item.status]?.label || item.status}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {editingCell === `${item.id}-priority` ? (
                            <Select value={editValue} onValueChange={v => handleInlineEdit(item.id, 'priority', v)}>
                              <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <div 
                              className={`cursor-pointer inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${PRIORITY_CONFIG[item.priority]?.bg} ${PRIORITY_CONFIG[item.priority]?.text}`}
                              onClick={() => { setEditingCell(`${item.id}-priority`); setEditValue(item.priority); }}
                            >
                              {PRIORITY_CONFIG[item.priority]?.label || item.priority}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {item.due_date ? new Date(item.due_date).toLocaleDateString() : '—'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all ${
                                  item.completion_percentage === 100 ? 'bg-green-500' :
                                  item.completion_percentage >= 50 ? 'bg-blue-500' : 'bg-gray-400'
                                }`}
                                style={{ width: `${item.completion_percentage || 0}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground w-8">{item.completion_percentage || 0}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleCreateSubItem(item.id)}>
                                <Plus className="w-3.5 h-3.5 mr-2" /> Add Sub-item
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDeleteItem(item)} className="text-destructive">
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                      
                      {/* Sub-items */}
                      {isExpanded && subItems.map(sub => (
                        <TableRow key={sub.id} className="bg-muted/30 hover:bg-accent/50">
                          <TableCell></TableCell>
                          <TableCell className="pl-8">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                              {sub.title}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{userMap[sub.owner] || '—'}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_CONFIG[sub.status]?.bg} ${STATUS_CONFIG[sub.status]?.text}`}>
                              {STATUS_CONFIG[sub.status]?.label || sub.status}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${PRIORITY_CONFIG[sub.priority]?.bg} ${PRIORITY_CONFIG[sub.priority]?.text}`}>
                              {PRIORITY_CONFIG[sub.priority]?.label || sub.priority}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm">
                            {sub.due_date ? new Date(sub.due_date).toLocaleDateString() : '—'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-2 bg-muted rounded-full overflow-hidden" style={{ width: '80px' }}>
                                <div 
                                  className={`h-full rounded-full ${sub.completion_percentage === 100 ? 'bg-green-500' : 'bg-gray-400'}`}
                                  style={{ width: `${sub.completion_percentage || 0}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground w-8">{sub.completion_percentage || 0}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeleteItem(sub)}>
                              <X className="w-3 h-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}