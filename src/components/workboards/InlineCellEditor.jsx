import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';

export default function InlineCellEditor({ column, value, onSave, onCancel, canEdit }) {
  const [editingValue, setEditingValue] = useState(value || '');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSave = async (newValue) => {
    if (!canEdit) return;
    setSaving(true);
    try {
      await onSave(newValue);
    } finally {
      setSaving(false);
    }
  };

  if (!canEdit) {
    return <div className="text-sm p-2 truncate">{value || ''}</div>;
  }

  const renderInput = () => {
    const commonProps = {
      ref: inputRef,
      value: editingValue,
      onChange: (e) => setEditingValue(e.target.value),
      onKeyDown: (e) => {
        if (e.key === 'Enter') handleSave(editingValue);
        if (e.key === 'Escape') onCancel();
      },
      onBlur: () => handleSave(editingValue),
      className: 'h-8 text-sm w-full',
      disabled: saving,
    };

    switch (column.column_type) {
      case 'number':
      case 'currency':
        return <Input {...commonProps} type="number" step={column.column_type === 'currency' ? '0.01' : '1'} />;
      case 'email':
        return <Input {...commonProps} type="email" />;
      case 'phone':
        return <Input {...commonProps} type="tel" />;
      case 'link':
        return <Input {...commonProps} type="url" />;
      case 'long_text':
        return (
          <textarea
            {...commonProps}
            className="h-auto min-h-[80px] text-sm w-full resize-none border rounded-md px-3 py-1 focus:outline-none focus:ring-1 focus:ring-ring"
          />
        );
      default:
        return <Input {...commonProps} />;
    }
  };

  return (
    <div className={`inline-cell-editor ${saving ? 'opacity-50' : ''}`}>
      {renderInput()}
    </div>
  );
}