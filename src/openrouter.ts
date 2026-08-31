import type { CreateImagesRequest } from "@openrouter/sdk/models/operations";

import { OpenRouter } from "@openrouter/sdk";

import type { Values } from "./config";

export type OpenRouterImageClient = {
  images: {
    generate(request: CreateImagesRequest): Promise<unknown>;
  };
};

export async function generateImages(
  apiKey: string,
  request: {
    model: string;
    prompt: string;
    options: Values;
  },
  client: OpenRouterImageClient = new OpenRouter({ apiKey }),
): Promise<string[]> {
  const result = await client.images.generate({
    imageGenerationRequest: {
      model: request.model,
      prompt: request.prompt,
      ...request.options,
    },
  });

  const data = (result as { data?: Array<{ b64Json?: string }> } | undefined)?.data;

  if (!data?.length || data.some((item) => !item.b64Json)) {
    throw new Error("OpenRouter response did not contain base64 image data");
  }

  return data.map((item) => item.b64Json as string);
}
