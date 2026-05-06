import { sortRemindersActiveFirstByCreatedAt } from "../../services/reminders/reminderOrdering";

describe("sortRemindersActiveFirstByCreatedAt", () => {
  it("sorts active before done, then by created_at ascending", () => {
    const rows = [
      { id: "1", status: "done", created_at: "2024-01-02T00:00:00Z" },
      { id: "2", status: "active", created_at: "2024-01-03T00:00:00Z" },
      { id: "3", status: "active", created_at: "2024-01-01T00:00:00Z" },
      { id: "4", status: "done", created_at: "2024-01-01T00:00:00Z" },
    ];
    const sorted = sortRemindersActiveFirstByCreatedAt(rows);
    expect(sorted.map((r) => r.id)).toEqual(["3", "2", "4", "1"]);
  });

  it("does not mutate original array", () => {
    const rows = [
      { status: "done", created_at: "2024-01-01T00:00:00Z" },
      { status: "active", created_at: "2024-01-02T00:00:00Z" },
    ];
    const copy = [...rows];
    sortRemindersActiveFirstByCreatedAt(rows);
    expect(rows).toEqual(copy);
  });
});
