# Supabase JavaScript SDK

The Supabase JavaScript SDK (`@supabase/supabase-js`) is an isomorphic TypeScript client library that provides a unified interface for interacting with Supabase services. It wraps and orchestrates six independent packages (auth-js, postgrest-js, realtime-js, storage-js, functions-js, and node-fetch) into a single client that handles authentication, real-time subscriptions, database operations, file storage, and serverless Edge Functions. The SDK works seamlessly across Node.js (Active LTS versions only - Node.js 18 support was dropped in v2.79.0), browsers, Deno, Bun, React Native, and Cloudflare Workers environments.

This unified client architecture automatically manages authentication tokens across all services, ensuring that database queries, storage operations, and function invocations inherit the current user's session. The SDK supports both Supabase Auth and third-party authentication systems through a flexible token provider interface. With comprehensive TypeScript support and database type generation, developers get end-to-end type safety from PostgreSQL schema to client application. The monorepo structure enables atomic cross-library fixes and immediate integration testing without manual release coordination.

## Core API: Main Supabase Client

Creating and initializing a Supabase client for all services.

```javascript
import { createClient } from "@supabase/supabase-js";

// Initialize client with project URL and anonymous key
const supabase = createClient(
  "https://xyzcompany.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5emNvbXBhbnkiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYxNjE2MjYzNywiZXhwIjoxOTMxNzM4NjM3fQ.2Vg_KQ0YXZ0Z9Z0Z9Z0Z9Z0Z9Z0Z9Z0Z9Z0Z9Z0"
);

// With custom configuration
const supabase = createClient(
  "https://xyzcompany.supabase.co",
  "your-anon-key",
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: window.localStorage, // Custom storage implementation
      flowType: "pkce", // Use PKCE flow for enhanced security
    },
    db: {
      schema: "public", // Database schema to use
    },
    global: {
      headers: { "x-application-name": "my-app" },
      fetch: customFetch, // Custom fetch implementation for Cloudflare Workers
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);

// Access service clients
const auth = supabase.auth;
const database = supabase; // Database queries directly on client
const storage = supabase.storage;
const functions = supabase.functions;
const realtime = supabase.realtime;

// Using third-party authentication (e.g., Firebase, Auth0, AWS Cognito)
const supabaseWithThirdPartyAuth = createClient(
  "https://xyzcompany.supabase.co",
  "your-anon-key",
  {
    accessToken: async () => {
      // Return JWT from your third-party auth provider
      // This function is called automatically for each request
      const token = await myAuthProvider.getAccessToken();
      return token;
    },
  }
);

// Note: When using accessToken option, supabase.auth is not accessible
// Attempting to use it will throw an error
// const user = await supabaseWithThirdPartyAuth.auth.getUser() // ❌ Throws error
```

## Authentication API

User authentication, session management, and identity operations.

```javascript
import { AuthClient } from '@supabase/auth-js'

// Initialize standalone auth client (or use supabase.auth)
const auth = new AuthClient({
  url: 'http://localhost:9999', // GoTrue server URL
  headers: {
    apikey: 'your-anon-key'
  },
  autoRefreshToken: true,
  persistSession: true,
  detectSessionInUrl: true
})

// Sign up new user with email and password
const { data, error } = await auth.signUp({
  email: 'user@example.com',
  password: 'secure-password-123',
  options: {
    data: { // Custom user metadata
      full_name: 'John Doe',
      age: 25
    },
    emailRedirectTo: 'https://example.com/welcome'
  }
})

if (error) {
  console.error('Sign up error:', error.message)
} else {
  console.log('User created:', data.user?.id)
  console.log('Session:', data.session?.access_token)
}

// Sign in with email and password
const { data: signInData, error: signInError } = await auth.signInWithPassword({
  email: 'user@example.com',
  password: 'secure-password-123'
})

// Sign in with OAuth provider
const { data: oAuthData, error: oAuthError } = await auth.signInWithOAuth({
  provider: 'github',
  options: {
    redirectTo: 'https://example.com/auth/callback',
    scopes: 'repo user'
  }
})

// Get current session
const { data: { session }, error: sessionError } = await auth.getSession()
if (session) {
  console.log('Access token:', session.access_token)
  console.log('User:', session.user.email)
  console.log('Expires at:', new Date(session.expires_at! * 1000))
}

// Listen to authentication state changes
const { data: { subscription } } = auth.onAuthStateChange((event, session) => {
  console.log('Auth event:', event) // 'SIGNED_IN', 'SIGNED_OUT', 'TOKEN_REFRESHED', etc.
  if (session) {
    console.log('User ID:', session.user.id)
  }
})

// Update user metadata
const { data: updateData, error: updateError } = await auth.updateUser({
  data: { full_name: 'Jane Doe' }
})

// Sign out
const { error: signOutError } = await auth.signOut()

// Unsubscribe from auth state changes
subscription.unsubscribe()
```

## Database API (PostgREST)

ORM-like interface for PostgreSQL database operations with type safety.

```javascript
import { PostgrestClient } from "@supabase/postgrest-js";

// Initialize standalone client (or use supabase directly)
const postgrest = new PostgrestClient("http://localhost:3000", {
  headers: {
    apikey: "your-anon-key",
    Authorization: "Bearer your-access-token",
  },
  schema: "public",
  fetch: customFetch,
});

// Select all rows from table
const { data: allUsers, error: selectError } = await postgrest
  .from("users")
  .select("*");

// Select specific columns with filtering
const { data: filteredUsers, error: filterError } = await postgrest
  .from("users")
  .select("id, email, created_at, profiles(avatar_url, bio)")
  .eq("status", "active")
  .gte("age", 18)
  .order("created_at", { ascending: false })
  .limit(10);

if (filteredUsers) {
  filteredUsers.forEach((user) => {
    console.log(`${user.email} - ${user.profiles?.bio}`);
  });
}

// Insert single row
const { data: newUser, error: insertError } = await postgrest
  .from("users")
  .insert({
    email: "newuser@example.com",
    full_name: "New User",
    age: 30,
  })
  .select()
  .single();

// Insert multiple rows
const { data: newUsers, error: bulkInsertError } = await postgrest
  .from("users")
  .insert([
    { email: "user1@example.com", full_name: "User One" },
    { email: "user2@example.com", full_name: "User Two" },
    { email: "user3@example.com", full_name: "User Three" },
  ])
  .select();

// Update rows
const { data: updatedUser, error: updateError } = await postgrest
  .from("users")
  .update({ status: "inactive", updated_at: new Date().toISOString() })
  .eq("id", "123e4567-e89b-12d3-a456-426614174000")
  .select()
  .single();

// Upsert (insert or update if exists)
const { data: upsertedUser, error: upsertError } = await postgrest
  .from("users")
  .upsert(
    {
      id: "123e4567-e89b-12d3-a456-426614174000",
      email: "user@example.com",
      full_name: "Updated Name",
    },
    {
      onConflict: "email", // Column to check for conflicts
    }
  )
  .select();

// Delete rows
const { data: deletedUsers, error: deleteError } = await postgrest
  .from("users")
  .delete()
  .eq("status", "banned")
  .select();

// Call database function (RPC)
const { data: result, error: rpcError } = await postgrest.rpc(
  "calculate_user_stats",
  {
    user_id: "123e4567-e89b-12d3-a456-426614174000",
    include_archived: false,
  }
);

// Complex query with joins and filters
const { data: posts, error: complexError } = await postgrest
  .from("posts")
  .select(
    `
    id,
    title,
    content,
    created_at,
    author:users!author_id(id, email, full_name),
    comments(id, content, user:users(email)),
    tags(name)
  `
  )
  .eq("published", true)
  .gte("created_at", "2024-01-01")
  .or("status.eq.featured,priority.gte.5")
  .order("created_at", { ascending: false })
  .range(0, 9); // Pagination: rows 0-9

// Count rows
const { count, error: countError } = await postgrest
  .from("users")
  .select("*", { count: "exact", head: true })
  .eq("status", "active");

console.log(`Active users: ${count}`);
```

## Real-time API

WebSocket-based real-time subscriptions for broadcasts, presence, and database changes.

```javascript
import { RealtimeClient } from "@supabase/realtime-js";

// Initialize client (or use supabase.realtime)
const realtime = new RealtimeClient("ws://localhost:4000/socket", {
  params: {
    apikey: "your-anon-key",
  },
  heartbeatIntervalMs: 30000,
  reconnectAfterMs: (tries) => [1000, 2000, 5000, 10000][tries - 1] || 10000,
});

// Connect to realtime server
realtime.connect();

// Create a channel for broadcasts
const broadcastChannel = realtime.channel("game-room-1", {
  config: {
    broadcast: { ack: true, self: false },
  },
});

// Listen for broadcast messages
broadcastChannel.on("broadcast", { event: "cursor-move" }, (payload) => {
  console.log(
    "Cursor moved:",
    payload.x,
    payload.y,
    "by user:",
    payload.userId
  );
});

// Subscribe and send broadcast
broadcastChannel.subscribe(async (status) => {
  if (status === "SUBSCRIBED") {
    console.log("Connected to game room");

    // Send cursor position to other clients
    const response = await broadcastChannel.send({
      type: "broadcast",
      event: "cursor-move",
      payload: { userId: "user-123", x: 100, y: 200 },
    });

    if (response === "ok") {
      console.log("Broadcast sent successfully");
    }
  } else if (status === "CHANNEL_ERROR") {
    console.error("Failed to subscribe to channel");
  }
});

// Create presence channel to track online users
const presenceChannel = realtime.channel("room-presence", {
  config: {
    presence: {
      key: "user-123", // Unique identifier for this client
    },
  },
});

// Listen to presence events
presenceChannel.on("presence", { event: "sync" }, () => {
  const state = presenceChannel.presenceState();
  console.log("Online users:", Object.keys(state).length);
  Object.entries(state).forEach(([key, presences]) => {
    console.log(`${key}: ${presences[0].username}`);
  });
});

presenceChannel.on("presence", { event: "join" }, ({ key, newPresences }) => {
  console.log("User joined:", newPresences[0].username);
});

presenceChannel.on("presence", { event: "leave" }, ({ key, leftPresences }) => {
  console.log("User left:", leftPresences[0].username);
});

// Subscribe and track presence
presenceChannel.subscribe(async (status) => {
  if (status === "SUBSCRIBED") {
    await presenceChannel.track({
      user_id: "user-123",
      username: "johndoe",
      status: "online",
      last_seen: new Date().toISOString(),
    });
  }
});

// Listen to database changes (Postgres CDC)
const dbChannel = realtime.channel("db-changes");

// Listen to all changes in public schema
dbChannel.on(
  "postgres_changes",
  { event: "*", schema: "public" },
  (payload) => {
    console.log("Database change:", payload.eventType, payload.table);
    console.log("New data:", payload.new);
    console.log("Old data:", payload.old);
  }
);

// Listen to specific table inserts
dbChannel.on(
  "postgres_changes",
  { event: "INSERT", schema: "public", table: "messages" },
  (payload) => {
    console.log("New message inserted:", payload.new);
  }
);

// Listen to specific table updates with filter
dbChannel.on(
  "postgres_changes",
  {
    event: "UPDATE",
    schema: "public",
    table: "users",
    filter: "status=eq.premium", // Only changes where status = 'premium'
  },
  (payload) => {
    console.log("Premium user updated:", payload.new.email);
  }
);

dbChannel.subscribe((status) => {
  if (status === "SUBSCRIBED") {
    console.log("Listening for database changes");
  }
});

// Cleanup channels
broadcastChannel.unsubscribe();
realtime.removeChannel(broadcastChannel);

// Disconnect all channels
realtime.removeAllChannels();
realtime.disconnect();
```

## Storage API

File upload, download, and management with support for public/private buckets, image transformations, analytics buckets, and vector embeddings.

```javascript
import { StorageClient } from '@supabase/storage-js'

// Initialize client (or use supabase.storage)
const storage = new StorageClient('https://xyzcompany.supabase.co/storage/v1', {
  apikey: 'your-service-key',
  Authorization: 'Bearer your-service-key'
})

// Create a storage bucket
const { data: newBucket, error: createError } = await storage.createBucket('avatars', {
  public: false, // Private bucket requiring authentication
  fileSizeLimit: 5242880, // 5MB limit
  allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif']
})

// List all buckets
const { data: buckets, error: listError } = await storage.listBuckets()
buckets?.forEach(bucket => {
  console.log(`${bucket.name} - Public: ${bucket.public}`)
})

// Get bucket details
const { data: bucket, error: getError } = await storage.getBucket('avatars')

// Update bucket configuration
const { data: updatedBucket, error: updateError } = await storage.updateBucket('avatars', {
  public: true,
  fileSizeLimit: 10485760 // 10MB
})

// Upload file to bucket
const file = new File(['content'], 'profile.jpg', { type: 'image/jpeg' })

const { data: uploadData, error: uploadError } = await storage
  .from('avatars')
  .upload('user-123/profile.jpg', file, {
    cacheControl: '3600',
    upsert: false, // Fail if file exists
    contentType: 'image/jpeg'
  })

if (uploadData) {
  console.log('File uploaded:', uploadData.path)
  console.log('Bucket:', uploadData.bucketId)
}

// Upload with progress tracking
const largeFile = new File(['large content'], 'video.mp4', { type: 'video/mp4' })

const { data: largeUpload, error: largeError } = await storage
  .from('videos')
  .upload('user-123/video.mp4', largeFile, {
    cacheControl: '3600',
    upsert: true
  })

// Download file
const { data: downloadedFile, error: downloadError } = await storage
  .from('avatars')
  .download('user-123/profile.jpg')

if (downloadedFile) {
  const blob = downloadedFile
  const url = URL.createObjectURL(blob)
  console.log('Downloaded file URL:', url)
}

// List files in bucket
const { data: files, error: filesError } = await storage
  .from('avatars')
  .list('user-123', {
    limit: 100,
    offset: 0,
    sortBy: { column: 'created_at', order: 'desc' }
  })

files?.forEach(file => {
  console.log(`${file.name} - ${file.metadata.size} bytes`)
})

// Get public URL for file
const { data: publicUrl } = storage
  .from('public-bucket')
  .getPublicUrl('images/logo.png')

console.log('Public URL:', publicUrl.publicUrl)

// Create signed URL for temporary access
const { data: signedUrl, error: signedError } = await storage
  .from('avatars')
  .createSignedUrl('user-123/profile.jpg', 3600) // Valid for 1 hour

console.log('Signed URL:', signedUrl?.signedUrl)
console.log('Expires at:', new Date(signedUrl?.expiresAt!))

// Get signed URL with transformation options (image processing)
const { data: transformedUrl, error: transformError } = await storage
  .from('avatars')
  .createSignedUrl('user-123/profile.jpg', 3600, {
    transform: {
      width: 200,
      height: 200,
      resize: 'cover',
      format: 'webp',
      quality: 85
    }
  })

// Move/rename file
const { data: moveData, error: moveError } = await storage
  .from('avatars')
  .move('user-123/old-profile.jpg', 'user-123/new-profile.jpg')

// Copy file
const { data: copyData, error: copyError } = await storage
  .from('avatars')
  .copy('user-123/profile.jpg', 'user-123/profile-backup.jpg')

// Delete files
const { data: deleteData, error: deleteError } = await storage
  .from('avatars')
  .remove(['user-123/old-avatar.jpg', 'user-123/temp.jpg'])

// Empty bucket (remove all files)
const { data: emptyData, error: emptyError } = await storage
  .emptyBucket('temp-bucket')

// Delete bucket
const { data: deleteBucket, error: deleteBucketError } = await storage
  .deleteBucket('temp-bucket')

// Analytics storage using Iceberg tables (Public Alpha)
const analytics = storage.analytics

// Create analytics bucket for data processing and queries
const { data: analyticsBucket, error: analyticsError } = await analytics.createBucket('sales-data')

// List analytics buckets with filters
const { data: analyticsBuckets, error: listAnalyticsError } = await analytics.listBuckets({
  limit: 10,
  offset: 0,
  sortColumn: 'created_at',
  sortOrder: 'desc',
  search: 'analytics'
})

analyticsBuckets?.forEach(bucket => {
  console.log(`Analytics bucket: ${bucket.name}`)
})

// Delete analytics bucket (must be empty first)
const { data: deleteAnalytics, error: deleteAnalyticsError } = await analytics.deleteBucket('old-sales-data')

// Get Iceberg REST Catalog for advanced table operations
const catalog = analytics.from('sales-data')

// Create namespace in analytics bucket
const { data: namespace, error: nsError } = await catalog.createNamespace({ namespace: ['default'] })

// Create Iceberg table with schema
const { data: tableMetadata, error: tableError } = await catalog.createTable(
  { namespace: ['default'] },
  {
    name: 'events',
    schema: {
      type: 'struct',
      fields: [
        { id: 1, name: 'id', type: 'long', required: true },
        { id: 2, name: 'timestamp', type: 'timestamp', required: true },
        { id: 3, name: 'user_id', type: 'string', required: false },
        { id: 4, name: 'event_type', type: 'string', required: true }
      ],
      'schema-id': 0,
      'identifier-field-ids': [1]
    },
    'partition-spec': {
      'spec-id': 0,
      fields: []
    },
    'write-order': {
      'order-id': 0,
      fields: []
    },
    properties: {
      'write.format.default': 'parquet'
    }
  }
)

if (tableError) {
  console.error('Failed to create table:', tableError.message)
} else {
  console.log('Table created:', tableMetadata?.['metadata-location'])
}

// List tables in namespace
const { data: tables, error: listTablesError } = await catalog.listTables({ namespace: ['default'] })

tables?.identifiers.forEach(table => {
  console.log(`Table: ${table.namespace.join('.')}.${table.name}`)
})

// Drop table with purge option (removes all data)
const { data: dropResult, error: dropError } = await catalog.dropTable(
  { namespace: ['default'], name: 'events' },
  { purge: true }
)

// Drop namespace (must be empty)
const { data: dropNsResult, error: dropNsError } = await catalog.dropNamespace({ namespace: ['default'] })

// Vector embeddings storage (Private Alpha)
// Note: Vector storage APIs are currently in private alpha and may not be accessible
const vectors = storage.vectors

// Create vector bucket
await vectors.createBucket('embeddings-prod')

// Create vector index for semantic search
const bucket = vectors.from('embeddings-prod')
await bucket.createIndex({
  indexName: 'documents-openai',
  dataType: 'float32',
  dimension: 1536,
  distanceMetric: 'cosine',
  metadataConfiguration: {
    nonFilterableMetadataKeys: ['raw_text'] // Exclude from filters to save memory
  }
})

// Insert vectors with metadata
const index = bucket.index('documents-openai')
await index.putVectors({
  vectors: [
    {
      key: 'doc-1',
      data: { float32: new Array(1536).fill(0).map(() => Math.random()) },
      metadata: { title: 'Introduction', category: 'docs', page: 1 }
    },
    {
      key: 'doc-2',
      data: { float32: new Array(1536).fill(0).map(() => Math.random()) },
      metadata: { title: 'Getting Started', category: 'docs', page: 2 }
    }
  ]
})

// Query similar vectors with metadata filters
const { data: matches, error: queryError } = await index.queryVectors({
  queryVector: { float32: new Array(1536).fill(0).map(() => Math.random()) },
  topK: 5,
  filter: { category: 'docs' }, // Only search within 'docs' category
  returnDistance: true,
  returnMetadata: true
})

matches?.vectors.forEach(match => {
  console.log(`${match.key}: distance=${match.distance}`, match.metadata)
})

// Get specific vectors by key
const { data: vectorData, error: getVectorError } = await index.getVectors({
  keys: ['doc-1', 'doc-2'],
  returnMetadata: true
})

// List all vectors with pagination
const { data: vectorList, error: listVectorError } = await index.listVectors({
  maxResults: 500,
  returnMetadata: true
})

// Delete vectors
await index.deleteVectors({
  keys: ['doc-1', 'doc-2']
})

// List indexes in bucket
const { data: indexes, error: indexError } = await bucket.listIndexes({ prefix: 'documents-' })

// Delete index
await bucket.deleteIndex('documents-openai')

// Delete vector bucket
await vectors.deleteBucket('embeddings-prod')
```

## Functions API

Invoke serverless Edge Functions deployed on Supabase.

```javascript
import { FunctionsClient } from "@supabase/functions-js";

// Initialize client (or use supabase.functions)
const functions = new FunctionsClient(
  "https://xyzcompany.supabase.co/functions/v1",
  {
    headers: {
      Authorization: "Bearer your-anon-key",
    },
  }
);

// Invoke function with JSON body
const { data, error } = await functions.invoke("hello-world", {
  body: {
    name: "Alice",
    message: "Hello from client",
  },
  headers: {
    "x-custom-header": "custom-value",
  },
});

if (error) {
  console.error("Function error:", error.message);
} else {
  console.log("Function response:", data);
}

// Invoke function with GET request
const { data: getData, error: getError } = await functions.invoke(
  "get-user-data",
  {
    method: "GET",
  }
);

// Invoke function with custom headers
const { data: authData, error: authError } = await functions.invoke(
  "protected-function",
  {
    body: { userId: "123" },
    headers: {
      Authorization: "Bearer user-specific-token",
      "x-api-key": "secret-key",
    },
  }
);

// Invoke function and handle streaming response
const { data: streamData, error: streamError } = await functions.invoke(
  "stream-data",
  {
    body: { query: "large dataset" },
  }
);

if (streamData) {
  // Response is a ReadableStream or similar depending on environment
  console.log("Streaming response:", streamData);
}

// Invoke function with blob/file upload
const fileToUpload = new File(["file content"], "document.pdf", {
  type: "application/pdf",
});

const { data: uploadResponse, error: uploadError } = await functions.invoke(
  "process-file",
  {
    body: fileToUpload,
    headers: {
      "Content-Type": "application/pdf",
    },
  }
);

// Error handling with detailed information
const { data: result, error: invokeError } = await functions.invoke(
  "my-function",
  {
    body: { input: "data" },
  }
);

if (invokeError) {
  console.error("Status:", invokeError.status);
  console.error("Message:", invokeError.message);
  console.error("Context:", invokeError.context);
}
```

## Use Cases and Integration Patterns

The Supabase JavaScript SDK excels in building full-stack applications where authentication, real-time collaboration, database operations, file management, analytics, vector search, and serverless functions need to work together seamlessly. Common use cases include collaborative SaaS platforms with real-time presence and document editing, social media applications requiring user authentication and media storage, AI-powered applications leveraging vector embeddings for semantic search and RAG (Retrieval-Augmented Generation), data analytics platforms using Iceberg tables for efficient query processing, and enterprise applications integrating third-party authentication systems like Auth0, Firebase, or AWS Cognito. The SDK's isomorphic design allows developers to write once and deploy across Next.js server components, React Native mobile apps, Cloudflare Workers edge functions, and traditional Node.js backends without code changes.

Integration patterns typically start with the unified client (`createClient`) providing access to all services through a single initialization point. Authentication tokens automatically propagate across database queries, storage operations, and function invocations through either Supabase Auth's built-in session management or a custom `accessToken` provider for third-party auth systems. Real-time subscriptions complement database operations by pushing changes to connected clients instantly, while storage integrations work alongside database records to manage user-generated content. The analytics API (public alpha) enables efficient data processing with Iceberg tables and provides full REST Catalog access for advanced table operations, and vector storage (private alpha) supports AI applications with semantic search capabilities. The unified client architecture ensures that cross-service features like Row Level Security (RLS) policies work consistently, with auth sessions automatically enforcing database permissions and storage bucket policies through JWT claims. Developers benefit from TypeScript's type inference across the entire stack when using database type generation, enabling end-to-end type safety from PostgreSQL schema to client application. The monorepo structure ensures all packages version together, simplifying dependency management and enabling atomic cross-library updates.
