import { describe, expect, it } from "vitest";
import { canSubmitPasswordChange, normalizePasswordPayload } from "./password-domain";

describe("password-domain", () => {
  it("requires matching passwords with minimum length", () => {
    expect(canSubmitPasswordChange({ password: "short", confirmPassword: "short" })).toBe(false);
    expect(canSubmitPasswordChange({ password: "password123", confirmPassword: "different" })).toBe(false);
    expect(canSubmitPasswordChange({ password: "password123", confirmPassword: "password123" })).toBe(true);
  });

  it("normalizes password payload without leaking confirm password", () => {
    expect(normalizePasswordPayload({ password: "  password123  ", confirmPassword: "password123" })).toEqual({
      password: "password123",
    });
  });
});
