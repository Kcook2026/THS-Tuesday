import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function TestRuleDialog({ open, onClose, ruleId, workspace, workboard }) {
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!open || !workspace) return;
    setItems([]);
    setSelectedItem('');
    setResult(null);
    const query = { workspace, archived: false };
    if (workboard) query.workboard = workboard;
    base44.entities.WorkboardItem.filter(query, '-updated_date', 20)
      .then(setItems).catch(() => {});
  }, [open, workspace, workboard]);

  const handleRun = async () => {
    if (!selectedItem) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke('runAutomation', { ruleId, itemId: selectedItem });
      setResult(res.data);
    } catch (e) {
      setResult({ error: e.response?.data?.error || e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Test Automation Rule</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Select an item to test against</label>
            <Select value={selectedItem} onValueChange={setSelectedItem}>
              <SelectTrigger><SelectValue placeholder="Choose an item" /></SelectTrigger>
              <SelectContent>
                {items.map(item => (
                  <SelectItem key={item.id} value={item.id}>{item.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {items.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1.5">No items found. Create an item in a workboard first.</p>
            )}
          </div>

          {result && (
            <div className={`rounded-lg p-3 text-sm ${result.error ? 'bg-red-500/10 text-red-700' : 'bg-emerald-500/10 text-emerald-700'}`}>
              {result.error ? (
                <div className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Test failed</p>
                    <p className="text-xs mt-0.5">{result.error}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Test completed</p>
                    <p className="text-xs mt-0.5">
                      {result.result?.results?.map(r => r.skipped ? `Skipped: ${r.skipped}` : `${r.rule_name}: ${r.success ? 'success' : 'failed'}`).join(', ') || 'Rule executed'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
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