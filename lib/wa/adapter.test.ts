import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { buildWaRequest, interpretWaResponse } = await import("./adapter");

describe("buildWaRequest", () => {
  it("fonnte: form target/message + Authorization token polos", () => {
    const r = buildWaRequest("fonnte", "TKN", "6281234567890", "Halo");
    expect(r.headers.Authorization).toBe("TKN");
    expect((r.body as URLSearchParams).get("target")).toBe("6281234567890");
    expect((r.body as URLSearchParams).get("message")).toBe("Halo");
  });
  it("wablas: JSON phone/message", () => {
    const r = buildWaRequest("wablas", "TKN", "628", "Hi");
    expect(JSON.parse(r.body as string)).toEqual({ phone: "628", message: "Hi" });
  });
  it("generic: JSON to/message + Bearer", () => {
    const r = buildWaRequest("generic", "TKN", "628", "Hi");
    expect(r.headers.Authorization).toBe("Bearer TKN");
    expect(JSON.parse(r.body as string)).toEqual({ to: "628", message: "Hi" });
  });
});

describe("interpretWaResponse", () => {
  it("2xx = sukses", () => expect(interpretWaResponse(200, "OK")).toBe(true));
  it("HTTP error = gagal", () => expect(interpretWaResponse(500, "")).toBe(false));
  it("200 tapi {status:false} = gagal", () => expect(interpretWaResponse(200, '{"status":false,"reason":"invalid token"}')).toBe(false));
  it("200 {status:true} = sukses", () => expect(interpretWaResponse(200, '{"status":true}')).toBe(true));
});
