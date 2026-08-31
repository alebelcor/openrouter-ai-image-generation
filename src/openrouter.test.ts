import { describe, expect, it } from "vitest";

import type { OpenRouterImageClient } from "./openrouter";

import { generateImages } from "./openrouter";

function clientReturning(
  result: unknown,
  capture: (request: unknown) => void,
): OpenRouterImageClient {
  return {
    images: {
      generate: async (request) => {
        capture(request);
        return result;
      },
    },
  };
}

describe("generateImages", () => {
  it("maps the model request and returns base64 images", async () => {
    let request: unknown;
    const images = await generateImages(
      "test-key",
      { model: "openai/gpt-image-2", prompt: "a lighthouse", options: { n: 2 } },
      clientReturning({ data: [{ b64Json: "one" }, { b64Json: "two" }] }, (value) => {
        request = value;
      }),
    );

    expect(request).toEqual({
      imageGenerationRequest: {
        model: "openai/gpt-image-2",
        prompt: "a lighthouse",
        n: 2,
      },
    });
    expect(images).toEqual(["one", "two"]);
  });

  it.each([
    undefined,
    { data: [] },
    { data: [{ b64Json: "" }] },
    { data: [{ b64Json: "valid" }, {}] },
  ])("rejects a response without base64 image data: %j", async (result) => {
    await expect(
      generateImages(
        "test-key",
        { model: "model", prompt: "prompt", options: {} },
        clientReturning(result, () => {}),
      ),
    ).rejects.toThrow("OpenRouter response did not contain base64 image data");
  });
});
