import React from 'react';
import { SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

export default function DrawerHeader({ title, description, onClose, actions }) {
  return (
    <SheetHeader className="border-b pb-4 mb-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <SheetTitle className="text-lg">{title}</SheetTitle>
          {description && <SheetDescription className="mt-1">{description}</SheetDescription>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {actions}
          {onClose && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </SheetHeader>
  );
}