import { useState, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';

// =====================================================
// CENTRALIZED DATA CACHE TO PREVENT DUPLICATE REQUESTS
// =====================================================

const cache = {
  workspaces: { data: null, timestamp: 0, ttl: 300000 }, // 5 min
  teams: { data: null, timestamp: 0, ttl: 300000 },
  users: { data: null, timestamp: 0, ttl: 300000 },
  statusOptions: { data: {}, timestamp: 0, ttl: 300000 },
  priorityOptions: { data: {}, timestamp: 0, ttl: 300000 },
  boardColumns: { data: {}, timestamp: 0, ttl: 300000 },
  boardGroups: { data: {}, timestamp: 0, ttl: 300000 },
  workboards: { data: {}, timestamp: 0, ttl: 120000 }, // 2 min
};

const pendingRequests = {};

function getCacheKey(prefix, workspaceId, additionalKey = '') {
  return `${prefix}:${workspaceId}:${additionalKey}`;
}

function isCacheValid(key) {
  const cached = cache[key];
  if (!cached) return false;
  const now = Date.now();
  return now - cached.timestamp < cached.ttl;
}

function getFromCache(key) {
  const cached = cache[key];
  if (cached && isCacheValid(key)) {
    return cached.data;
  }
  return null;
}

function setCache(key, data, ttl = 300000) {
  cache[key] = {
    data,
    timestamp: Date.now(),
    ttl,
  };
}

async function fetchWithDedup(key, fetchFn, ttl = 300000) {
  // Return cached data if valid
  const cached = getFromCache(key);
  if (cached) {
    console.log(`[Cache HIT] ${key}`);
    return cached;
  }

  // Return pending request if already running
  if (pendingRequests[key]) {
    console.log(`[Dedup] ${key} - waiting for pending request`);
    return pendingRequests[key];
  }

  // Start new request
  console.log(`[Cache MISS] ${key} - fetching...`);
  pendingRequests[key] = fetchFn().then(data => {
    setCache(key, data, ttl);
    delete pendingRequests[key];
    return data;
  }).catch(error => {
    delete pendingRequests[key];
    throw error;
  });

  return pendingRequests[key];
}

// =====================================================
// CENTRALIZED DATA LOADING FUNCTIONS
// =====================================================

export const useDataLoader = () => {
  const invalidateCache = useCallback((prefix, workspaceId, additionalKey = '') => {
    const key = getCacheKey(prefix, workspaceId, additionalKey);
    if (cache[key]) {
      cache[key].timestamp = 0; // Force refresh on next request
    }
  }, []);

  const clearWorkspaceCache = useCallback((workspaceId) => {
    Object.keys(cache).forEach(key => {
      if (key.includes(workspaceId)) {
        cache[key].timestamp = 0;
      }
    });
  }, []);

  // Load workspaces for user
  const loadWorkspaces = useCallback(async (userId) => {
    return fetchWithDedup(`workspaces:${userId}`, async () => {
      const memberRecords = await base44.entities.WorkspaceMember.filter({ user: userId });
      const activeMemberships = memberRecords.filter(m => m.status === 'active');
      const workspaceIds = [...new Set(activeMemberships.map(m => m.workspace).filter(Boolean))];
      
      if (workspaceIds.length === 0) return [];
      
      const results = await Promise.all(
        workspaceIds.map(id => base44.entities.Workspace.get(id).catch(() => null))
      );
      return results.filter(w => w && w.status !== 'archived');
    }, 300000);
  }, []);

  // Load teams for workspace
  const loadTeams = useCallback(async (workspaceId) => {
    return fetchWithDedup(`teams:${workspaceId}`, async () => {
      return base44.entities.Team.filter({ workspace: workspaceId });
    }, 300000);
  }, []);

  // Load workboards for workspace
  const loadWorkboards = useCallback(async (workspaceId) => {
    return fetchWithDedup(`workboards:${workspaceId}`, async () => {
      return base44.entities.Workboard.filter({ workspace: workspaceId });
    }, 120000);
  }, []);

  // Load status options for workboard
  const loadStatusOptions = useCallback(async (workboardId) => {
    return fetchWithDedup(`statusOptions:${workboardId}`, async () => {
      return base44.entities.StatusOption.filter({ workboard: workboardId });
    }, 300000);
  }, []);

  // Load priority options for workboard
  const loadPriorityOptions = useCallback(async (workboardId) => {
    return fetchWithDedup(`priorityOptions:${workboardId}`, async () => {
      return base44.entities.PriorityOption.filter({ workboard: workboardId });
    }, 300000);
  }, []);

  // Load board columns for workboard
  const loadBoardColumns = useCallback(async (workboardId) => {
    return fetchWithDedup(`boardColumns:${workboardId}`, async () => {
      return base44.entities.BoardColumn.filter({ workboard: workboardId });
    }, 300000);
  }, []);

  // Load board groups for workboard
  const loadBoardGroups = useCallback(async (workboardId) => {
    return fetchWithDedup(`boardGroups:${workboardId}`, async () => {
      return base44.entities.BoardGroup.filter({ workboard: workboardId, archived: false });
    }, 300000);
  }, []);

  return {
    loadWorkspaces,
    loadTeams,
    loadWorkboards,
    loadStatusOptions,
    loadPriorityOptions,
    loadBoardColumns,
    loadBoardGroups,
    invalidateCache,
    clearWorkspaceCache,
  };
};

export { cache, getFromCache, setCache, fetchWithDedup, getCacheKey, isCacheValid };