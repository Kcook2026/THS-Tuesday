import { useState, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Loads all WorkboardItemValue records for a given workboard,
 * keyed by `${itemId}::${columnId}` for fast lookups.
 * Also provides a saveValue function that creates or updates a value.
 */
export function useItemValues(workboardId, workspaceId) {
  const [valuesMap, setValuesMap] = useState({});
  const [loading, setLoading] = useState(true);
  const loadingRef = useRef(false);

  const load = useCallback(async () => {
    if (!workboardId || loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const vals = await base44.entities.WorkboardItemValue.filter({ workboard: workboardId }).catch(() => []);
      const map = {};
      for (const v of vals) {
        map[`${v.item}::${v.column}`] = v;
      }
      setValuesMap(map);
    } catch (e) {
      console.error('Error loading item values:', e);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [workboardId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!workboardId) return;
    const unsubscribe = base44.entities.WorkboardItemValue.subscribe((event) => {
      if (event.type === 'create' && event.data && event.data.workboard === workboardId) {
        setValuesMap(prev => {
          const key = `${event.data.item}::${event.data.column}`;
          if (prev[key]?.id === event.data.id) return prev;
          return { ...prev, [key]: event.data };
        });
      } else if (event.type === 'update' && event.data && event.data.workboard === workboardId) {
        setValuesMap(prev => ({
          ...prev,
          [`${event.data.item}::${event.data.column}`]: event.data,
        }));
      } else if (event.type === 'delete') {
        setValuesMap(prev => {
          const next = { ...prev };
          for (const [k, v] of Object.entries(next)) {
            if (v?.id === event.entity_id) delete next[k];
          }
          return next;
        });
      }
    });
    return () => unsubscribe();
  }, [workboardId]);

  const saveValue = useCallback(async (itemId, columnId, value, valueType = 'text', displayValue = '') => {
    if (!workspaceId || !workboardId) return;
    const key = `${itemId}::${columnId}`;
    const existing = valuesMap[key];

    if (existing) {
      const updated = await base44.entities.WorkboardItemValue.update(existing.id, {
        value: String(value ?? ''),
        value_type: valueType,
        display_value: displayValue || String(value ?? ''),
      });
      setValuesMap(prev => ({ ...prev, [key]: updated }));
      return updated;
    } else {
      const created = await base44.entities.WorkboardItemValue.create({
        workspace: workspaceId,
        workboard: workboardId,
        item: itemId,
        column: columnId,
        value: String(value ?? ''),
        value_type: valueType,
        display_value: displayValue || String(value ?? ''),
      });
      setValuesMap(prev => ({ ...prev, [key]: created }));
      return created;
    }
  }, [workspaceId, workboardId, valuesMap]);

  const getValue = useCallback((itemId, columnId) => {
    return valuesMap[`${itemId}::${columnId}`];
  }, [valuesMap]);

  return { valuesMap, getValue, saveValue, loading, reload: load };
}