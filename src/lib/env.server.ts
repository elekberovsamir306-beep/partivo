import 'server-only'
import { z } from 'zod'

const schema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  PAYMENT_PROVIDER: z.enum(['epoint', 'mock', 'none']).default('none'),
  EPOINT_PUBLIC_KEY: z.string().optional(),
  EPOINT_PRIVATE_KEY: z.string().optional(),
  EPOINT_API_BASE: z.url().default('https://epoint.az/api/1'),
  CRON_SECRET: z.string().min(16).optional(),
  IP_HASH_SALT: z.string().min(16).optional(),
})

let cached: z.infer<typeof schema> | null = null

export function serverEnv() {
  if (!cached) {
    const parsed = schema.safeParse({
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || undefined,
      PAYMENT_PROVIDER: process.env.PAYMENT_PROVIDER || undefined,
      EPOINT_PUBLIC_KEY: process.env.EPOINT_PUBLIC_KEY || undefined,
      EPOINT_PRIVATE_KEY: process.env.EPOINT_PRIVATE_KEY || undefined,
      EPOINT_API_BASE: process.env.EPOINT_API_BASE || undefined,
      CRON_SECRET: process.env.CRON_SECRET || undefined,
      IP_HASH_SALT: process.env.IP_HASH_SALT || undefined,
    })
    if (!parsed.success) {
      throw new Error(`Invalid server environment: ${z.prettifyError(parsed.error)}`)
    }
    cached = parsed.data
  }
  return cached
}
