export const STATUS_COLORS = {
  gray: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-300',
  red: 'bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-300',
  yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-800 dark:text-yellow-300',
  green: 'bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-300',
  orange: 'bg-orange-100 text-orange-700 dark:bg-orange-800 dark:text-orange-300',
  purple: 'bg-purple-100 text-purple-700 dark:bg-purple-800 dark:text-purple-300',
};

export const PRIORITY_COLORS = {
  gray: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-300',
  yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-800 dark:text-yellow-300',
  orange: 'bg-orange-100 text-orange-700 dark:bg-orange-800 dark:text-orange-300',
  red: 'bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-300',
  purple: 'bg-purple-100 text-purple-700 dark:bg-purple-800 dark:text-purple-300',
};

export const GROUP_COLOR_CLASSES = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  gray: 'bg-gray-500',
  red: 'bg-red-500',
  yellow: 'bg-yellow-500',
  orange: 'bg-orange-500',
  purple: 'bg-purple-500',
};

export const SYSTEM_COLUMNS = [
  { id: 'title', name: 'Item Name', required: true },
  { id: 'owner', name: 'Owner' },
  { id: 'status', name: 'Status' },
  { id: 'priority', name: 'Priority' },
  { id: 'due_date', name: 'Due Date' },
  { id: 'progress_percentage', name: 'Progress' },
];

export const COLUMN_TYPE_OPTIONS = [
  { group: 'Core', types: [
    { value: 'text', label: 'Text' },
    { value: 'long_text', label: 'Long Text' },
    { value: 'number', label: 'Number' },
    { value: 'currency', label: 'Currency' },
    { value: 'status', label: 'Status' },
    { value: 'priority', label: 'Priority' },
    { value: 'date', label: 'Date' },
    { value: 'timeline', label: 'Timeline', comingSoon: true },
    { value: 'progress', label: 'Progress' },
    { value: 'checkbox', label: 'Checkbox', comingSoon: true },
  ]},
  { group: 'People', types: [
    { value: 'person', label: 'Person' },
    { value: 'team', label: 'Team', comingSoon: true },
    { value: 'department', label: 'Department', comingSoon: true },
  ]},
  { group: 'Communication', types: [
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone' },
    { value: 'link', label: 'Link' },
  ]},
  { group: 'Classification', types: [
    { value: 'tags', label: 'Tags' },
    { value: 'dropdown', label: 'Dropdown', comingSoon: true },
    { value: 'multi_select', label: 'Multi Select', comingSoon: true },
  ]},
  { group: 'Files', types: [
    { value: 'files', label: 'Files' },
    { value: 'images', label: 'Images', comingSoon: true },
  ]},
  { group: 'System', types: [
    { value: 'created_by', label: 'Created By', comingSoon: true },
    { value: 'created_date', label: 'Created Date', comingSoon: true },
    { value: 'updated_by', label: 'Updated By', comingSoon: true },
    { value: 'updated_date', label: 'Updated Date', comingSoon: true },
    { value: 'auto_number', label: 'Auto Number', comingSoon: true },
  ]},
  { group: 'Advanced', types: [
    { value: 'formula', label: 'Formula', comingSoon: true },
    { value: 'dependency', label: 'Dependency', comingSoon: true },
    { value: 'mirror', label: 'Mirror', comingSoon: true },
    { value: 'connected_workboard', label: 'Connected Workboard', comingSoon: true },
    { value: 'time_tracking', label: 'Time Tracking', comingSoon: true },
    { value: 'budget', label: 'Budget', comingSoon: true },
    { value: 'risk_score', label: 'Risk Score', comingSoon: true },
  ]},
];

export const AVAILABLE_COLUMN_TYPES = [
  'text', 'long_text', 'number', 'currency', 'status', 'priority',
  'date', 'progress', 'tags', 'files', 'email', 'phone', 'link', 'person'
];

export const BOARD_TYPES = {
  project_board: { label: 'Project Board', color: 'bg-violet-500/10 text-violet-700 dark:text-violet-300' },
  task_board: { label: 'Task Board', color: 'bg-blue-500/10 text-blue-700 dark:text-blue-300' },
  process_board: { label: 'SOP Board', color: 'bg-amber-500/10 text-amber-700 dark:text-amber-300' },
  operations_board: { label: 'Operations Board', color: 'bg-orange-500/10 text-orange-700 dark:text-orange-300' },
  planning_board: { label: 'Planning Board', color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
};