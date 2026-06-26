# Tuesday Workspace v1.0 — Architecture Documentation

## Overview

Tuesday Workspace is a comprehensive project management platform built on Base44 BaaS (Backend-as-a-Service). It provides workspaces, workboards, task management, forms, automations, and collaboration features.

## Technology Stack

- **Frontend:** React 18 + Vite + Tailwind CSS + shadcn/ui
- **State Management:** React Context + TanStack Query
- **Routing:** React Router v6
- **Backend:** Base44 BaaS (entities, functions, automations)
- **Database:** Base44 managed database (MongoDB-compatible)
- **Authentication:** Base44 Auth (JWT-based)

## Folder Structure

```
src/
├── api/                    # API clients
│   └── base44Client.js     # Base44 SDK initialization
├── components/             # React components
│   ├── automations/        # Automation UI components
│   ├── forms/              # Form builder and submission components
│   ├── layout/             # Layout components (AppLayout, Sidebar, etc.)
│   ├── shared/             # Shared reusable components
│   ├── ui/                 # shadcn/ui components
│   └── workboards/         # Workboard-specific components
├── config/                 # Configuration files
│   └── PermissionConfig.js # Permission definitions
├── entities/               # Entity schemas (JSON)
├── functions/              # Backend functions (Deno)
├── hooks/                  # Custom React hooks
├── lib/                    # Core libraries and utilities
│   ├── AuthContext.jsx     # Authentication context
│   ├── WorkspaceContext.jsx # Workspace management context
│   ├── workboardService.js # Workboard utilities
│   └── utils.js            # General utilities
├── pages/                  # Page components (routes)
├── tests/                  # Test suites
│   ├── unit/               # Unit tests
│   ├── integration/        # Integration tests
│   └── regression/         # Regression tests
└── docs/                   # Documentation
```

## Core Concepts

### Workspace
Top-level organizational unit. Users belong to workspaces and have roles within them.

### Workboard
Project/task boards within a workspace. Contains items (tasks), columns, groups, and statuses.

### WorkboardItem
Individual tasks or items within a workboard. Can have sub-items, attachments, comments, and custom field values.

### Form
Dynamic form builder that can create workboard items from submissions.

### Automation
Rule-based system that triggers actions based on events (status changes, form submissions, etc.).

## Context Architecture

### AuthContext
Manages authentication state, user session, and login/logout flows.

**Location:** `lib/AuthContext.jsx`

**Key Methods:**
- `checkAppState()` - Initializes app and auth state
- `logout(shouldRedirect)` - Logs out user
- `navigateToLogin()` - Redirects to login page

### WorkspaceContext
Manages workspace selection, switching, and workspace-level data.

**Location:** `lib/WorkspaceContext.jsx`

**Key Methods:**
- `switchWorkspace(workspaceId)` - Changes current workspace
- `createWorkspace(data)` - Creates new workspace
- `refresh()` - Reloads workspace data

**Persistence:** Selected workspace stored in localStorage (`tuesday_current_workspace`)

### usePermissions Hook
Centralized permission checking across account, workspace, and workboard levels.

**Location:** `hooks/usePermissions.js`

**Returns:**
- `accountRole` - User's account-level role
- `workspaceRole` - User's workspace role
- `can(action)` - Check if user can perform action
- `canAccessWorkboard(workboardId)` - Check board access
- `canManageWorkboard(workboardId)` - Check board management

## Permission System

### Account Roles (Organization-wide)
1. **System Admin** (level 5) - Full system access
2. **Executive** (level 4) - View all, create automations
3. **Manager** (level 3) - Workspace automations
4. **Member** (level 2) - Workboard automations
5. **Viewer** (level 1) - Read-only access

### Workspace Roles
1. **Workspace Owner** - Full workspace control
2. **Workspace Manager** - Invite users, manage boards
3. **Workspace Member** - Standard member
4. **Workspace Viewer** - Read-only workspace access
5. **Workspace Observer** - Limited read-only

### Workboard Roles
1. **Workboard Owner** - Full board control
2. **Workboard Editor** - Edit content, manage groups
3. **Workboard Contributor** - Create/edit items
4. **Assigned Contributor** - Edit assigned items only
5. **Workboard Viewer** - Read-only board access

**Configuration:** `config/PermissionConfig.js`

## Workboard Lifecycle

### Creation
1. User creates workboard via `Workboards.jsx`
2. System creates default groups, status options, priority options
3. Creator becomes workboard owner
4. Workboard appears in sidebar

### Active State
- Visible in workboard list
- Accessible to workspace members (based on visibility)
- Can create/edit items

### Archived State
- Moved to archived boards section
- Read-only access
- Can be restored

### Deleted State
- Soft-deleted (deleted_date set)
- Removed from active lists
- Can be permanently deleted by admin

**Utilities:** `lib/workboardService.js`

## Forms Lifecycle

### Creation
1. User creates form in Forms Library
2. Builder mode: Classic (field list) or Canvas (drag-drop)
3. Fields mapped to workboard columns or system fields

### Publishing
1. Form status changed to 'published'
2. Form accessible via submit URL
3. Submissions create workboard items (if workboard form)

### Submission Flow
1. User submits form via `FormSubmit.jsx`
2. `functions/submitForm.js` processes submission
3. Creates FormSubmission record
4. Creates WorkboardItem (if workboard form)
5. Creates WorkboardItemValue for mapped columns
6. Creates Attachment records for file uploads
7. Sends notifications to assignees/owners

**Backend:** `functions/submitForm.js`

## Automation Engine

### Trigger Types
- `item_created` - New item created
- `item_updated` - Item updated
- `status_changed` - Status field changed
- `priority_changed` - Priority field changed
- `owner_changed` - Owner changed
- `assignee_changed` - Assignee changed
- `due_date_changed` - Due date changed
- `item_moved_to_group` - Item moved to different group
- `form_submitted` - Form submission
- `comment_added` - New comment
- `file_uploaded` - New attachment
- `manual` - Manual trigger

### Condition Types
- `equals` / `not_equals` - Field value comparison
- `is_empty` / `is_not_empty` - Field presence
- `is_before_today` / `is_after_today` - Date comparison
- `contains` - Text contains
- Custom column conditions via WorkboardItemValue lookup

### Action Types
- `change_status` - Update item status
- `change_priority` - Update item priority
- `assign_owner` / `assign_assignee` - Assign users
- `move_to_group` - Move to different group
- `create_sub_item` - Create sub-item
- `set_custom_column` - Set custom field value
- `create_comment` - Add comment
- `archive_item` - Archive item
- `notify_*` - Various notification types

### Execution Flow
1. Event triggered (entity create/update/delete)
2. `functions/processAutomationEvent.js` receives event
3. Determines triggers from event type and changed fields
4. Filters matching rules by trigger type and workboard
5. Evaluates conditions for each rule
6. Executes actions for matching rules
7. Logs execution in AutomationRun and AutomationLog
8. Creates notifications as needed

**Cooldown:** 60 seconds between executions per rule/item to prevent loops

**Backend:** `functions/processAutomationEvent.js`

## Notification System

### Notification Types
- `mention` - User mentioned in comment
- `assignment` - User assigned to item
- `comment` - New comment on watched item
- `status_change` - Status changed on watched item
- `deadline` - Approaching due date
- `system` - System-generated notifications

### Creation Flow
1. Event occurs (mention, assignment, automation)
2. Notification entity created
3. Real-time subscription updates notification bell
4. User clicks notification → navigates to target_url

**Entity:** `Notification`

## Database Entities

### Core Entities
- `Workspace` - Top-level organization
- `WorkspaceMember` - User membership in workspace
- `Workboard` - Project/task board
- `WorkboardMember` - User membership in workboard
- `WorkboardItem` - Task/item within board
- `BoardColumn` - Custom column definition
- `BoardGroup` - Item grouping (rows)
- `StatusOption` / `PriorityOption` - Dropdown options
- `WorkboardItemValue` - Custom field values

### Collaboration Entities
- `Comment` - Comments on items
- `Attachment` - File attachments
- `ItemWatcher` - Users watching items
- `Notification` - User notifications
- `Activity` - Activity log

### Forms Entities
- `Form` - Form definition
- `FormField` - Form field definitions
- `FormSubmission` - Submission records
- `FormSubmissionValue` - Submitted values
- `FormVersion` - Version history

### Automation Entities
- `AutomationRule` - Rule definition
- `AutomationRun` - Execution history
- `AutomationLog` - Detailed logs

### System Entities
- `User` - User accounts (built-in)
- `Team` - Team definitions
- `Invitation` - User invitations
- `AuditLog` - Audit trail

## Backend Functions

### Core Functions
1. **processAutomationEvent** - Process automation triggers
2. **runAutomation** - Manual automation testing
3. **submitForm** - Form submission processing
4. **createNotification** - Notification creation
5. **checkDueDateTriggers** - Due date automation checks
6. **runDateAutomations** - Date-based automation execution
7. **seedStarterRecipes** - Create starter automation templates
8. **cleanupDuplicateOptions** - Remove duplicate status/priority options

## API Integration

### Base44 SDK Usage
```javascript
import { base44 } from '@/api/base44Client';

// Entity operations
const items = await base44.entities.WorkboardItem.filter({ workboard: boardId });
const item = await base44.entities.WorkboardItem.get(itemId);
const created = await base44.entities.WorkboardItem.create(data);
const updated = await base44.entities.WorkboardItem.update(itemId, updates);
await base44.entities.WorkboardItem.delete(itemId);

// Auth
const user = await base44.auth.me();
await base44.auth.logout();

// Functions
const result = await base44.functions.invoke('functionName', { param: 'value' });

// Integrations
const { file_url } = await base44.integrations.Core.UploadFile({ file });
```

### Rate Limiting
- Client-side concurrency limiter (6 concurrent requests)
- Automatic retry on 429 rate limit errors
- Exponential backoff (400ms, 800ms, 1600ms, max 4000ms)

**Implementation:** `api/base44Client.js`

## Real-time Subscriptions

### Subscription Pattern
```javascript
useEffect(() => {
  const unsubscribe = base44.entities.WorkboardItem.subscribe((event) => {
    if (event.type === 'create') {
      setItems(prev => [...prev, event.data]);
    } else if (event.type === 'update') {
      setItems(prev => prev.map(i => i.id === event.data.id ? { ...i, ...event.data } : i));
    } else if (event.type === 'delete') {
      setItems(prev => prev.filter(i => i.id !== event.entity_id));
    }
  });
  return () => unsubscribe(); // Cleanup on unmount
}, [boardId]);
```

### Subscribed Entities
- WorkboardItem - Real-time item updates
- WorkboardItemValue - Real-time field value updates
- Comment - Real-time comment updates
- Notification - Real-time notification bell updates

## Security Model

### Authentication
- JWT-based authentication via Base44 Auth
- Token stored in localStorage
- Protected routes via ProtectedRoute component
- Automatic redirect to login on auth failure

### Authorization
- Permission checks at component level
- Backend permission validation in functions
- Workspace isolation via workspace field filtering
- Workboard access control via WorkboardMember

### Input Validation
- File type validation (allowed MIME types)
- File size limits (25MB max)
- URL validation (prevent open redirects)
- Required field validation in forms

### Data Isolation
- All queries filtered by workspace
- Workboard visibility controls (public/private/restricted)
- User can only access workspaces they belong to

## Performance Optimizations

### Query Optimization
- Batch loading where possible
- Parallel Promise.all queries
- Rate limiting with retry logic
- Workspace-scoped queries to reduce data

### Render Optimization
- isLoadingRef guards prevent duplicate requests
- Real-time subscriptions update state without refresh
- Memoization needed for expensive calculations (TODO)

### Bundle Optimization
- Route-based lazy loading (TODO)
- Tree-shaking for icons and components
- Tailwind CSS purging unused styles

## Testing Strategy

### Unit Tests
- Permission helpers
- Automation trigger detection
- Sorting and filtering utilities
- Board lifecycle predicates

### Integration Tests
- Workspace → Workboard → Item workflow
- Forms → Workboard Items workflow
- Automations → Notifications workflow
- Comments → Mentions workflow
- Files → Attachments workflow

### Regression Tests
- Workboards CRUD
- Forms submission
- Automations execution
- Notifications
- Files upload/download
- Permissions enforcement
- Workspace switching

**Test Location:** `tests/`

## Extension Points

### Adding New Modules
1. Create entity schemas in `entities/`
2. Create backend functions in `functions/` if needed
3. Create page component in `pages/`
4. Add route in `App.jsx`
5. Add navigation link in `components/layout/WorkspaceSidebar.jsx`
6. Add permissions in `config/PermissionConfig.js`

### Adding New Automation Actions
1. Add action type to `performActions()` in `functions/processAutomationEvent.js`
2. Add action editor UI in `components/automations/ActionEditor.jsx`
3. Add action label in `components/automations/RecipePreview.jsx`

### Adding New Form Field Types
1. Add field type to FormField entity enum
2. Add field renderer in `components/forms/FormFieldRenderer.jsx`
3. Add field settings in `components/forms/FieldSettings/`
4. Add mapping logic in `functions/submitForm.js`

## Known Limitations

1. No TypeScript - JavaScript only
2. No server-side rendering
3. No offline support
4. No mobile app (web only)
5. File uploads limited to 25MB
6. No real-time collaboration (cursors, presence)
7. Automation cooldown is fixed at 60 seconds

## Future Considerations

1. TypeScript migration for type safety
2. Virtual scrolling for large lists (>1000 items)
3. Advanced search and filtering
4. Custom dashboards and reports
5. API webhooks for external integrations
6. Mobile responsive improvements
7. Dark mode enhancements
8. Accessibility improvements (WCAG 2.1)