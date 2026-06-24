import React from 'react';

export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-7 h-7 border-3 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );
}