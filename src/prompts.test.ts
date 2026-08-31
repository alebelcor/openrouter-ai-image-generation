import { describe, expect, it } from "vitest";

import { normalizePrompt } from "./prompts";

describe("normalizePrompt", () => {
  it("collapses repeated whitespace and trims the result", () => {
    expect(normalizePrompt("  foo\n\nbar\n\nfoobar  ")).toBe("foo bar foobar");
  });
});
