import {
  createReminder,
  deleteReminder,
  getReminder,
  listReminders,
  updateReminder,
} from "../../services/reminders/remindersRepo";
import type { Reminder } from "../../types/domain";
import { createPostgrestChain, supabase } from "../../test/supabaseMock";

describe("remindersRepo", () => {
  it("listReminders returns [] when freePlanReminderIds empty", async () => {
    await expect(
      listReminders("v1", { freePlanReminderIds: [] }),
    ).resolves.toEqual([]);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("listReminders sorts active first then applies limit", async () => {
    const rows = [
      {
        id: "done-first",
        status: "done",
        created_at: "2025-01-01T00:00:00Z",
      },
      {
        id: "active-newer",
        status: "active",
        created_at: "2025-01-03T00:00:00Z",
      },
      {
        id: "active-older",
        status: "active",
        created_at: "2025-01-02T00:00:00Z",
      },
    ] as unknown as Reminder[];

    supabase.from.mockImplementation(() =>
      createPostgrestChain({ data: rows, error: null }),
    );

    const out = await listReminders("v1", { limit: 2 });
    expect(out.map((r) => r.id)).toEqual(["active-older", "active-newer"]);
  });

  it("createReminder calls RPC", async () => {
    const row = { id: "r1" };
    supabase.rpc.mockResolvedValue({ data: row, error: null });

    const out = await createReminder({
      vehicle_id: "v1",
      due_date: "2025-06-01",
      due_mileage: null,
      days_before: 7,
      title: "Insurance",
      notes: null,
      channel_email: true,
      channel_push: true,
      enabled: true,
    });

    expect(supabase.rpc).toHaveBeenCalledWith(
      "create_reminder",
      expect.objectContaining({
        p_vehicle_id: "v1",
        p_due_date: "2025-06-01",
      }),
    );
    expect(out).toEqual(row);
  });

  it("getReminder loads single", async () => {
    const row = { id: "r1" };
    supabase.from.mockImplementation(() =>
      createPostgrestChain({ data: row, error: null }),
    );
    await expect(getReminder("r1")).resolves.toEqual(row);
  });

  it("updateReminder patches row", async () => {
    const row = { id: "r1", title: "Updated" };
    supabase.from.mockImplementation(() =>
      createPostgrestChain({ data: row, error: null }),
    );
    await expect(
      updateReminder("r1", { title: "Updated" }),
    ).resolves.toEqual(row);
  });

  it("deleteReminder deletes by id", async () => {
    supabase.from.mockImplementation(() =>
      createPostgrestChain({ data: null, error: null }),
    );
    await expect(deleteReminder("r1")).resolves.toBeUndefined();
  });
});
