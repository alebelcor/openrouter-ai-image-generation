import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

export type OutputFileSystem = {
  mkdir(path: string, options: { recursive: true }): Promise<string | undefined>;
  writeFile(path: string, data: Buffer, options: { flag: "wx" }): Promise<void>;
};

const defaultFileSystem: OutputFileSystem = {
  mkdir: (path, options) => mkdir(path, options),
  writeFile: (path, data, options) => writeFile(path, data, options),
};

export function timestamp(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
}

function outputFolder(): string {
  const configuredFolder = process.env.OUTPUT_FOLDER?.trim();

  if (!configuredFolder) {
    throw new Error("OUTPUT_FOLDER is not configured");
  }

  return resolve(configuredFolder.replace(/^~/, homedir()));
}

function modelFolder(model: string): string {
  return model.replaceAll("/", "@");
}

function outputDirectory(model: string): string {
  return join(outputFolder(), modelFolder(model));
}

export function imagePath(index: number, format: string, model: string, date = new Date()) {
  const suffix = index === 0 ? "" : `-${index}`;

  return join(outputDirectory(model), `${timestamp(date)}${suffix}.${format}`);
}

export async function saveImages(
  images: string[],
  format: string,
  model: string,
  date = new Date(),
  fileSystem: OutputFileSystem = defaultFileSystem,
) {
  const directory = outputDirectory(model);

  await fileSystem.mkdir(directory, { recursive: true });

  const paths: string[] = [];

  for (const [imageIndex, image] of images.entries()) {
    let suffixIndex = imageIndex;

    while (true) {
      const path = imagePath(suffixIndex, format, model, date);

      try {
        await fileSystem.writeFile(path, Buffer.from(image, "base64"), { flag: "wx" });
        paths.push(path);
        break;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
          throw error;
        }
        suffixIndex += 1;
      }
    }
  }

  return paths;
}
