# Tuesday Workspace — Workboard Architecture

## Overview

Workboards are the core organizational unit in Tuesday Workspace, providing a flexible table-based interface for managing work items with custom columns, groups, and hierarchical sub-items.

## Entity Relationships

### Core Entities

```
Workboard (1) ──→ (N) WorkboardItem
Workboard (1) ──→ (N) BoardGroup
Workboard (1) ──→ (N) BoardColumn
Workboard (1) ──→ (N) StatusOption
Workboard (1) ──→ (N) PriorityOption
Workboard (1) ──→ (N) WorkboardMember
WorkboardItem (1) ──→ (N) WorkboardItem (sub-items via parent_item)
WorkboardItem (1) ──→ (N) WorkboardItemValue (custom column values)
```

### Key Fields

**Workboard**
- `status`: 'active' | 'archived' | 'deleted' | 'template'
- `archived`: boolean flag for quick filtering
- `visibility`: 'public_workspace' | 'private' | 'restricted'
- `owner`: User relation (board owner)
- `workspace`: Workspace relation

**WorkboardItem**
- `parent_item`: Self-relation for sub-items
- `group`: BoardGroup relation
- `item_type`: 'main_item' | 'sub_item' | 'milestone' | 'task' | 'sop_step'
- `sort_order`: Integer for ordering within group/parent
- System fields: `owner`, `status`, `priority`, `due_date`, `progress_percentage`

**BoardColumn**
- `column_type`: Defines editor/renderer behavior
- `settings`: JSON string for type-specific config (e.g., dropdown options)
- `system_column`: true for built-in columns (not stored as BoardColumn records)

## Permission Model

### Role Hierarchy

1. **System Admin** — Full access to all boards, can delete orphaned boards
2. **Executive** — View all boards, no security authority
3. **Workspace Owner/Manager** — Create boards, manage workspace settings
4. **Workboard Owner** — Full board management (columns, groups, members, settings)
5. **Workboard Editor** — Edit items, manage groups, no member/column management
6. **Workboard Contributor** — Create/edit own items, no structural changes
7. **Workboard Viewer** — Read-only access

### Permission Checks

All permission checks flow through `usePermissions` hook:
```js
const { can, getWorkboardPermissions } = usePermissions();
const wbPerms = getWorkboardPermissions(boardId);
const canEdit = wbPerms.canEditItems;
const canManageGroups = wbPerms.canManageGroups;
```

## Board Lifecycle

### States

- **Active** — `status === 'active' && archived !== true`
- **Archived** — `status === 'archived' || archived === true` (but NOT deleted)
- **Deleted** — `status === 'deleted' || deleted_date exists`
- **Template** — `status === 'template'`

### Operations

**Archive**
1. Set `status: 'archived'`, `archived: true`, `archived_date`, `archived_by`
2. Remove from active lists
3. Show in Archived Boards section

**Restore**
1. Set `status: 'active'`, `archived: false`, clear archive metadata
2. Return to active lists

**Permanent Delete** (System Admin only)
1. Call `safeDeleteBoardData(boardId)` to cascade delete:
   - WorkboardItemValue → WorkboardItem → BoardGroup → BoardColumn → StatusOption → PriorityOption → WorkboardMember → Activity
2. Set board `status: 'deleted'`, `deleted_date`, `deleted_by`
3. Board disappears from all lists

## Data Integrity Rules

### Required Fields

- Workboard: `workspace`, `name`, `owner`, `status`
- WorkboardItem: `workspace`, `workboard`, `title`
- BoardGroup: `workspace`, `workboard`, `name`
- BoardColumn: `workspace`, `workboard`, `name`, `column_type`

### Sorting

- Groups: `sort_order` ascending
- Items within group: `sort_order` ascending (main items only, `parent_item === null`)
- Sub-items within parent: `sort_order` ascending

### Orphan Prevention

- Every board must have an `owner` (User relation)
- Every board must have at least one active WorkboardMember with role 'workboard_owner'
- Items without a valid `group` are hidden from table view
- Sub-items without a valid `parent_item` are treated as main items

## Custom Columns

### Supported Types

- **Text** — Simple string input
- **Long Text** — Textarea
- **Number** — Numeric input
- **Currency** — Number with currency symbol
- **Date** — Date picker
- **Checkbox** — Boolean toggle
- **Dropdown** — Single select from predefined options
- **Multi Select** — Multiple select from predefined options
- **Tags** — Tag input with autocomplete
- **Person** — User selector
- **Team** — Team selector
- **Department** — Department selector
- **Email** — Email input with validation
- **Phone** — Phone input
- **Link** — URL input

### Value Storage

Custom column values stored in `WorkboardItemValue`:
```js
{
  workspace: string,
  workboard: string,
  item: string,      // WorkboardItem.id
  column: string,    // BoardColumn.id
  value: string,     // JSON string for complex types
  value_type: string,
  display_value: string,
}
```

## Known Stable Baseline (v1.0)

✅ Workboard CRUD (create, rename, duplicate, archive, restore, delete)
✅ Item CRUD with sub-items
✅ Drag-and-drop reordering (groups, items, sub-items)
✅ Custom columns with value persistence
✅ Member management and board access
✅ Permission-based UI rendering
✅ Lifecycle filtering (active/archived/deleted)
✅ Real-time subscriptions for collaborative editing

## Future Roadmap

### Phase 2 — Advanced Features
- [ ] Timeline/Gantt view
- [ ] Calendar view enhancements (drag to reschedule)
- [ ] Dashboard widgets (board summaries, charts)
- [ ] Automation rules (IF-THEN triggers)
- [ ] Formula columns
- [ ] Mirror columns (cross-board references)
- [ ] Dependency tracking

### Phase 3 — Enterprise
- [ ] Multi-workspace boards
- [ ] Board templates with one-click apply
- [ ] Advanced permissions (field-level, row-level)
- [ ] Audit log viewer
- [ ] Data retention policies
- [ ] Bulk operations API

## Technical Debt Notes

- Task entity remains for legacy TaskBoard/TaskTable pages but is NOT used by Workboards
- WorkboardItem is the canonical work item model
- DnD uses `@dnd-kit` with CSS transforms on table rows (visual glitches possible during drag)
- `WorkboardItemValue` cleanup only happens on full board delete (minor data hygiene issue)