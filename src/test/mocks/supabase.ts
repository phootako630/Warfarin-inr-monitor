import { vi } from 'vitest';

export const mockSupabaseClient = {
  auth: {
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    })),
  },
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    single: vi.fn(),
  })),
};

export const createMockSupabaseResponse = <T>(data: T, error: any = null) => ({
  data,
  error,
  count: null,
  status: error ? 400 : 200,
  statusText: error ? 'Bad Request' : 'OK',
});

export const mockInrRecord = {
  id: 'test-inr-id',
  user_id: 'test-user-id',
  value: 2.5,
  record_time: '2026-01-20T10:00:00Z',
  warfarin_dose_mg: 3.0,
  is_in_range: true,
  target_range_low: 2.0,
  target_range_high: 3.0,
  note: '测试记录',
  created_at: '2026-01-20T10:00:00Z',
};

export const mockBpRecord = {
  id: 'test-bp-id',
  user_id: 'test-user-id',
  systolic: 120,
  diastolic: 80,
  heart_rate: 70,
  position: '坐位',
  record_time: '2026-01-20T10:00:00Z',
  created_at: '2026-01-20T10:00:00Z',
};

export const mockSession = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  token_type: 'bearer',
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    aud: 'authenticated',
    role: 'authenticated',
    created_at: '2026-01-01T00:00:00Z',
  },
};
