import {
  Type, AlignLeft, Hash, DollarSign, Calendar, ChevronDown,
  List, Check, Mail, Phone, Link as LinkIcon,
  User, Users, Building, Upload, Image as ImageIcon,
  Heading, FileText, GitBranch, Pen, Star, MapPin
} from 'lucide-react';

export const FIELD_TYPES = {
  short_text: { label: 'Short Text', icon: Type, category: 'core' },
  long_text: { label: 'Long Text', icon: AlignLeft, category: 'core' },
  number: { label: 'Number', icon: Hash, category: 'core' },
  currency: { label: 'Currency', icon: DollarSign, category: 'core' },
  date: { label: 'Date', icon: Calendar, category: 'core' },
  dropdown: { label: 'Dropdown', icon: ChevronDown, category: 'core' },
  multi_select: { label: 'Multi Select', icon: List, category: 'core' },
  checkbox: { label: 'Checkbox', icon: Check, category: 'core' },
  email: { label: 'Email', icon: Mail, category: 'core' },
  phone: { label: 'Phone', icon: Phone, category: 'core' },
  link: { label: 'Link', icon: LinkIcon, category: 'core' },
  person: { label: 'Person', icon: User, category: 'people' },
  team: { label: 'Team', icon: Users, category: 'people' },
  department: { label: 'Department', icon: Building, category: 'people' },
  file_upload: { label: 'File Upload', icon: Upload, category: 'files' },
  image_upload: { label: 'Image Upload', icon: ImageIcon, category: 'files' },
  section_header: { label: 'Section Header', icon: Heading, category: 'system' },
  description_text: { label: 'Description Text', icon: FileText, category: 'system' },
  conditional_logic: { label: 'Conditional Logic', icon: GitBranch, category: 'advanced', comingSoon: true },
  signature: { label: 'Signature', icon: Pen, category: 'advanced', comingSoon: true },
  rating: { label: 'Rating', icon: Star, category: 'advanced', comingSoon: true },
  location: { label: 'Location', icon: MapPin, category: 'advanced', comingSoon: true },
};

export const FIELD_CATEGORIES = [
  { id: 'core', label: 'Core Fields' },
  { id: 'people', label: 'People' },
  { id: 'files', label: 'Files' },
  { id: 'system', label: 'System' },
  { id: 'advanced', label: 'Advanced' },
];

export const SYSTEM_FIELDS = [
  { value: 'title', label: 'Item Name' },
  { value: 'owner', label: 'Owner' },
  { value: 'status', label: 'Status' },
  { value: 'priority', label: 'Priority' },
  { value: 'due_date', label: 'Due Date' },
  { value: 'progress_percentage', label: 'Progress' },
];

export const FIELD_TYPES_WITH_OPTIONS = ['dropdown', 'multi_select', 'checkbox'];
export const DISPLAY_ONLY_TYPES = ['section_header', 'description_text'];
export const FILE_FIELD_TYPES = ['file_upload', 'image_upload'];
export const PEOPLE_FIELD_TYPES = ['person', 'team', 'department'];