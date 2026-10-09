/** @jest-environment node */

import { readFileSync } from "node:fs";
import { join } from "node:path";

function migration(name: string): string {
  return readFileSync(
    join(process.cwd(), "supabase", "migrations", name),
    "utf8",
  );
}

describe("AI hardening migrations", () => {
  it("derives quota identity from auth and hides counters from clients", () => {
    const sql = migration("20261007120000_ai_runtime_limits.sql");
    expect(sql).toContain("v_user_id uuid := auth.uid()");
    expect(sql).not.toMatch(/p_user_id/i);
    expect(sql).toContain("security definer");
    expect(sql).toContain("set search_path = ''");
    expect(sql).toContain("enable row level security");
    expect(sql).toContain(
      "revoke all on table public.ai_usage_limits from anon, authenticated",
    );
  });

  it("uses scoped partial unique indexes for retry keys", () => {
    const sql = migration("20261007130000_ai_import_idempotency.sql");
    expect(sql).toContain("(vehicle_id, client_request_id)");
    expect(sql.match(/where client_request_id is not null/g)).toHaveLength(2);
  });

  it("deduplicates content-free quality events without storing user IDs", () => {
    const sql = migration("20261007140000_ai_import_quality_metrics.sql");
    expect(sql).toContain("v_user_id uuid := auth.uid()");
    expect(sql).toContain("request_id text primary key");
    expect(sql).toContain("on conflict (request_id) do nothing");
    expect(sql).not.toMatch(/insert into[^;]+user_id/is);
    expect(sql).not.toMatch(/document|message|vehicle_id|model_output/i);
  });
});
