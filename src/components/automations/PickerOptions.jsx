// Dedupe helper: keeps the record with the lowest sort_order (then oldest created_date)
// For status/priority: dedupe by workspace + workboard + NORMALIZED LABEL ONLY (not color)
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

// Normalize label: trim whitespace, lowercase for comparison
function normalizeLabel(label) {
  return (label || '').toString().trim().toLowerCase();
}

export function buildStatusOptions(statuses, boardMap) {
  // Dedupe by workspace + workboard + normalized label (NOT color)
  const deduped = dedupe(statuses || [], s => `${s.workspace || ''}|${s.workboard || ''}|${normalizeLabel(s.label)}`);
  return deduped.map(s => ({
    value: s.id,  // Store ID, not label
    label: s.label,
    color: s.color,
    group: boardMap?.[s.workboard],
  }));
}

export function buildPriorityOptions(priorities, boardMap) {
  // Dedupe by workspace + workboard + normalized label (NOT color)
  const deduped = dedupe(priorities || [], p => `${p.workspace || ''}|${p.workboard || ''}|${normalizeLabel(p.label)}`);
  return deduped.map(p => ({
    value: p.id,  // Store ID, not label
    label: p.label,
    color: p.color,
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
  // users can be WorkspaceMember records OR User entity records
  const deduped = dedupe(users || [], u => {
    // For WorkspaceMember: use u.user (the User entity id)
    // For User entity: use u.id
    return u.user || u.id;
  });
  return deduped.map(u => {
    // Handle both WorkspaceMember and User entity formats
    let userId, label, email, fullName;
    
    if (u.full_name !== undefined) {
      // This is a User entity record
      userId = u.id;
      fullName = u.full_name || '';
      email = u.email || '';
      // Try to extract first/last from full_name or use username
      label = fullName || email || u.data?.username || 'Unknown User';
    } else {
      // This is a WorkspaceMember record
      userId = u.user || u.id;
      fullName = u.user_name || u.full_name || '';
      email = u.user_email || u.email || '';
      label = fullName || email || 'Unknown User';
    }
    
    return {
      value: userId,  // Always use real User id
      label,
      email,
      fullName,
    };
  });
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

// Helper to resolve label-based values to IDs for backward compatibility
export function resolveStatusIdByLabel(statuses, value) {
  if (!value || !statuses) return value;
  // If already an ID, return as-is
  if (statuses.find(s => s.id === value)) return value;
  // Otherwise try to resolve by normalized label
  const normalized = normalizeLabel(value);
  const match = statuses.find(s => normalizeLabel(s.label) === normalized);
  return match?.id || value;
}

export function resolvePriorityIdByLabel(priorities, value) {
  if (!value || !priorities) return value;
  // If already an ID, return as-is
  if (priorities.find(p => p.id === value)) return value;
  // Otherwise try to resolve by normalized label
  const normalized = normalizeLabel(value);
  const match = priorities.find(p => normalizeLabel(p.label) === normalized);
  return match?.id || value;
}