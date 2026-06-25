import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function ErrorState({ message, subtitle, actionLabel, actionPath, onRetry }) {
  return (
    <Card>
      <CardContent className="p-8 text-center">
        <div className="max-w-md mx-auto space-y-4">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">{message || 'Something went wrong'}</h3>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className="flex items-center justify-center gap-2">
            {onRetry && (
              <Button variant="outline" size="sm" onClick={onRetry}>
                Try Again
              </Button>
            )}
            {actionLabel && actionPath && (
              <Link to={actionPath}>
                <Button size="sm">{actionLabel}</Button>
              </Link>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}