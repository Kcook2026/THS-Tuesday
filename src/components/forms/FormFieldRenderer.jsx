import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { FIELD_TYPES, FILE_FIELD_TYPES } from '@/components/forms/FormConstants';
import { Upload } from 'lucide-react';

export default function FormFieldRenderer({ field, value, onChange, readOnly, users, teams }) {
  const ft = field.field_type;
  const config = FIELD_TYPES[ft] || {};

  if (ft === 'section_header') {
    return <div className="border-b pb-2 pt-3"><h3 className="text-base font-semibold">{field.label}</h3></div>;
  }
  if (ft === 'description_text') {
    return <p className="text-sm text-muted-foreground py-1">{field.help_text || field.label}</p>;
  }
  if (config.comingSoon) {
    return (
      <div className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
        {config.label} — Coming Soon
      </div>
    );
  }

  const labelEl = (
    <Label className="flex items-center gap-1">
      {field.label}
      {field.required && <span className="text-destructive">*</span>}
    </Label>
  );
  const helpEl = field.help_text ? <p className="text-xs text-muted-foreground">{field.help_text}</p> : null;

  if (FILE_FIELD_TYPES.includes(ft)) {
    if (readOnly) {
      const files = value ? String(value).split(', ') : [];
      return (
        <div className="space-y-1">
          {labelEl}
          {files.length > 0 ? files.map((f, i) => <div key={i} className="text-sm truncate">{f}</div>) : <span className="text-sm text-muted-foreground">—</span>}
        </div>
      );
    }
    return (
      <div className="space-y-1">
        {labelEl}
        {helpEl}
        <label className="cursor-pointer">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-sm hover:bg-accent">
            <Upload className="w-3.5 h-3.5" /> Choose {ft === 'image_upload' ? 'image' : 'file'}
          </span>
          <input
            type="file"
            className="hidden"
            accept={ft === 'image_upload' ? 'image/*' : undefined}
            multiple
            onChange={e => onChange(Array.from(e.target.files))}
          />
        </label>
        {value && Array.isArray(value) && value.length > 0 && (
          <p className="text-xs text-muted-foreground">{value.length} file(s) selected</p>
        )}
      </div>
    );
  }

  if (readOnly) {
    let displayVal = value;
    if (ft === 'checkbox') displayVal = value ? 'Yes' : 'No';
    if (ft === 'person' && users) {
      const u = users.find(u => u.id === value);
      displayVal = u?.full_name || u?.email || value || '—';
    }
    return (
      <div className="space-y-1">
        {labelEl}
        <p className="text-sm">{displayVal || '—'}</p>
      </div>
    );
  }

  const commonInput = { value: value || '', placeholder: field.placeholder };

  const renderInput = () => {
    switch (ft) {
      case 'short_text':
      case 'email':
      case 'phone':
      case 'link':
      case 'department':
        return <Input type={ft === 'email' ? 'email' : ft === 'phone' ? 'tel' : ft === 'link' ? 'url' : 'text'} {...commonInput} onChange={e => onChange(e.target.value)} />;
      case 'long_text':
        return <Textarea {...commonInput} onChange={e => onChange(e.target.value)} rows={3} />;
      case 'number':
        return <Input type="number" {...commonInput} onChange={e => onChange(e.target.value)} />;
      case 'currency':
        return <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span><Input type="number" className="pl-7" {...commonInput} onChange={e => onChange(e.target.value)} /></div>;
      case 'date':
        return <Input type="date" {...commonInput} onChange={e => onChange(e.target.value)} />;
      case 'checkbox':
        return <Switch checked={!!value} onCheckedChange={onChange} />;
      case 'dropdown':
        return (
          <Select value={value || ''} onValueChange={onChange}>
            <SelectTrigger><SelectValue placeholder={field.placeholder || 'Select...'} /></SelectTrigger>
            <SelectContent>
              {(field.options || []).map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
            </SelectContent>
          </Select>
        );
      case 'multi_select': {
        const selected = Array.isArray(value) ? value : (value ? [value] : []);
        return (
          <div className="space-y-1.5">
            {(field.options || []).map(opt => (
              <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={selected.includes(opt)} onCheckedChange={checked => {
                  onChange(checked ? [...selected, opt] : selected.filter(s => s !== opt));
                }} />
                {opt}
              </label>
            ))}
          </div>
        );
      }
      case 'person':
        return (
          <Select value={value || ''} onValueChange={onChange}>
            <SelectTrigger><SelectValue placeholder="Select person..." /></SelectTrigger>
            <SelectContent>
              {(users || []).map(u => <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>)}
            </SelectContent>
          </Select>
        );
      case 'team':
        return (
          <Select value={value || ''} onValueChange={onChange}>
            <SelectTrigger><SelectValue placeholder="Select team..." /></SelectTrigger>
            <SelectContent>
              {(teams || []).map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
        );
      default:
        return <Input {...commonInput} onChange={e => onChange(e.target.value)} />;
    }
  };

  return (
    <div className="space-y-1.5">
      {labelEl}
      {helpEl}
      {renderInput()}
    </div>
  );
}