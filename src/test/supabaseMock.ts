 
/** Shared Supabase client mock for repo/integration-style tests. */

export type MockThenablePayload = {
  data?: unknown;
  error?: unknown;
  count?: number | null;
};

/** Fluent PostgREST-style builder that is awaitable and supports .single() / .maybeSingle(). */
export function createPostgrestChain(final: MockThenablePayload) {
  const payload: any = {
    data: final.data ?? null,
    error: final.error ?? null,
  };
  if (final.count !== undefined) payload.count = final.count;

  const chain: any = {};
  const fluent = [
    "select",
    "insert",
    "update",
    "delete",
    "eq",
    "in",
    "order",
    "limit",
    "neq",
  ];
  for (const m of fluent) {
    chain[m] = jest.fn(() => chain);
  }
  chain.single = jest.fn(async () => payload);
  chain.maybeSingle = jest.fn(async () => payload);
  chain.then = (onFulfilled: any, onRejected: any) =>
    Promise.resolve(payload).then(onFulfilled, onRejected);
  return chain;
}

export const mockStorageBucket = {
  upload: jest.fn(),
  remove: jest.fn(),
  list: jest.fn(),
  getPublicUrl: jest.fn(() => ({
    data: { publicUrl: "https://example.test/storage-public" },
  })),
};

export const supabase = {
  auth: {
    getSession: jest.fn(),
    onAuthStateChange: jest.fn(() => ({
      data: { subscription: { unsubscribe: jest.fn() } },
    })),
    signOut: jest.fn(),
    setSession: jest.fn(),
    getUser: jest.fn(),
  },
  rpc: jest.fn(),
  from: jest.fn(() => createPostgrestChain({ data: null, error: null })),
  functions: {
    invoke: jest.fn(),
  },
  storage: {
    from: jest.fn(() => mockStorageBucket),
  },
};

export function resetSupabaseMock() {
  supabase.auth.getSession.mockReset();
  supabase.auth.onAuthStateChange.mockImplementation(() => ({
    data: { subscription: { unsubscribe: jest.fn() } },
  }));
  supabase.auth.signOut.mockReset();
  supabase.auth.setSession.mockReset();
  supabase.auth.getUser.mockReset();

  supabase.rpc.mockReset();
  supabase.from.mockReset();
  supabase.from.mockImplementation(() =>
    createPostgrestChain({ data: null, error: null }),
  );

  supabase.functions.invoke.mockReset();

  mockStorageBucket.upload.mockReset();
  mockStorageBucket.remove.mockReset();
  mockStorageBucket.list.mockReset();
  mockStorageBucket.getPublicUrl.mockReset();
  mockStorageBucket.getPublicUrl.mockImplementation(() => ({
    data: { publicUrl: "https://example.test/storage-public" },
  }));

  supabase.storage.from.mockReset();
  supabase.storage.from.mockImplementation(() => mockStorageBucket);
}
