import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';

export function getUserName(user, fallback = 'Unassigned') {
  if (!user) return fallback;
  if (typeof user === 'string') return user;
  return user.full_name || user.email || fallback;
}

export function getUserDisplayName(userRecord, fallback = 'Unassigned') {
  if (!userRecord) return fallback;
  const nameParts = [];
  if (userRecord.full_name) {
    nameParts.push(userRecord.full_name);
  } else {
    if (userRecord.first_name) nameParts.push(userRecord.first_name);
    if (userRecord.last_name) nameParts.push(userRecord.last_name);
  }
  if (nameParts.length === 0 && userRecord.email) {
    return userRecord.email;
  }
  return nameParts.join(' ') || fallback;
}

export function formatUserName(userRecord) {
  if (!userRecord) return 'Unassigned';
  return userRecord.full_name || userRecord.email || 'Unassigned';
}

export async function fetchUserDetails(userId) {
  if (!userId) return null;
  try {
    const user = await base44.entities.User.get(userId);
    return user;
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
}

export function getUserInitials(userRecord) {
  if (!userRecord) return 'U';
  const name = userRecord.full_name || userRecord.user_name || userRecord.email || userRecord.user_email || 'User';
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.charAt(0).toUpperCase();
}

export function searchUsersByQuery(users, query) {
  if (!query) return users;
  const q = query.toLowerCase();
  return users.filter(u => {
    const name = (u.full_name || '').toLowerCase();
    const email = (u.email || '').toLowerCase();
    const firstName = (u.first_name || '').toLowerCase();
    const lastName = (u.last_name || '').toLowerCase();
    return name.includes(q) || email.includes(q) || firstName.includes(q) || lastName.includes(q);
  });
}

export function useUserDisplay(userId, fallback = 'Unassigned') {
  const [displayName, setDisplayName] = useState(fallback);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) {
      setDisplayName(fallback);
      return;
    }

    setLoading(true);
    fetchUserDetails(userId).then(user => {
      setDisplayName(formatUserName(user));
      setLoading(false);
    });
  }, [userId, fallback]);

  return { displayName, loading };
}

export function useUsers(workspaceId) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) return;
    
    const loadUsers = async () => {
      try {
        const allUsers = await base44.entities.User.list();
        setUsers(allUsers);
      } catch (error) {
        console.error('Error loading users:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [workspaceId]);

  return { users, loading };
}