# OpenRouter AI Image Generation

## Requirements

- Node.js 24+
- pnpm 11+
- An OpenRouter account with access to image-generation models

See all OpenRouter image generating models [here](https://openrouter.ai/models?output_modalities=image).

## Setup

Install the dependencies:

```bash
pnpm install
```

### `.env.local`

Create `.env.local` in the project root.

```dotenv
OPENROUTER_API_KEY="<OpenRouter API key>"
OUTPUT_FOLDER="~/Downloads/ai-images"
MODEL="krea/krea-2-medium-turbo"
PROMPT_FILE_PATH="./prompts/krea@krea-2-medium-turbo.md"
```

#### `OPENROUTER_API_KEY`

This is your API key. You could enter it in plain text.

```dotenv
OPENROUTER_API_KEY="abc123"
```

A safer approach is to use a secrets manager, like the [1Password CLI](https://www.1password.dev/cli).

```dotenv
OPENROUTER_API_KEY="op://vault/item/field"
```

Then run `op run --env-file="./.env.local" -- pnpm dev` to generate an image.

#### `OUTPUT_FOLDER`

This is required and must be writable.

Generated files are saved under a model-specific subdirectory.

For example, if you're using the `krea/krea-2-medium-turbo` model and set `OUTPUT_FOLDER` like this:

```dotenv
OUTPUT_FOLDER="~/Downloads"
```

The final output folder of the generated images will be `~/Downloads/krea@krea-2-medium-turbo/`.

Note: The `/` (forward slash) in the model ID's is replaced with `@`.

#### `MODEL`

Set `MODEL` to a model's ID to pre-select it for the generation.

```dotenv
MODEL=krea/krea-2-medium-turbo
```

If a `MODEL` is not set, the CLI will instead ask you to select a model from a list.

This list is computed from the model configurations in the `config/` folder. See the "Model configuration" section below.

#### `PROMPT_FILE_PATH`

To feed a prompt from a text file you can set the `PROMPT_FILE_PATH`.

```dotenv
PROMPT_FILE_PATH="./prompts/example.md"
```

If a `PROMPT_FILE_PATH` is not set, the CLI will instead ask you to enter a prompt manually.

### Model configuration

A model configuration is a `.ts` file with the OpenRouter model ID as its name, except the `/` (forward slash) in the model ID's has to be replaced with a `@`.

For example, for the `krea/krea-2-medium-turbo` model, its configuration file must be `config/krea@krea-2-medium-turbo.ts`.

The configuration exports `rules` and `values`.

```typescript
import type { Rules, Values } from "../src/config";

// Set parameter rules/validation
// See `supported_parameters` at https://openrouter.ai/api/v1/images/models/krea/krea-2-medium-turbo/endpoints
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

Ensure at least one model configuration exists under `config/`.

See some model configurations [here](https://gist.github.com/alebelcor/e88de4d42a09769081476ab93b09cb11).

## Usage

Generate image:

```bash
pnpm dev
```

Note: It defaults to reading environment variables from `.env.local`. Otherwise it asks you to enter a model and a prompt. The model configuration is required (see the "Setup" section above).

Run tests:

```bash
pnpm test
```

Lint project:

```bash
pnpm lint
```
