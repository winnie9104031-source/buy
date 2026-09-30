import { createClient } from '@supabase/supabase-js';
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
export const money = (n) => `$${n.toLocaleString()}`;
export const calcTotal = (qty, items) =>
  items.reduce((s, it) => s + (qty?.[it.id] || 0) * it.price, 0);
