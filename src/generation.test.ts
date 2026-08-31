import { describe, expect, it } from "vitest";

import type { ModelConfig } from "./config";

import { runGeneration, type GenerationDependencies } from "./generation";

describe("runGeneration", () => {
  const config: ModelConfig = {
    model: "openai/gpt-image-2",
    rules: { n: [1] },
    values: { n: 1 },
  };

  function dependenciesFor(
    overrides: Partial<GenerationDependencies> = {},
  ): GenerationDependencies {
    return {
      loadModelConfigs: async () => [config],
      configuredModel: () => config.model,
      selectModel: async () => config.model,
      configuredPromptFilePath: () => undefined,
      readPromptFile: async () => "file prompt",
      inputPrompt: async () => "interactive prompt",
      readApiKey: async () => "test-key",
      generateImages: async () => ["base64-image"],
      saveImages: async () => ["/tmp/image.png"],
      ...overrides,
    };
  }

  it("passes the selected Model and Generated images through the flow", async () => {
    const saved: unknown[] = [];
    const dependencies = dependenciesFor({
      inputPrompt: async () => "a lighthouse",
      readApiKey: async () => "test-key",
      generateImages: async (apiKey, request) => {
        expect(apiKey).toBe("test-key");
        expect(request).toEqual({
          model: config.model,
          prompt: "a lighthouse",
          options: config.values,
        });
        return ["base64-image"];
      },
      saveImages: async (...args) => {
        saved.push(...args);
        return ["/tmp/image.png"];
      },
    });

    await expect(runGeneration(dependencies)).resolves.toEqual(["/tmp/image.png"]);
    expect(saved).toEqual([["base64-image"], "jpeg", config.model]);
  });

  it("uses the interactive Model selection when no Model is configured", async () => {
    let selectedConfigs: readonly ModelConfig[] | undefined;
    const dependencies = dependenciesFor({
      configuredModel: () => undefined,
      selectModel: async (configs) => {
        selectedConfigs = configs;
        return config.model;
      },
    });

    await expect(runGeneration(dependencies)).resolves.toEqual(["/tmp/image.png"]);
    expect(selectedConfigs).toEqual([config]);
  });

  it("reads a Prompt file instead of asking for interactive input", async () => {
    let inputPromptCalled = false;
    const dependencies = dependenciesFor({
      configuredPromptFilePath: () => "./prompts/example.md",
      readPromptFile: async (path) => {
        expect(path).toBe("./prompts/example.md");
        return "file prompt";
      },
      inputPrompt: async () => {
        inputPromptCalled = true;
        return "interactive prompt";
      },
      generateImages: async (_apiKey, request) => {
        expect(request.prompt).toBe("file prompt");
        return ["base64-image"];
      },
    });

    await expect(runGeneration(dependencies)).resolves.toEqual(["/tmp/image.png"]);
    expect(inputPromptCalled).toBe(false);
  });
});
