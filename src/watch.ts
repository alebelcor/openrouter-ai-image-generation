import { spawn, type ChildProcess } from "node:child_process";
import { watch } from "node:fs";
import { stat } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export function parseDirectory(args: string[]): string {
  const directoryIndex = args.indexOf("--directory");
  const directoryArgument = directoryIndex >= 0 ? args[directoryIndex + 1] : undefined;

  if (directoryIndex < 0 || !directoryArgument || directoryArgument.startsWith("--")) {
    throw new Error("Usage: pnpm watch --directory <path>");
  }

  if (args.some((argument, index) => argument.startsWith("--") && index !== directoryIndex)) {
    throw new Error("Usage: pnpm watch --directory <path>");
  }

  return resolve(directoryArgument);
}

export function isMarkdownFilename(filename: string | Buffer | null): boolean {
  return filename?.toString().endsWith(".md") ?? false;
}

async function main() {
  const directory = parseDirectory(process.argv.slice(2));
  const directoryStats = await stat(directory);

  if (!directoryStats.isDirectory()) {
    throw new Error(`Not a directory: ${directory}`);
  }

  const processes = new Set<ChildProcess>();
  const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const watcher = watch(directory, (_eventType, filename) => {
    if (!isMarkdownFilename(filename)) {
      return;
    }

    const child = spawn(pnpm, ["dev"], {
      cwd: process.cwd(),
      env: process.env,
      stdio: "inherit",
    });

    processes.add(child);
    child.once("close", () => processes.delete(child));
    child.once("error", (error) => {
      console.error(`Failed to start pnpm dev: ${error.message}`);
    });
  });

  const close = () => {
    watcher.close();
    for (const child of processes) {
      child.kill();
    }
  };

  process.once("SIGINT", close);
  process.once("SIGTERM", close);
  console.log(`Watching ${directory} for .md changes`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Failed to start watcher");
    process.exitCode = 1;
  });
}
