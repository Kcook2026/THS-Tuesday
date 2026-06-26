# Tuesday Workspace v1.0 — Documentation Index

**Last Updated:** June 26, 2026  
**Version:** 1.0 Release Candidate

---

## Documentation Overview

This index provides a comprehensive guide to all Tuesday Workspace documentation, organized by audience and purpose.

---

## 1. Architecture Documentation

### 1.1 High-Level Architecture

**File:** [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

**Contents:**
- System overview
- Component diagram
- Data flow
- Technology stack
- Design principles

**Audience:** Developers, Architects, Technical Leads

**Key Sections:**
```
1. Overview
2. System Architecture
3. Frontend Architecture
4. Backend Architecture
5. Data Model
6. Security Architecture
7. Integration Points
8. Scalability Considerations
```

### 1.2 Folder Structure

**Location:** Root directory

**Structure:**
```
src/
├── api/                    # API clients
│   └── base44Client.js     # Base44 SDK wrapper
├── components/             # React components
│   ├── automations/        # Automation components
│   ├── forms/              # Form components
│   ├── layout/             # Layout components
│   ├── shared/             # Shared components
│   ├── ui/                 # shadcn/ui components
│   └── workboards/         # Workboard components
├── config/                 # Configuration files
│   └── PermissionConfig.js # Permission definitions
├── entities/               # Entity schemas (JSON)
├── functions/              # Backend functions (Deno)
├── hooks/                  # Custom React hooks
├── lib/                    # Core libraries
│   ├── AuthContext.jsx     # Authentication context
│   ├── WorkspaceContext.jsx # Workspace context
│   └── workboardService.js # Workboard utilities
├── pages/                  # Page components
├── tests/                  # Test files
└── docs/                   # Documentation
```

**Audience:** Developers, New Team Members

---

## 2. Context Documentation

### 2.1 Authentication Context

**File:** `lib/AuthContext.jsx`

**Purpose:** Manages user authentication state across the application

**API:**
```javascript
const {
  user,                    // Current user object
  isAuthenticated,         // Boolean
  isLoadingAuth,          // Loading state
  authError,              // Error object
  logout,                 // Logout function
  navigateToLogin,        // Redirect to login
} = useAuth();
```

**Usage Example:**
```javascript
import { useAuth } from '@/lib/AuthContext';

function MyComponent() {
  const { user, isAuthenticated } = useAuth();
  
  if (!isAuthenticated) return <Login />;
  return <div>Welcome, {user.full_name}!</div>;
}
```

**Audience:** Frontend Developers

### 2.2 Workspace Context

**File:** `lib/WorkspaceContext.jsx`

**Purpose:** Manages workspace state and switching

**API:**
```javascript
const {
  user,                    // Current user
  workspaces,              // Array of workspaces
  currentWorkspaceId,      // Selected workspace ID
  currentWorkspace,        // Selected workspace object
  switchWorkspace,         // Function to switch workspace
  createWorkspace,         // Function to create workspace
  refresh,                 // Refresh workspace data
  isAdmin,                 // Is admin flag
} = useWorkspace();
```

**Usage Example:**
```javascript
import { useWorkspace } from '@/lib/WorkspaceContext';

function WorkspaceSwitcher() {
  const { workspaces, currentWorkspaceId, switchWorkspace } = useWorkspace();
  
  return (
    <select value={currentWorkspaceId} onChange={e => switchWorkspace(e.target.value)}>
      {workspaces.map(ws => (
        <option key={ws.id} value={ws.id}>{ws.workspace_name}</option>
      ))}
    </select>
  );
}
```

**Audience:** Frontend Developers

---

## 3. Permission Documentation

### 3.1 Permission Configuration

**File:** [`config/PermissionConfig.js`](config/PermissionConfig.js)

**Purpose:** Defines all permission levels and roles

**Permission Levels:**
```
Account Roles (Organization-wide):
- System Admin (Level 5)
- Executive (Level 4)
- Manager (Level 3)
- Member (Level 2)
- Viewer (Level 1)

Workspace Roles:
- Workspace Owner (Level 5)
- Workspace Manager (Level 4)
- Workspace Member (Level 3)
- Workspace Viewer (Level 2)
- Workspace Observer (Level 2, read-only)

Workboard Roles:
- Workboard Owner (Level 5)
- Workboard Editor (Level 4)
- Workboard Contributor (Level 3)
- Assigned Contributor (Level 2)
- Workboard Viewer (Level 1, read-only)
```

**Usage:**
```javascript
import { usePermissions } from '@/hooks/usePermissions';

function MyComponent() {
  const { can, canManageWorkboard, accountRole } = usePermissions();
  
  if (!can('createWorkboards')) return null;
  return <Button>Create Board</Button>;
}
```

**Audience:** Developers, Security Auditors

### 3.2 Permission Enforcement

**File:** `hooks/usePermissions.js`

**Key Functions:**
- `can(action)` - Check if user can perform action
- `canAccessWorkboard(workboardId, workboard)` - Check board access
- `canManageWorkboard(workboardId)` - Check board management
- `canCreateAutomation(scope)` - Check automation creation

**Audience:** Developers

---

## 4. Workboard Lifecycle Documentation

### 4.1 Board Creation

**Process:**
1. User clicks "Create Workboard"
2. System creates `Workboard` entity
3. System creates default `BoardGroup` (e.g., "To Do", "In Progress", "Done")
4. System creates default `StatusOption` records
5. System creates default `PriorityOption` records
6. System creates `WorkboardMember` for creator as owner
7. System creates default `BoardColumn` records

**Code:** `pages/Workboards.jsx` - `handleCreateBoard()`

**Audience:** Developers

### 4.2 Board Management

**Operations:**
- **Rename:** Update `Workboard.name`
- **Archive:** Set `status: 'archived'`, `archived: true`, `archived_date`
- **Restore:** Set `status: 'active'`, `archived: false`
- **Delete:** Soft delete with `deleted_date`, cleanup related data

**Cleanup Function:** `lib/workboardService.js` - `safeDeleteBoardData()`

**Entities Cleaned:**
- WorkboardItem
- BoardGroup
- BoardColumn
- StatusOption
- PriorityOption
- WorkboardMember
- WorkboardItemValue
- Activity

**Audience:** Developers

### 4.3 Board Access Control

**Visibility Types:**
- **Public Workspace:** Visible to all workspace members
- **Private:** Visible only to invited board members
- **Restricted:** Visible only to assigned users

**Access Check:** `hooks/usePermissions.js` - `canAccessWorkboard()`

**Audience:** Developers, Security Auditors

---

## 5. Forms Lifecycle Documentation

### 5.1 Form Creation

**Process:**
1. User creates `Form` entity
2. User adds `FormField` records
3. User configures field mappings (system fields, custom columns)
4. User publishes form (sets `status: 'published'`)

**Form Types:**
- **Workboard Form:** Creates WorkboardItem on submission
- **Standalone Form:** Only creates FormSubmission record

**Code:** `pages/FormBuilder.jsx`

**Audience:** Developers, Form Designers

### 5.2 Form Submission

**Process:**
1. User fills form
2. System validates required fields
3. System creates `FormSubmission` record
4. System creates `FormSubmissionValue` records for each field
5. If workboard form:
   - Creates `WorkboardItem`
   - Creates `WorkboardItemValue` for mapped columns
   - Creates `Attachment` for file uploads
   - Creates notifications for assignees
6. Increments form `submission_count`

**Code:** `functions/submitForm.js`

**Audience:** Developers

### 5.3 Form Management

**Operations:**
- **Draft:** Edit form structure
- **Publish:** Make form available for submission
- **Archive:** Prevent new submissions, keep existing data
- **Delete:** Remove form and submissions (cascade)

**Code:** `pages/FormsLibrary.jsx`

**Audience:** Form Designers, Administrators

---

## 6. Automation Engine Documentation

### 6.1 Automation Architecture

**File:** `functions/processAutomationEvent.js`

**Components:**
- **Trigger:** Event that starts automation (e.g., status change)
- **Condition:** Filters when automation runs (e.g., only for specific status)
- **Action:** What automation does (e.g., assign owner, send notification)

**Trigger Types:**
- `item_created` - New item created
- `item_updated` - Item updated
- `status_changed` - Status field changed
- `priority_changed` - Priority field changed
- `owner_changed` - Owner field changed
- `due_date_changed` - Due date changed
- `item_moved_to_group` - Item moved to different group
- `form_submitted` - Form submitted
- `comment_added` - Comment added
- `file_uploaded` - File uploaded

**Audience:** Developers, Automation Designers

### 6.2 Automation Actions

**Available Actions:**
- `change_status` - Change item status
- `change_priority` - Change item priority
- `assign_owner` - Assign item owner
- `assign_assignee` - Assign item assignee
- `move_to_group` - Move item to group
- `create_sub_item` - Create sub-item
- `set_custom_column` - Set custom column value
- `clear_custom_column` - Clear custom column
- `create_comment` - Add comment
- `archive_item` - Archive item
- `notify_owner` - Send notification to owner
- `notify_assignee` - Send notification to assignee
- `notify_specific_user` - Send notification to specific user
- `notify_workboard_owners` - Notify board owners
- `notify_watchers` - Notify item watchers

**Code:** `functions/processAutomationEvent.js` - `performActions()`

**Audience:** Automation Designers

### 6.3 Automation Execution Flow

**Flow:**
1. Entity event occurs (create/update/delete)
2. `processAutomationEvent` function triggered
3. Determine triggers from event type and changed fields
4. Fetch automation rules for workspace
5. Filter rules by trigger type and workboard
6. Evaluate conditions for each rule
7. Execute actions for matching rules
8. Create `AutomationRun` record
9. Create `AutomationLog` entries
10. Update rule `run_count` and `last_run_date`

**Cooldown:** 60 seconds per rule per item (prevents infinite loops)

**Audience:** Developers

---

## 7. Notification Flow Documentation

### 7.1 Notification Types

**Types:**
- `mention` - User mentioned in comment
- `assignment` - User assigned to item
- `comment` - New comment on watched item
- `status_change` - Item status changed
- `deadline` - Item deadline approaching
- `system` - System-generated notification

**Entity:** `Notification`

**Audience:** Developers

### 7.2 Notification Creation

**Triggers:**
1. **Mentions:** Comment with @username
2. **Assignments:** Item owner/assignee changed
3. **Automations:** Automation action creates notification
4. **Form Submissions:** New form submission
5. **Watchers:** Activity on watched item

**Code:**
- `components/workboards/UpdatesSection.jsx` - Mention notifications
- `functions/submitForm.js` - Assignment notifications
- `functions/processAutomationEvent.js` - Automation notifications

**Audience:** Developers

### 7.3 Notification Delivery

**Channels:**
- In-app notification bell
- Email (future)
- Push notifications (future)

**Current:** In-app only

**Audience:** Product Managers

---

## 8. Database Entity Documentation

### 8.1 Core Entities

**Workboard:**
```json
{
  "name": "Workboard",
  "properties": {
    "name": "string",
    "workspace": "Workspace",
    "owner": "User",
    "status": "active|archived|deleted",
    "visibility": "public_workspace|private|restricted",
    "assigned_users": "User[]"
  }
}
```

**WorkboardItem:**
```json
{
  "name": "WorkboardItem",
  "properties": {
    "title": "string",
    "workspace": "Workspace",
    "workboard": "Workboard",
    "group": "BoardGroup",
    "owner": "User",
    "assignee": "User",
    "status": "string",
    "priority": "string",
    "due_date": "date"
  }
}
```

**BoardColumn:**
```json
{
  "name": "BoardColumn",
  "properties": {
    "name": "string",
    "workboard": "Workboard",
    "column_type": "text|status|priority|date|...",
    "system_column": "boolean"
  }
}
```

**WorkboardItemValue:**
```json
{
  "name": "WorkboardItemValue",
  "properties": {
    "item": "WorkboardItem",
    "column": "BoardColumn",
    "value": "string",
    "display_value": "string"
  }
}
```

**Audience:** Developers, Database Administrators

### 8.2 Relationship Diagram

```
Workspace (1) ──→ (N) Workboard
Workspace (1) ──→ (N) WorkspaceMember
Workspace (1) ──→ (N) Team
Workspace (1) ──→ (N) Form

Workboard (1) ──→ (N) WorkboardItem
Workboard (1) ──→ (N) BoardGroup
Workboard (1) ──→ (N) BoardColumn
Workboard (1) ──→ (N) StatusOption
Workboard (1) ──→ (N) PriorityOption
Workboard (1) ──→ (N) WorkboardMember

WorkboardItem (1) ──→ (N) WorkboardItemValue
WorkboardItem (1) ──→ (N) Comment
WorkboardItem (1) ──→ (N) Attachment
WorkboardItem (1) ──→ (N) ItemWatcher

Form (1) ──→ (N) FormField
Form (1) ──→ (N) FormSubmission
FormSubmission (1) ──→ (N) FormSubmissionValue

AutomationRule (1) ──→ (N) AutomationRun
AutomationRun (1) ──→ (N) AutomationLog

User (1) ──→ (N) Notification (as recipient)
User (1) ──→ (N) Activity
```

**Audience:** Developers, Architects

---

## 9. Backend Function Documentation

### 9.1 Function List

| Function | Purpose | Trigger |
|----------|---------|---------|
| `processAutomationEvent` | Process automation triggers | Entity events |
| `runAutomation` | Manually test automation | User action |
| `submitForm` | Submit form and create items | Form submission |
| `createNotification` | Create notification | Internal API |
| `checkDueDateTriggers` | Check due date automations | Scheduled |
| `runDateAutomations` | Run date-based automations | Scheduled |
| `runScheduledDateAutomations` | Run scheduled date checks | Cron |
| `seedStarterRecipes` | Create starter automations | One-time |
| `cleanupDuplicateOptions` | Remove duplicate status/priority | Maintenance |

**Location:** `functions/` directory

**Audience:** Backend Developers

### 9.2 Function Invocation

**From Frontend:**
```javascript
import { base44 } from '@/api/base44Client';

const result = await base44.functions.invoke('submitForm', {
  formId: 'form-123',
  values: { title: 'Test' },
});
```

**From Backend:**
```javascript
const result = await sr.functions.invoke('processAutomationEvent', {
  event: { type: 'update', entity_name: 'WorkboardItem' },
  data: itemData,
});
```

**Audience:** Developers

---

## 10. API Documentation

### 10.1 Entity Operations

**CRUD Operations:**
```javascript
// List
const items = await base44.entities.WorkboardItem.list();

// Filter
const items = await base44.entities.WorkboardItem.filter({
  workboard: 'wb-123',
  archived: false,
}, '-created_date', 50);

// Get
const item = await base44.entities.WorkboardItem.get('wbi-123');

// Create
const item = await base44.entities.WorkboardItem.create({
  workboard: 'wb-123',
  title: 'New Item',
});

// Update
await base44.entities.WorkboardItem.update('wbi-123', {
  status: 'In Progress',
});

// Delete
await base44.entities.WorkboardItem.delete('wbi-123');

// Bulk Operations
await base44.entities.WorkboardItem.bulkCreate([...]);
await base44.entities.WorkboardItem.bulkUpdate([...]);
await base44.entities.WorkboardItem.updateMany({ status: 'active' }, { $set: { archived: true } });
await base44.entities.WorkboardItem.deleteMany({ archived: true });
```

**Audience:** Developers

### 10.2 Integration Operations

**File Upload:**
```javascript
const { file_url } = await base44.integrations.Core.UploadFile({
  file: fileObject,
});
```

**LLM Invocation:**
```javascript
const response = await base44.integrations.Core.InvokeLLM({
  prompt: 'Summarize this item',
  add_context_from_internet: false,
});
```

**Audience:** Developers

---

## 11. Extension Points

### 11.1 Adding New Entity Types

**Process:**
1. Create `entities/NewEntity.json` schema
2. Add to database (automatic in Base44)
3. Create pages/components for CRUD
4. Add permissions to `PermissionConfig.js`
5. Add to navigation

**Example:** See `entities/Workboard.json`

**Audience:** Developers

### 11.2 Adding New Backend Functions

**Process:**
1. Create `functions/newFunction.js`
2. Implement Deno.serve handler
3. Add authentication/authorization
4. Test with `test_backend_function`
5. Invoke from frontend

**Example:** See `functions/submitForm.js`

**Audience:** Backend Developers

### 11.3 Adding New Automation Triggers

**Process:**
1. Add trigger type to `processAutomationEvent.js` - `determineTriggers()`
2. Add trigger label to automation builder
3. Test with sample data
4. Document in automation builder UI

**Example:** See `functions/processAutomationEvent.js`

**Audience:** Backend Developers

### 11.4 Adding New Automation Actions

**Process:**
1. Add action type to `processAutomationEvent.js` - `performActions()`
2. Add action editor to `components/automations/ActionEditor.jsx`
3. Add action constants to `components/automations/AutomationConstants.js`
4. Test with sample rule
5. Document in automation builder

**Example:** See `functions/processAutomationEvent.js`

**Audience:** Backend Developers

---

## 12. Future Module Guidelines

### 12.1 Module Structure

**Recommended Structure:**
```
src/
├── components/
│   └── newmodule/
│       ├── NewModuleList.jsx
│       ├── NewModuleDetail.jsx
│       └── NewModuleForm.jsx
├── pages/
│   └── NewModule.jsx
├── entities/
│   └── NewEntity.json
└── hooks/
    └── useNewModule.js
```

**Audience:** Developers

### 12.2 Naming Conventions

**Entities:** PascalCase singular (e.g., `WorkboardItem`)
**Components:** PascalCase (e.g., `WorkboardDetail`)
**Pages:** PascalCase (e.g., `Workboards`)
**Hooks:** camelCase with `use` prefix (e.g., `useWorkboardData`)
**Functions:** camelCase (e.g., `submitForm`)
**Files:** Match component/function name

**Audience:** All Developers

### 12.3 Code Style

**JavaScript:** ES6+ (no TypeScript currently)
**Components:** Functional with hooks
**State:** React useState/useReducer
**Data Fetching:** TanStack Query (React Query)
**Styling:** Tailwind CSS
**UI Components:** shadcn/ui + Radix UI

**Audience:** All Developers

---

## 13. Security Guidelines

### 13.1 Authentication

**Always verify authentication:**
```javascript
const user = await base44.auth.me();
if (!user) throw new Error('Unauthorized');
```

**Audience:** Backend Developers

### 13.2 Authorization

**Always check permissions:**
```javascript
const { canManageWorkboard } = usePermissions();
if (!canManageWorkboard(boardId)) return null;
```

**Audience:** Frontend Developers

### 13.3 Input Validation

**Always validate input:**
```javascript
if (!file || file.size > MAX_SIZE) throw new Error('Invalid file');
if (!ALLOWED_TYPES.includes(file.type)) throw new Error('Invalid type');
```

**Audience:** All Developers

### 13.4 Data Isolation

**Always filter by workspace:**
```javascript
const items = await base44.entities.WorkboardItem.filter({
  workspace: currentWorkspaceId,
  workboard: boardId,
});
```

**Audience:** All Developers

---

## 14. Troubleshooting Guide

### 14.1 Common Issues

**Issue:** "Cannot read properties of null"
**Cause:** Entity not found or permission denied
**Solution:** Check entity exists and user has access

**Issue:** "Rate limit exceeded"
**Cause:** Too many concurrent API calls
**Solution:** Use Promise.all for batching, add delays

**Issue:** "Subscription not cleaning up"
**Cause:** Missing useEffect cleanup
**Solution:** Add `return () => unsubscribe()`

**Issue:** "N+1 query problem"
**Cause:** Loop with API calls
**Solution:** Batch queries, use Promise.all

**Audience:** Developers

### 14.2 Debug Tools

**Base44 Dashboard:**
- Entity browser
- Function logs
- Automation run history
- Activity logs

**Browser DevTools:**
- React DevTools
- Network tab
- Console logs

**Audience:** Developers

---

## 15. Support and Contact

### 15.1 Internal Support

**Documentation Issues:** Update this documentation
**Code Issues:** Check existing tests
**Platform Issues:** Contact Base44 support

### 15.2 External Resources

**Base44 Docs:** https://docs.base44.com
**React Docs:** https://react.dev
**Tailwind Docs:** https://tailwindcss.com
**shadcn/ui:** https://ui.shadcn.com

---

## Documentation Changelog

**v1.0 (June 26, 2026):**
- Initial documentation release
- Architecture documentation
- Security audit report
- Performance report
- Testing coverage report
- API documentation

---

## Index by Audience

### For New Developers
1. Start with **Architecture Documentation**
2. Read **Folder Structure**
3. Review **Context Documentation**
4. Study **Permission Documentation**
5. Review **Code Style** guidelines

### For Frontend Developers
1. **Context Documentation** (Auth, Workspace)
2. **Permission Documentation**
3. **Entity Documentation**
4. **API Documentation**
5. **Component Guidelines**

### For Backend Developers
1. **Backend Function Documentation**
2. **Automation Engine Documentation**
3. **Security Guidelines**
4. **Extension Points**
5. **API Documentation**

### For Security Auditors
1. **Security Architecture** (in ARCHITECTURE.md)
2. **Permission Documentation**
3. **Security Guidelines**
4. **SECURITY_REPORT.md**

### For Product Managers
1. **Architecture Overview**
2. **Forms Lifecycle**
3. **Automation Engine**
4. **Notification Flow**

### For QA Engineers
1. **Testing Coverage Report**
2. **Regression Suite**
3. **Test Execution Guide**
4. **Troubleshooting Guide**

---

## Conclusion

This documentation index provides comprehensive coverage of Tuesday Workspace v1.0. All documentation is living and should be updated as the platform evolves.

**Maintenance:** Assign documentation owner
**Review Cycle:** Quarterly
**Version Control:** Keep in sync with code releases