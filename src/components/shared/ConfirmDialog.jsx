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
import { Loader2 } from 'lucide-react';

const VARIANT_STYLES = {
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  archive: 'bg-amber-600 text-white hover:bg-amber-700',
  warning: 'bg-amber-500 text-white hover:bg-amber-600',
};

/**
 * Controlled confirmation dialog.
 *
 * Props:
 *   open, title, description
 *   confirmLabel (default "Confirm"), cancelLabel (default "Cancel")
 *   variant: "destructive" | "archive" | "warning"
 *   requireTypedConfirmation, confirmationText
 *   onConfirm, onCancel, loading
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'destructive',
  requireTypedConfirmation = false,
  confirmationText = '',
  onConfirm,
  onCancel,
  loading = false,
}) {
  const [typedValue, setTypedValue] = useState('');

  const canConfirm = !requireTypedConfirmation || typedValue === confirmationText;

  const reset = () => setTypedValue('');

  const handleConfirm = (e) => {
    if (!canConfirm || loading) {
      e.preventDefault();
      return;
    }
    reset();
    onConfirm?.();
  };

  const handleCancel = (e) => {
    if (loading) {
      e.preventDefault();
      return;
    }
    reset();
    onCancel?.();
  };

  return (
    <AlertDialog open={open} onOpenChange={(open) => { if (!open) handleCancel(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        {requireTypedConfirmation && (
          <div className="py-1">
            <Input
              value={typedValue}
              onChange={(e) => setTypedValue(e.target.value)}
              placeholder={`Type "${confirmationText}" to confirm`}
              autoFocus
              autoComplete="off"
            />
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel} disabled={loading}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            className={VARIANT_STYLES[variant] || ''}
            onClick={handleConfirm}
            disabled={!canConfirm || loading}
          >
            {loading && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/* ---- Imperative hook wrapper ---- */

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState({
    open: false,
    title: '',
    description: '',
    confirmLabel: 'Delete',
    cancelLabel: 'Cancel',
    variant: 'destructive',
    requireTypedConfirmation: false,
    confirmationText: '',
    loading: false,
    resolve: null,
  });

  const confirm = useCallback((opts) => {
    return new Promise((resolve) => {
      setState({
        open: true,
        title: opts.title || 'Confirm',
        description: opts.description || opts.message || 'Are you sure?',
        confirmLabel: opts.confirmLabel || 'Delete',
        cancelLabel: opts.cancelLabel || 'Cancel',
        variant: opts.variant || 'destructive',
        requireTypedConfirmation: opts.requireTypedConfirmation || !!opts.requireText,
        confirmationText: opts.confirmationText || opts.requireText || '',
        loading: false,
        resolve,
      });
    });
  }, []);

  const handleClose = useCallback((result) => {
    setState((prev) => {
      if (prev.resolve) prev.resolve(result);
      return { ...prev, open: false, resolve: null };
    });
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmDialog
        open={state.open}
        title={state.title}
        description={state.description}
        confirmLabel={state.confirmLabel}
        cancelLabel={state.cancelLabel}
        variant={state.variant}
        requireTypedConfirmation={state.requireTypedConfirmation}
        confirmationText={state.confirmationText}
        loading={state.loading}
        onConfirm={() => handleClose(true)}
        onCancel={() => handleClose(false)}
      />
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error('useConfirm must be used within ConfirmProvider');
  return confirm;
}