// Dedupe helper: keeps the record with the lowest sort_order (then oldest created_date)
function dedupe(records, keyFn) {
  const sorted = [...records].sort((a, b) => {
    const so = (a.sort_order ?? 0) - (b.sort_order ?? 0);
    if (so !== 0) return so;
    return new Date(a.created_date || 0) - new Date(b.created_date || 0);
  });
  const seen = new Map();
  for (const r of sorted) {
    const key = keyFn(r);
    if (!seen.has(key)) seen.set(key, r);
  }
  return Array.from(seen.values());
}

export function buildStatusOptions(statuses, boardMap) {
  const deduped = dedupe(statuses || [], s => `${s.workboard || ''}|${s.label}|${s.color}`);
  return deduped.map(s => ({
    value: s.label, label: s.label, color: s.color,
    group: boardMap?.[s.workboard],
  }));
}

export function buildPriorityOptions(priorities, boardMap) {
  const deduped = dedupe(priorities || [], p => `${p.workboard || ''}|${p.label}|${p.color}`);
  return deduped.map(p => ({
    value: p.label, label: p.label, color: p.color,
    group: boardMap?.[p.workboard],
  }));
}

export function buildGroupOptions(groups, boardMap) {
  const deduped = dedupe(groups || [], g => g.id);
  return deduped.map(g => ({
    value: g.id, label: g.name,
    group: boardMap?.[g.workboard],
  }));
}

export function buildUserOptions(users) {
  const deduped = dedupe(users || [], u => u.user || u.id);
  return deduped.map(u => ({
    value: u.user || u.id,
    label: u.user_name || u.full_name || u.user_email || u.email || 'Unknown',
  }));
}

export function buildTeamOptions(teams) {
  const deduped = dedupe(teams || [], t => t.id);
  return deduped.map(t => ({ value: t.id, label: t.name || 'Unnamed Team' }));
}

export function buildColumnOptions(columns, boardMap) {
  const deduped = dedupe(columns || [], c => c.id);
  return deduped.filter(c => !c.system_column).map(c => ({
    value: c.id, label: c.name,
    group: boardMap?.[c.workboard],
  }));
}

export function buildBoardOptions(boards) {
  return (boards || []).map(b => ({ value: b.id, label: b.name }));
}

export function buildItemOptions(items, boardMap) {
  return (items || []).map(i => ({
    value: i.id, label: i.title || 'Untitled',
    group: boardMap?.[i.workboard],
  }));
}

export function getColumnChoices(column) {
  if (!column?.settings) return [];
  try {
    const settings = JSON.parse(column.settings);
    return settings.choices || settings.options || [];
  } catch { return []; }
}

export function findColumn(columns, columnId) {
  return (columns || []).find(c => c.id === columnId);
}