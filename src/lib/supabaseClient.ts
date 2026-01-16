import { createClient, SupabaseClient } from '@supabase/supabase-js';

// 从环境变量读取配置
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 检查环境变量是否存在
export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

// 创建 Supabase 客户端
// 如果环境变量缺失，使用占位符（防止崩溃，但会在使用时报错）
export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  }
);

// 导出配置状态
export const getSupabaseConfig = () => ({
  hasUrl: Boolean(supabaseUrl),
  hasKey: Boolean(supabaseAnonKey),
  isConfigured: hasSupabaseConfig,
});
