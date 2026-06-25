import React from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export default function DataToolbar({ leftActions, rightActions, filters }) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
      <div className="flex items-center gap-2 flex-wrap">
        {leftActions}
      </div>
      {filters && (
        <>
          <Separator orientation="vertical" className="h-6 hidden sm:block" />
          <div className="flex items-center gap-2 flex-wrap">
            {filters}
          </div>
        </>
      )}
      <div className="flex items-center gap-2 flex-wrap ml-auto">
        {rightActions}
      </div>
    </div>
  );
}