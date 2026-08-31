# OpenRouter AI Image Generation

## Requirements

- Node.js 24+
- pnpm 11+
- An OpenRouter account with access to image-generation models

See the cheapest image generating models [here](https://openrouter.ai/models?output_modalities=image&order=pricing-low-to-high).

## Setup

Install the dependencies:

```bash
pnpm install
```

Create `.env.local` (this is git-ignored) in the project root, e.g.:

```dotenv
OPENROUTER_API_KEY="<enter API key here>"
OUTPUT_FOLDER="~/Downloads/ai-images"
MODEL="krea/krea-2-medium-turbo"
PROMPT_FILE_PATH="./prompts/krea@krea-2-medium-turbo.md"
```

`OPENROUTER_API_KEY` is your API key. You could enter it in plain text. However, a safer approach is to use a secrets manager, e.g. Using 1Password CLI `OPENROUTER_API_KEY="op://vault/item/field"` and run `op run --env-file="./.env.local" -- pnpm dev` to generate an image.

`OUTPUT_FOLDER` is required and must be writable. Generated files are saved under a model-specific subdirectory, e.g. Given an `OUTPUT_FOLDER` value of `~/Downloads`, for the `krea/krea-2-medium-turbo` model, the output folder will be `~/Downloads/krea@krea-2-medium-turbo/` (the model ID's `/` is replaced with `@`).

`MODEL` is optional. If omitted, the CLI asks you to enter an OpenRouter model ID. If provided, it must exactly match a model configuration file (more below).

`PROMPT_FILE_PATH` is optional. If omitted, the CLI asks you to enter prompt. The prompt file path is resolved from the current working directory, e.g. `./prompts/example.md`.

Ensure at least one model configuration exists under `config/` (this is git-ignored).

A model configuration is a `.ts` file with the OpenRouter model ID (the model ID's `/` is replaced with `@`), e.g. for the `krea/krea-2-medium-turbo` model, its configuration must be `krea@krea-2-medium-turbo.ts`.

The model configuration file exports `rules` and `values`, e.g. for `krea/krea-2-medium-turbo` i.e. `krea@krea-2-medium-turbo.ts`:

```typescript
import type { Rules, Values } from "../src/config";

// Source: `supported_parameters` at https://openrouter.ai/api/v1/images/models/krea/krea-2-medium-turbo/endpoints
export const rules = {
    aspectRatio: ["1:1", "4:3", "3:2", "16:9", "4:5", "2:3", "9:16"],
    n: [1],
    resolution: ["1K"],
} as const satisfies Rules;

// From the available values above, this is what will be in the request
export const values = {
    aspectRatio: "16:9",
    n: 1,
    resolution: "1K",
} as const satisfies Values<typeof rules>;
```

## Usage

Generate image:

```bash
pnpm dev
```

Note: It defaults to reading environment variables from `.env.local`. Otherwise it asks you to enter a model and a prompt. The respective model configuration file is still required (see the "Setup" section above).

Run tests:

```bash
pnpm test
```

Lint project:

```bash
pnpm lint
```
