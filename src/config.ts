import type {
  ImageGenerationRequest,
  ImageGenerationRequestAspectRatio,
  ImageGenerationRequestBackground,
  ImageGenerationRequestOutputFormat,
  ImageGenerationRequestQuality,
  ImageGenerationRequestResolution,
} from "@openrouter/sdk/models";

import { readdir } from "node:fs/promises";
import { join } from "node:path";

export type Model = string;
type Count = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

type RuleValues = {
  [K in keyof Omit<ImageGenerationRequest, "model" | "prompt">]?: readonly NonNullable<
    ImageGenerationRequest[K]
  >[];
} & {
  n?: readonly Count[];
};

export type Rules = RuleValues;

export type Values<R extends Rules = Rules> = {
  [K in keyof R]?: NonNullable<R[K]> extends readonly (infer Value)[] ? Value : never;
};

export type ModelConfig = {
  model: Model;
  rules: Rules;
  values: Values;
};

type ConfigModule = {
  rules: Rules;
  values: Values<Rules>;
};

const configDirectory = join(process.cwd(), "config");
const optionKeys = new Set<keyof Omit<ImageGenerationRequest, "model" | "prompt">>([
  "aspectRatio",
  "background",
  "inputReferences",
  "n",
  "outputCompression",
  "outputFormat",
  "provider",
  "quality",
  "resolution",
  "seed",
  "size",
  "stream",
]);

export type ConfigDiscovery = {
  readDirectory(directory: string): Promise<readonly string[]>;
  importModule(path: string): Promise<unknown>;
};

const defaultDiscovery: ConfigDiscovery = {
  readDirectory: async (directory) => readdir(directory),
  importModule: async (path) => import(path),
};

function modelFromFileName(fileName: string): Model {
  return fileName.slice(0, -3).replace("@", "/");
}

function validateConfigModule(model: Model, module: unknown): asserts module is ConfigModule {
  if (typeof module !== "object" || module === null || Array.isArray(module)) {
    throw new Error(`Invalid model configuration for ${model}: rules and values must be objects`);
  }

  const exports = module as { rules?: unknown; values?: unknown };

  if (
    typeof exports.rules !== "object" ||
    exports.rules === null ||
    Array.isArray(exports.rules) ||
    typeof exports.values !== "object" ||
    exports.values === null ||
    Array.isArray(exports.values)
  ) {
    throw new Error(`Invalid model configuration for ${model}: rules and values must be objects`);
  }

  const rules = exports.rules as Rules;
  const values = exports.values as Values<Rules>;

  for (const [key, allowed] of Object.entries(rules)) {
    if (!optionKeys.has(key as keyof Omit<ImageGenerationRequest, "model" | "prompt">)) {
      throw new Error(`Unknown option for ${model}: ${key}`);
    }

    if (!Array.isArray(allowed)) {
      throw new Error(`Invalid model configuration for ${model}: rule ${key} must be an array`);
    }
  }

  for (const key of Object.keys(values)) {
    if (!optionKeys.has(key as keyof Omit<ImageGenerationRequest, "model" | "prompt">)) {
      throw new Error(`Unknown option for ${model}: ${key}`);
    }
  }
}

function validateValues(model: Model, rules: Rules, values: Values<Rules>): void {
  for (const [key, value] of Object.entries(values)) {
    const allowed = rules[key as keyof Rules];

    if (!allowed) {
      throw new Error(`Missing rule for ${model}: ${key}`);
    }

    if (!allowed.includes(value as never)) {
      throw new Error(`Invalid value for ${model}: ${key}=${String(value)}`);
    }
  }
}

export async function loadModelConfigs(
  discovery: ConfigDiscovery = defaultDiscovery,
): Promise<readonly ModelConfig[]> {
  let fileNames: string[];

  try {
    fileNames = (await discovery.readDirectory(configDirectory)).filter((fileName) =>
      fileName.endsWith(".ts"),
    );
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error("No model configuration found. Add a .ts file under config/");
    }
    throw error;
  }

  const configs = await Promise.all(
    fileNames.sort().map(async (fileName): Promise<ModelConfig> => {
      const model = modelFromFileName(fileName);
      const module = await discovery.importModule(`${configDirectory}/${fileName}`);

      validateConfigModule(model, module);
      validateValues(model, module.rules, module.values);

      return { model, rules: module.rules, values: module.values };
    }),
  );

  if (!configs.length) {
    throw new Error("No model configuration found. Add a .ts file under config/");
  }

  const models = new Set<Model>();
  for (const { model } of configs) {
    if (models.has(model)) {
      throw new Error(`Duplicate model configuration: ${model}`);
    }
    models.add(model);
  }

  return configs;
}

export function configuredModel(models: readonly Model[]): Model | undefined {
  const value = process.env.MODEL?.trim();

  if (!value) {
    return undefined;
  }

  if (!models.includes(value)) {
    throw new Error(`MODEL is not configured: ${value}`);
  }

  return value;
}

export function configuredPromptFilePath(): string | undefined {
  const value = process.env.PROMPT_FILE_PATH?.trim();

  return value || undefined;
}

export type {
  ImageGenerationRequestAspectRatio,
  ImageGenerationRequestBackground,
  ImageGenerationRequestOutputFormat,
  ImageGenerationRequestQuality,
  ImageGenerationRequestResolution,
};
