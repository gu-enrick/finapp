import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

export function getAppUrl() {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/$/, '');
  }

  return (import.meta.env.VITE_APP_URL || 'http://localhost:5173').replace(/\/$/, '');
}

export function getResetPasswordRedirect() {
  return `${getAppUrl()}/reset-password`;
}

export default supabase;