#!/usr/bin/env node

import { input, select } from "@inquirer/prompts";
import { pathToFileURL } from "node:url";

import type { GenerationDependencies } from "./generation";

import { configuredModel, configuredPromptFilePath, loadModelConfigs } from "./config";
import { saveImages } from "./files";
import { runGeneration } from "./generation";
import { generateImages } from "./openrouter";
import { readPromptFile } from "./prompts";

async function readApiKey() {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();

  if (!apiKey) {
    throw new Error(`OPENROUTER_API_KEY is not configured`);
  }

  return apiKey;
}

export async function main() {
  const dependencies: GenerationDependencies = {
    loadModelConfigs,

    configuredModel,

    selectModel: (configs) =>
      select({
        message: "Select a model",
        choices: configs.map(({ model }) => ({ name: model, value: model })),
      }),

    configuredPromptFilePath,

    readPromptFile,

    inputPrompt: async () =>
      (
        await input({
          message: "Enter your prompt",
          validate: (value) => (value.trim() ? true : "Prompt cannot be empty"),
        })
      ).trim(),

    readApiKey,

    generateImages,

    saveImages,
  };

  for (const path of await runGeneration(dependencies)) {
    console.log(`Saved ${path}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Image generation failed");
    process.exitCode = 1;
  });
}
