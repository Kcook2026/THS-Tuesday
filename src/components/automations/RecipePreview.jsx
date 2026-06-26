import React from 'react';
import { ArrowRight } from 'lucide-react';
import { TRIGGER_TYPES, ACTION_TYPES, getTriggerMeta, getActionMeta } from './AutomationConstants';

export default function RecipePreview({ rule }) {
  const triggerMeta = getTriggerMeta(rule.trigger_type);
  let tc = {};
  try { tc = JSON.parse(rule.trigger_config || '{}'); } catch {}

  let conditions = [];
  try { conditions = JSON.parse(rule.conditions || '[]'); } catch {}

  let actions = [];
  try { actions = JSON.parse(rule.actions || '[]'); } catch {}

  const triggerValueLabel = () => {
    if (!tc.value && !tc.days) return '';
    if (rule.trigger_type === 'due_date_x_days_away') return `${tc.days} day(s) away`;
    return tc.value || '';
  };

  const actionLabel = (action) => {
    const meta = getActionMeta(action.type);
    const label = meta.label || action.type;
    if (action.value && meta.valueType === 'text') return `${label}: "${action.value}"`;
    if (action.value) return `${label} → ${action.value}`;
    return label;
  };

  return (
    <div className="bg-muted/40 rounded-lg p-4 space-y-3 text-sm">
      <div className="flex items-start gap-3">
        <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-1 rounded shrink-0">When</span>
        <p className="text-foreground/80 leading-relaxed pt-0.5">
          {triggerMeta.label || rule.trigger_type}{triggerValueLabel() ? ` ${triggerMeta.valueLabel || 'to'} ${triggerValueLabel()}` : ''}
        </p>
      </div>
      {conditions.length > 0 && (
        <div className="flex items-start gap-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-500/10 px-2 py-1 rounded shrink-0">If</span>
          <div className="space-y-0.5 pt-0.5">
            {conditions.map((c, i) => (
              <p key={i} className="text-foreground/80">
                {i > 0 && <span className="text-muted-foreground font-medium mr-1">AND</span>}
                {c.field} {c.operator.replace(/_/g, ' ')} {c.value || ''}
              </p>
            ))}
          </div>
        </div>
      )}
      <div className="flex items-start gap-3">
        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-500/10 px-2 py-1 rounded shrink-0">Then</span>
        <div className="space-y-0.5 pt-0.5">
          {actions.length === 0 ? (
            <p className="text-muted-foreground italic">No actions configured</p>
          ) : (
            actions.map((a, i) => (
              <p key={i} className="text-foreground/80 flex items-center gap-1.5">
                {i > 0 && <ArrowRight className="w-3 h-3 text-muted-foreground" />}
                {actionLabel(a)}
              </p>
            ))
          )}
        </div>
      </div>
    </div>
  );
}