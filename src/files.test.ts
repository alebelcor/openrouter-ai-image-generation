import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import type { OutputFileSystem } from "./files";

import { imagePath, saveImages, timestamp } from "./files";

describe("file naming", () => {
  const date = new Date(2026, 7, 24, 18, 57, 8);
  const originalOutputFolder = process.env.OUTPUT_FOLDER;

  it("uses the configured output folder", () => {
    process.env.OUTPUT_FOLDER = "./generated-images";

    try {
      expect(imagePath(0, "png", "test/model", date)).toBe(
        resolve(process.cwd(), "generated-images", "test@model", "2026-08-24_18-57-08.png"),
      );
    } finally {
      if (originalOutputFolder === undefined) delete process.env.OUTPUT_FOLDER;
      else process.env.OUTPUT_FOLDER = originalOutputFolder;
    }
  });

  it("uses local timestamp format and adds suffixes", () => {
    process.env.OUTPUT_FOLDER = "./generated-images";

    try {
      expect(timestamp(date)).toBe("2026-08-24_18-57-08");
      expect(imagePath(0, "jpeg", "openai/gpt-image-2", date)).toMatch(
        /generated-images\/openai@gpt-image-2\/2026-08-24_18-57-08\.jpeg$/,
      );
      expect(imagePath(1, "jpeg", "openai/gpt-image-2", date)).toMatch(
        /generated-images\/openai@gpt-image-2\/2026-08-24_18-57-08-1\.jpeg$/,
      );
    } finally {
      if (originalOutputFolder === undefined) delete process.env.OUTPUT_FOLDER;
      else process.env.OUTPUT_FOLDER = originalOutputFolder;
    }
  });

  it("creates the model folder and writes decoded images without overwriting", async () => {
    process.env.OUTPUT_FOLDER = "./generated-images";
    const directories: string[] = [];
    const writes: Array<{ path: string; data: Buffer }> = [];
    let attempts = 0;
    const fileSystem: OutputFileSystem = {
      mkdir: async (path) => {
        directories.push(path);
        return undefined;
      },
      writeFile: async (path, data) => {
        attempts += 1;
        if (attempts === 1) {
          const error = new Error("already exists") as NodeJS.ErrnoException;
          error.code = "EEXIST";
          throw error;
        }
        writes.push({ path, data });
      },
    };

    try {
      const paths = await saveImages(
        [Buffer.from("image").toString("base64")],
        "png",
        "test/model",
        date,
        fileSystem,
      );

      expect(directories).toEqual([resolve(process.cwd(), "generated-images", "test@model")]);
      expect(paths).toEqual([
        resolve(process.cwd(), "generated-images", "test@model", "2026-08-24_18-57-08-1.png"),
      ]);
      expect(writes).toEqual([
        {
          path: paths[0],
          data: Buffer.from("image"),
        },
      ]);
    } finally {
      if (originalOutputFolder === undefined) delete process.env.OUTPUT_FOLDER;
      else process.env.OUTPUT_FOLDER = originalOutputFolder;
    }
  });
});
