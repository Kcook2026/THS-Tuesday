export const STATUS_COLORS = {
  gray: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-300',
  red: 'bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-300',
  orange: 'bg-orange-100 text-orange-700 dark:bg-orange-800 dark:text-orange-300',
  yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-800 dark:text-yellow-300',
  green: 'bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-300',
  purple: 'bg-purple-100 text-purple-700 dark:bg-purple-800 dark:text-purple-300',
};

export const PRIORITY_COLORS = {
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-300',
  yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-800 dark:text-yellow-300',
  orange: 'bg-orange-100 text-orange-700 dark:bg-orange-800 dark:text-orange-300',
  red: 'bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-300',
  gray: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

export const DEFAULT_GROUPS = ['This Week', 'Next Week', 'Backlog', 'Completed'];

export const DEFAULT_STATUS_OPTIONS = [
  { label: 'Not Started', color: 'gray', sort_order: 0, is_default: true },
  { label: 'Working On It', color: 'blue', sort_order: 1 },
  { label: 'Stuck', color: 'red', sort_order: 2 },
  { label: 'Waiting', color: 'yellow', sort_order: 3 },
  { label: 'Done', color: 'green', sort_order: 4 },
];

export const DEFAULT_PRIORITY_OPTIONS = [
  { label: 'Low', color: 'blue', sort_order: 0 },
  { label: 'Medium', color: 'yellow', sort_order: 1, is_default: true },
  { label: 'High', color: 'orange', sort_order: 2 },
  { label: 'Critical', color: 'red', sort_order: 3 },
];

export const DEFAULT_COLUMNS = [
  { name: 'Item', column_type: 'text', sort_order: 0, width: 300 },
  { name: 'Owner', column_type: 'person', sort_order: 1, width: 150 },
  { name: 'Status', column_type: 'status', sort_order: 2, width: 120 },
  { name: 'Priority', column_type: 'priority', sort_order: 3, width: 120 },
  { name: 'Timeline', column_type: 'timeline', sort_order: 4, width: 150 },
  { name: 'Due Date', column_type: 'date', sort_order: 5, width: 120 },
  { name: 'Progress', column_type: 'progress', sort_order: 6, width: 120 },
  { name: 'Last Updated', column_type: 'date', sort_order: 7, width: 120 },
];