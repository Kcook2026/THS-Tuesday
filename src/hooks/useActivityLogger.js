import { base44 } from '@/api/base44Client';

export async function logActivity(user, action, recordType, recordId, recordName) {
  try {
    await base44.entities.Activity.create({
      user: user?.id,
      user_name: user?.full_name || 'Unknown',
      action,
      record_type: recordType,
      record_id: recordId,
      record_name: recordName || ''
    });
  } catch (e) {
    // silent fail for activity logging
  }
}