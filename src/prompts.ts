import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export function normalizePrompt(prompt: string): string {
  return prompt.replace(/\s+/g, " ").trim();
}

export async function readPromptFile(filePath: string): Promise<string> {
  const prompt = normalizePrompt(await readFile(resolve(process.cwd(), filePath), "utf8"));

  if (!prompt) {
    throw new Error(`Prompt file is empty: ${filePath}`);
  }

  return prompt;
}
