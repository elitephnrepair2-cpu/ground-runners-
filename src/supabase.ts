import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseKey);

export type Submission = {
  id: string;
  created_at: string;
  runner_name: string;
  business_name: string;
  media_type: 'image' | 'video';
  media_url: string;
};
