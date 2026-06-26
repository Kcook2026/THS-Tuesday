import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Play, CheckCircle, XCircle, Loader2, Clock, AlertTriangle, SkipForward } from 'lucide-react';
import SearchablePicker from './SearchablePicker';
import { buildItemOptions } from './PickerOptions';
import { getTriggerMeta } from './AutomationConstants';

export default function TestRuleDialog({ open, onClose, ruleId, workspace, workboard }) {
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [boardMap, setBoardMap] = useState({});

  useEffect(() => {
    if (!open || !workspace) return;
    setItems([]); setSelectedItem(''); setResult(null);
    const query = { workspace, archived: false };
    if (workboard) query.workboard = workboard;
    Promise.all([
      base44.entities.WorkboardItem.filter(query, '-updated_date', 100).catch(() => []),
      base44.entities.Workboard.filter({ workspace, status: 'active' }, '-updated_date', 100).catch(() => []),
    ]).then(([its, boards]) => {
      setItems(its);
      const map = {};
      (boards || []).forEach(b => { map[b.id] = b.name; });
      setBoardMap(map);
    });
  }, [open, workspace, workboard]);

  const itemOptions = useMemo(() => buildItemOptions(items, boardMap), [items, boardMap]);

  const handleRun = async () => {
    if (!selectedItem) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke('runAutomation', { ruleId, itemId: selectedItem });
      setResult(res.data?.error ? { error: res.data.error } : res.data);
    } catch (e) {
      setResult({ error: e.response?.data?.error || e.message });
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (ts) => {
    if (!ts) return '';
    try { return new Date(ts).toLocaleString(); } catch { return ts; }
  };

  const renderResult = () => {
    if (!result) return null;
    if (result.error) {
      return (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2 text-red-700">
            <XCircle className="w-5 h-5" />
            <span className="font-semibold">Test Failed</span>
          </div>
          <p className="text-sm text-red-600">{result.error}</p>
        </div>
      );
    }
    const test = result.test || {};
    const isSuccess = test.status === 'success';
    const isSkipped = test.status === 'skipped';

    return (
      <div className={`rounded-lg border p-4 space-y-3 ${isSuccess ? 'bg-emerald-500/10 border-emerald-500/30' : isSkipped ? 'bg-amber-500/10 border-amber-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
        <div className="flex items-center gap-2">
          {isSuccess ? <CheckCircle className="w-5 h-5 text-emerald-600" /> : isSkipped ? <SkipForward className="w-5 h-5 text-amber-600" /> : <XCircle className="w-5 h-5 text-red-600" />}
          <span className={`font-semibold ${isSuccess ? 'text-emerald-700' : isSkipped ? 'text-amber-700' : 'text-red-700'}`}>
            {isSuccess ? 'Test Succeeded' : isSkipped ? 'Test Skipped' : 'Test Failed'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Rule</p>
            <p className="font-medium">{test.rule_name || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Trigger Simulated</p>
            <p className="font-medium">{getTriggerMeta(test.trigger_type)?.label || test.trigger_type || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Item Affected</p>
            <p className="font-medium truncate">{test.item_title || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Run ID</p>
            <p className="font-medium text-xs truncate">{test.run_id || '—'}</p>
          </div>
        </div>

        {test.actions_performed && test.actions_performed.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Actions Performed ({test.actions_performed.length})</p>
            <div className="space-y-1">
              {test.actions_performed.map((a, i) => (
                <div key={i} className="flex items-center gap-2 text-sm bg-background/50 rounded px-2 py-1">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span className="capitalize">{a.action.replace(/_/g, ' ')}</span>
                  {a.value && <span className="text-muted-foreground">→ {a.value}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {test.actions_performed && test.actions_performed.length === 0 && !isSkipped && (
          <p className="text-sm text-muted-foreground">No actions were performed (item may already match target values).</p>
        )}

        {test.skipped_reason && (
          <div className="flex items-start gap-2 text-sm text-amber-700">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Rule skipped</p>
              <p className="text-xs capitalize">{test.skipped_reason.replace(/_/g, ' ')}</p>
            </div>
          </div>
        )}

        {test.error && (
          <div className="flex items-start gap-2 text-sm text-red-700">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Error</p>
              <p className="text-xs">{test.error}</p>
            </div>
          </div>
        )}

        {test.timestamp && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1 border-t">
            <Clock className="w-3 h-3" />
            <span>{formatTimestamp(test.timestamp)}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Test Automation Rule</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Select an item to test against</label>
            <SearchablePicker
              value={selectedItem}
              onValueChange={setSelectedItem}
              options={itemOptions}
              placeholder="Search items..."
              emptyMessage="No items found. Create an item in a workboard first."
            />
          </div>
          {renderResult()}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={handleRun} disabled={loading || !selectedItem}>
            {loading ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Play className="w-4 h-4 mr-1.5" />}
            Run Test
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}