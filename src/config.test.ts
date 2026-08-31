import { describe, expect, it } from "vitest";

import { configuredModel, configuredPromptFilePath, loadModelConfigs } from "./config";

describe("model configurations", () => {
  it("loads any available model configurations", async () => {
    const configs = await loadModelConfigs();

    expect(configs.length).toBeGreaterThan(0);

    for (const config of configs) {
      expect(config.model).toBeTruthy();
      expect(config.rules).toBeTypeOf("object");
      for (const [key, value] of Object.entries(config.values)) {
        const allowedValues = config.rules[key as keyof typeof config.rules];

        expect(allowedValues).toBeDefined();
        expect(allowedValues).toContain(value);
      }
    }
  });

  it("reads the configured model and prompt path from the environment", () => {
    const originalModel = process.env.MODEL;
    const originalPromptPath = process.env.PROMPT_FILE_PATH;

    try {
      process.env.MODEL = "configured/model";
      process.env.PROMPT_FILE_PATH = " ./prompts/example.md ";

      expect(configuredModel(["configured/model"])).toBe("configured/model");
      expect(configuredPromptFilePath()).toBe("./prompts/example.md");
      expect(() => configuredModel(["another/model"])).toThrow("MODEL is not configured");
    } finally {
      if (originalModel === undefined) {
        delete process.env.MODEL;
      } else {
        process.env.MODEL = originalModel;
      }
      if (originalPromptPath === undefined) {
        delete process.env.PROMPT_FILE_PATH;
      } else {
        process.env.PROMPT_FILE_PATH = originalPromptPath;
      }
    }
  });

  it("treats blank environment values as unset", () => {
    const originalModel = process.env.MODEL;
    const originalPromptPath = process.env.PROMPT_FILE_PATH;

    try {
      process.env.MODEL = "  ";
      process.env.PROMPT_FILE_PATH = "  ";

      expect(configuredModel(["configured/model"])).toBeUndefined();
      expect(configuredPromptFilePath()).toBeUndefined();
    } finally {
      if (originalModel === undefined) {
        delete process.env.MODEL;
      } else {
        process.env.MODEL = originalModel;
      }
      if (originalPromptPath === undefined) {
        delete process.env.PROMPT_FILE_PATH;
      } else {
        process.env.PROMPT_FILE_PATH = originalPromptPath;
      }
    }
  });
});

describe("configuration discovery", () => {
  function discovery(modules: Record<string, unknown>, fileNames: string[]) {
    return {
      readDirectory: async () => fileNames,
      importModule: async (path: string) =>
        modules[path.replace(/^.*\/config\//, "/workspace/config/")],
    };
  }

  it("sorts files, decodes model names, and validates SDK option keys", async () => {
    const configs = await loadModelConfigs(
      discovery(
        {
          "/workspace/config/acme@second.ts": {
            rules: { n: [1] },
            values: { n: 1 },
          },
          "/workspace/config/acme@first.ts": {
            rules: { outputFormat: ["png"] },
            values: { outputFormat: "png" },
          },
        },
        ["acme@second.ts", "notes.md", "acme@first.ts"],
      ),
    );

    expect(configs.map(({ model }) => model)).toEqual(["acme/first", "acme/second"]);
  });

  it.each([
    ["missing rules", { values: {} }, "rules and values must be objects"],
    ["unknown rule", { rules: { typo: ["value"] }, values: {} }, "Unknown option"],
    ["unknown value", { rules: {}, values: { typo: "value" } }, "Unknown option"],
    ["missing value rule", { rules: {}, values: { n: 1 } }, "Missing rule"],
    ["invalid value", { rules: { n: [1] }, values: { n: 2 } }, "Invalid value"],
  ])("rejects %s", async (_name, module, message) => {
    await expect(
      loadModelConfigs(discovery({ "/workspace/config/test@model.ts": module }, ["test@model.ts"])),
    ).rejects.toThrow(message);
  });

  it("rejects duplicate decoded model names", async () => {
    await expect(
      loadModelConfigs(
        discovery(
          {
            "/workspace/config/test@model.ts": { rules: {}, values: {} },
            "/workspace/config/test/model.ts": { rules: {}, values: {} },
          },
          ["test@model.ts", "test/model.ts"],
        ),
      ),
    ).rejects.toThrow("Duplicate model configuration: test/model");
  });
});
