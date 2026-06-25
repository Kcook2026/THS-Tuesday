import React, { useState, useCallback, createContext, useContext } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState({
    open: false,
    title: '',
    message: '',
    confirmLabel: 'Delete',
    variant: 'destructive',
    requireText: null,
    onConfirm: null,
  });

  const confirm = useCallback((opts) => {
    return new Promise((resolve) => {
      setState({
        open: true,
        title: opts.title || 'Confirm',
        message: opts.message || 'Are you sure?',
        confirmLabel: opts.confirmLabel || 'Delete',
        variant: opts.variant || 'destructive',
        requireText: opts.requireText || null,
        onConfirm: resolve,
      });
    });
  }, []);

  const handleClose = useCallback((result) => {
    setState(prev => {
      if (prev.onConfirm) prev.onConfirm(result);
      return { ...prev, open: false, onConfirm: null };
    });
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog
        open={state.open}
        onOpenChange={(open) => { if (!open) handleClose(false); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{state.title}</AlertDialogTitle>
            <AlertDialogDescription>{state.message}</AlertDialogDescription>
          </AlertDialogHeader>
          {state.requireText && (
            <div className="py-1">
              <Input
                id="confirm-text-input"
                placeholder={`Type "${state.requireText}" to confirm`}
                autoFocus
              />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => handleClose(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={state.variant === 'destructive'
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : ''}
              onClick={(e) => {
                if (state.requireText) {
                  const input = document.getElementById('confirm-text-input');
                  if (input?.value !== state.requireText) {
                    e.preventDefault();
                    return;
                  }
                }
                handleClose(true);
              }}
            >
              {state.confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error('useConfirm must be used within ConfirmProvider');
  return confirm;
}