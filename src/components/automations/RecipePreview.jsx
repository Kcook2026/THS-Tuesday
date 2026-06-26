import React, { useMemo } from 'react';
import { ArrowRight } from 'lucide-react';
import { OPERATOR_LABELS, getTriggerMeta, getActionMeta, getConditionMeta } from './AutomationConstants';

export default function RecipePreview({ rule, boardData }) {
  const triggerMeta = getTriggerMeta(rule.trigger_type);
  let tc = {};
  try { tc = JSON.parse(rule.trigger_config || '{}'); } catch {}

  let conditions = [];
  try { conditions = JSON.parse(rule.conditions || '[]'); } catch {}

  let actions = [];
  try { actions = JSON.parse(rule.actions || '[]'); } catch {}

  const lookups = useMemo(() => {
    const bd = boardData || {};
    const groupMap = {};
    (bd.groups || []).forEach(g => { groupMap[g.id] = g.name; });
    const userMap = {};
    (bd.users || []).forEach(u => {
      const id = u.id || u.user;
      userMap[id] = u.full_name || u.user_name || u.email || u.user_email || 'Unknown';
    });
    const teamMap = {};
    (bd.teams || []).forEach(t => { teamMap[t.id] = t.name || 'Unnamed Team'; });
    const columnMap = {};
    (bd.columns || []).forEach(c => { columnMap[c.id] = c.name; });
    // Status and priority maps: ID -> label
    const statusMap = {};
    (bd.statuses || []).forEach(s => { statusMap[s.id] = s.label; });
    const priorityMap = {};
    (bd.priorities || []).forEach(p => { priorityMap[p.id] = p.label; });
    return { groupMap, userMap, teamMap, columnMap, statusMap, priorityMap };
  }, [boardData]);

  const resolveValue = (value, valueType) => {
    if (!value) return '';
    if (valueType === 'group') return lookups.groupMap[value] || value;
    if (valueType === 'user') return lookups.userMap[value] || value;
    if (valueType === 'team') return lookups.teamMap[value] || value;
    if (valueType === 'status') return lookups.statusMap[value] || value;
    if (valueType === 'priority') return lookups.priorityMap[value] || value;
    return value;
  };

  const triggerValueLabel = () => {
    if (!tc.value && !tc.days) return '';
    if (rule.trigger_type === 'due_date_x_days_away') return `${tc.days} day(s) away`;
    return resolveValue(tc.value, triggerMeta.valueType);
  };

  const actionLabel = (action) => {
    const meta = getActionMeta(action.type);
    const label = meta.label || action.type;
    if (action.type === 'set_custom_column') {
      const colName = lookups.columnMap[action.column] || action.column || 'column';
      return `${label}: ${colName} → "${action.value || ''}"`;
    }
    if (action.type === 'clear_custom_column') {
      const colName = lookups.columnMap[action.column] || action.column || 'column';
      return `${label}: ${colName}`;
    }
    if (action.type === 'create_sub_item') {
      return `${label}: "${action.value || ''}"`;
    }
    if (action.value && meta.valueType === 'text') return `${label}: "${action.value}"`;
    if (action.value) return `${label} → ${resolveValue(action.value, meta.valueType)}`;
    return label;
  };

  const conditionLabel = (c) => {
    const meta = getConditionMeta(c.field);
    const fieldLabel = meta.label || c.field;
    const opLabel = OPERATOR_LABELS[c.operator] || c.operator.replace(/_/g, ' ');
    if (['is_empty', 'is_not_empty', 'is_before_today', 'is_after_today'].includes(c.operator)) {
      return `${fieldLabel} ${opLabel}`;
    }
    if (c.field === 'custom_column' && c.column) {
      const colName = lookups.columnMap[c.column] || c.column;
      return `${colName} ${opLabel} ${c.value || ''}`;
    }
    return `${fieldLabel} ${opLabel} ${resolveValue(c.value, meta.valueType)}`;
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
                {conditionLabel(c)}
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