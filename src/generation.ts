import type { Model, ModelConfig } from "./config";
import type { saveImages } from "./files";
import type { generateImages } from "./openrouter";
import type { readPromptFile } from "./prompts";

export type GenerationDependencies = {
  loadModelConfigs(): Promise<readonly ModelConfig[]>;
  configuredModel(models: readonly Model[]): Model | undefined;
  selectModel(configs: readonly ModelConfig[]): Promise<Model>;
  configuredPromptFilePath(): string | undefined;
  readPromptFile(path: string): ReturnType<typeof readPromptFile>;
  inputPrompt(): Promise<string>;
  readApiKey(): Promise<string>;
  generateImages: typeof generateImages;
  saveImages: typeof saveImages;
};

export async function runGeneration(dependencies: GenerationDependencies): Promise<string[]> {
  const configs = await dependencies.loadModelConfigs();

  const selectedModel = dependencies.configuredModel(configs.map(({ model }) => model));

  let selectedConfig = configs.find(({ model }) => model === selectedModel);

  if (!selectedConfig) {
    const interactiveModel = await dependencies.selectModel(configs);
    selectedConfig = configs.find(({ model }) => model === interactiveModel);
  }

  if (!selectedConfig) {
    throw new Error("Selected model configuration was not found");
  }

  const model = selectedConfig.model;
  const options = selectedConfig.values;
  const promptFile = dependencies.configuredPromptFilePath();
  const prompt = promptFile
    ? await dependencies.readPromptFile(promptFile)
    : await dependencies.inputPrompt();
  const apiKey = await dependencies.readApiKey();
  const images = await dependencies.generateImages(apiKey, { model, prompt, options });

  return dependencies.saveImages(images, options.outputFormat ?? "jpeg", model);
}
