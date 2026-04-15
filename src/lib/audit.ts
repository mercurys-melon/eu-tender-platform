import { getServiceClient } from '@/lib/supabase/server'
import type { Json } from '@/lib/supabase/types'

/**
 * Log a user action to audit_logs. Fails silently — never throws.
 */
export async function logAction(
  userId: string,
  action: string,
  entityType: string,
  entityId?: string | null,
  metadata?: Record<string, unknown> | null,
): Promise<void> {
  try {
    const db = getServiceClient()
    await db.from('audit_logs').insert({
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId ?? null,
      metadata: (metadata ?? null) as Json | null,
    })
  } catch (err) {
    console.error('[audit] logAction failed:', err)
  }
}
