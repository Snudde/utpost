import { describe, it, expect, vi } from "vitest";
import request from "supertest";

vi.mock("../db/client.js", () => ({
  pool: { query: vi.fn().mockResolvedValue({ rows: [] }) },
}));

const { app } = await import("../app.js");

describe("DELETE /api/tours/:id", () => {
  // Regressionstest för skuld #3 i docs/debt.md (issue #17)
  it("skuld #3: nekar radering utan token", async () => {
    const res = await request(app).delete("/api/tours/1");
    expect(res.status).toBe(401);
  });
});
