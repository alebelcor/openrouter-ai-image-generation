import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { isMarkdownFilename, parseDirectory } from "./watch";

describe("watch arguments", () => {
  it("resolves the directory passed to --directory", () => {
    expect(parseDirectory(["--directory", "./prompts"])).toBe(resolve("./prompts"));
  });

  it.each([
    { args: [] },
    { args: ["--directory"] },
    { args: ["--other", "./prompts"] },
    { args: ["--directory", "./prompts", "--other"] },
  ])("rejects invalid arguments: $args", ({ args }) => {
    expect(() => parseDirectory(args)).toThrow("Usage: pnpm watch --directory <path>");
  });
});

describe("watched filenames", () => {
  it.each(["prompt.md", Buffer.from("prompt.md")])("accepts Markdown files: %s", (filename) => {
    expect(isMarkdownFilename(filename)).toBe(true);
  });

  it.each(["prompt.txt", "prompt.md.bak", null])("ignores non-Markdown files: %s", (filename) => {
    expect(isMarkdownFilename(filename)).toBe(false);
  });
});
