import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, AlertCircle, UserPlus, FileText, Clock, AlertTriangle, GitBranch, Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { useWorkspace } from '@/lib/WorkspaceContext';
import { useToast } from '@/components/ui/use-toast';
import { getTriggerMeta, getActionMeta } from './AutomationConstants';

export const STARTER_RECIPES = [
  {
    name: 'Auto-complete items when status is Done',
    description: 'When an item\'s status changes to Done, archive it automatically.',
    trigger_type: 'status_changed',
    trigger_config: JSON.stringify({ value: 'Done' }),
    conditions: '[]',
    actions: JSON.stringify([{ type: 'archive_item' }]),
    icon: 'CheckCircle',
  },
  {
    name: 'Critical priority alerts',
    description: 'Notify workboard owners when an item\'s priority changes to Critical.',
    trigger_type: 'priority_changed',
    trigger_config: JSON.stringify({ value: 'Critical' }),
    conditions: '[]',
    actions: JSON.stringify([{ type: 'notify_workboard_owners', value: 'An item priority was changed to Critical.' }]),
    icon: 'AlertCircle',
  },
  {
    name: 'Assignee notification',
    description: 'Send a notification to the assignee when an item is assigned.',
    trigger_type: 'assignee_changed',
    trigger_config: '{}',
    conditions: '[]',
    actions: JSON.stringify([{ type: 'notify_assignee', value: 'You were assigned to an item.' }]),
    icon: 'UserPlus',
  },
  {
    name: 'Form submission auto-assign',
    description: 'When a form is submitted, assign an owner to the created item. Configure the owner after adding.',
    trigger_type: 'form_submitted',
    trigger_config: '{}',
    conditions: '[]',
    actions: JSON.stringify([{ type: 'assign_owner', value: '' }]),
    icon: 'FileText',
  },
  {
    name: 'Overdue item alert',
    description: 'Notify the item owner when the due date has passed.',
    trigger_type: 'due_date_overdue',
    trigger_config: '{}',
    conditions: '[]',
    actions: JSON.stringify([{ type: 'notify_owner', value: 'This item is overdue.' }]),
    icon: 'Clock',
  },
  {
    name: 'Stuck item escalation',
    description: 'Notify workboard owners when an item is marked as Stuck.',
    trigger_type: 'status_changed',
    trigger_config: JSON.stringify({ value: 'Stuck' }),
    conditions: '[]',
    actions: JSON.stringify([{ type: 'notify_workboard_owners', value: 'An item is marked as Stuck.' }]),
    icon: 'AlertTriangle',
  },
  {
    name: 'Auto-create sub-items',
    description: 'When a new item is created, automatically create three default sub-items: Review request, Assign owner, and Complete follow-up.',
    trigger_type: 'item_created',
    trigger_config: '{}',
    conditions: '[]',
    actions: JSON.stringify([
      { type: 'create_sub_item', value: 'Review request' },
      { type: 'create_sub_item', value: 'Assign owner' },
      { type: 'create_sub_item', value: 'Complete follow-up' },
    ]),
    icon: 'GitBranch',
  },
];

const ICONS = { CheckCircle, AlertCircle, UserPlus, FileText, Clock, AlertTriangle, GitBranch };

export default function RecipeGallery({ open, onClose, workboards }) {
  const navigate = useNavigate();
  const { currentWorkspaceId, user } = useWorkspace();
  const { toast } = useToast();
  const [selectedBoard, setSelectedBoard] = useState('all');
  const [using, setUsing] = useState(null);

  const handleUseRecipe = async (recipe) => {
    setUsing(recipe.name);
    try {
      const workboard = selectedBoard === 'all' ? null : selectedBoard;

      // Check for duplicates: same name + same workboard scope
      const existing = await base44.entities.AutomationRule.filter({
        workspace: currentWorkspaceId,
        name: recipe.name,
        is_starter: true,
      }).catch(() => []);

      const isDup = existing.some(r =>
        (r.workboard === workboard) || (!r.workboard && !workboard)
      );

      if (isDup) {
        const dupRule = existing.find(r =>
          (r.workboard === workboard) || (!r.workboard && !workboard)
        );
        toast({ title: 'Recipe already exists', description: 'Opening the existing rule for editing.' });
        navigate(`/automations/${dupRule.id}/edit`);
        onClose();
        return;
      }

      // Create new draft rule
      const rule = await base44.entities.AutomationRule.create({
        name: recipe.name,
        description: recipe.description,
        trigger_type: recipe.trigger_type,
        trigger_config: recipe.trigger_config,
        conditions: recipe.conditions,
        actions: recipe.actions,
        workspace: currentWorkspaceId,
        workboard,
        status: 'draft',
        owner: user?.id,
        created_by: user?.id,
        run_count: 0,
        failure_count: 0,
        archived: false,
        is_starter: true,
      });

      toast({ title: 'Recipe added', description: 'Review and enable the rule in the builder.' });
      // Dispatch event to refresh AutomationCenter list
      window.dispatchEvent(new Event('automations-changed'));
      navigate(`/automations/${rule.id}/edit`);
      onClose();
    } catch (e) {
      toast({ title: 'Failed to add recipe', description: e.message, variant: 'destructive' });
    } finally {
      setUsing(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" /> Starter Recipes
          </DialogTitle>
          <DialogDescription>
            Choose a pre-built automation to add to your workspace. You can customize it before enabling.
          </DialogDescription>
        </DialogHeader>

        <div className="mb-4">
          <label className="text-xs text-muted-foreground mb-1.5 block">Apply to workboard</label>
          <Select value={selectedBoard} onValueChange={setSelectedBoard}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All workboards (workspace-level)</SelectItem>
              {workboards.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {STARTER_RECIPES.map((recipe, idx) => {
            const Icon = ICONS[recipe.icon] || Sparkles;
            return (
              <div key={idx} className="border rounded-lg p-4 flex flex-col">
                <div className="flex items-start gap-3 mb-2">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm">{recipe.name}</h3>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-3 flex-1">{recipe.description}</p>
                <RecipeSummary recipe={recipe} />
                <Button
                  className="mt-3 w-full"
                  size="sm"
                  variant="outline"
                  onClick={() => handleUseRecipe(recipe)}
                  disabled={using !== null}
                >
                  {using === recipe.name ? (
                    <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Adding...</>
                  ) : (
                    <>Use Recipe <ArrowRight className="w-3.5 h-3.5 ml-1.5" /></>
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RecipeSummary({ recipe }) {
  const triggerMeta = getTriggerMeta(recipe.trigger_type);
  let tc = {};
  try { tc = JSON.parse(recipe.trigger_config || '{}'); } catch {}
  let actions = [];
  try { actions = JSON.parse(recipe.actions || '[]'); } catch {}

  return (
    <div className="bg-muted/40 rounded-md p-2.5 space-y-1.5 text-xs">
      <div className="flex items-center gap-1.5">
        <span className="text-[9px] font-bold uppercase text-primary bg-primary/10 px-1.5 py-0.5 rounded shrink-0">When</span>
        <span className="text-foreground/80">{triggerMeta.label}{tc.value ? ` → ${tc.value}` : ''}</span>
      </div>
      <div className="flex items-start gap-1.5">
        <span className="text-[9px] font-bold uppercase text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded shrink-0">Then</span>
        <div className="space-y-0.5">
          {actions.map((a, i) => {
            const meta = getActionMeta(a.type);
            return <p key={i} className="text-foreground/80">{meta.label}{a.value ? ` → ${a.value}` : ''}</p>;
          })}
        </div>
      </div>
    </div>
  );
}