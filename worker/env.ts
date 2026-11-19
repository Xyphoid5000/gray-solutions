// Shared Worker types and environment bindings.

export interface D1Result<T = unknown> {
  results: T[];
  success: boolean;
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(column?: string): Promise<T | null>;
  all<T = unknown>(): Promise<D1Result<T>>;
  run(): Promise<{
    success: boolean;
    meta?: { last_row_id?: number; changes?: number };
  }>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

export interface R2ObjectBody {
  arrayBuffer(): Promise<ArrayBuffer>;
  httpMetadata?: { contentType?: string };
  size: number;
}

export interface R2Bucket {
  put(
    key: string,
    value: ArrayBuffer,
    options?: { httpMetadata?: { contentType?: string } },
  ): Promise<unknown>;
  get(key: string): Promise<R2ObjectBody | null>;
}

export interface Env {
  ASSETS: Fetcher;
  DB_CLIENTS?: D1Database;
  RESEND_API_KEY?: string;
  CONTACT_TO?: string;
  CONTACT_FROM?: string;
  /** Admin password sign-in — set by Chris in the dashboard. Clients
      keep magic links; only chris@ can use the password path. */
  ADMIN_PASSWORD?: string;
  /** Optional: image uploads stay disabled until the bucket exists. */
  R2_UPLOADS?: R2Bucket;
  /** Shared secret this Worker sends when it asks the dashboard
      Worker to push a new-lead notification (POST /api/push/notify).
      A runtime secret, set in the dashboard — the SAME value must
      be set on the dashboard Worker. Without it, no push is attempted. */
  INTERNAL_PUSH_SECRET?: string;
  /** Dashboard base URL for the new-lead push call. Defaults to
      https://dashboard.graywebsolutions.com when unset. */
  DASHBOARD_PUSH_URL?: string;
}

export const CHRIS_EMAIL = 'chris@graywebsolutions.com';
