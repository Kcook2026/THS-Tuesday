export function buildStatusOptions(statuses, boardMap) {
  return (statuses || []).map(s => ({
    value: s.label, label: s.label, color: s.color,
    group: boardMap?.[s.workboard],
  }));
}

export function buildPriorityOptions(priorities, boardMap) {
  return (priorities || []).map(p => ({
    value: p.label, label: p.label, color: p.color,
    group: boardMap?.[p.workboard],
  }));
}

export function buildGroupOptions(groups, boardMap) {
  return (groups || []).map(g => ({
    value: g.id, label: g.name,
    group: boardMap?.[g.workboard],
  }));
}

export function buildUserOptions(users) {
  return (users || []).map(u => ({
    value: u.user || u.id,
    label: u.user_name || u.full_name || u.user_email || u.email || 'Unknown',
  }));
}

export function buildTeamOptions(teams) {
  return (teams || []).map(t => ({ value: t.id, label: t.name || 'Unnamed Team' }));
}

export function buildColumnOptions(columns, boardMap) {
  return (columns || []).filter(c => !c.system_column).map(c => ({
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