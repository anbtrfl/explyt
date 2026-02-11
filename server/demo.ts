import { promises as fs } from "node:fs";
import path from "node:path";
import type { DemoDocumentsResponse, WorkspaceDocument } from "../shared/types";
import { isConfigurationDocumentPath } from "./domain";

export async function loadWorkspaceDocuments(rootDir: string): Promise<DemoDocumentsResponse> {
  const documents: WorkspaceDocument[] = [];
  const candidates = [path.join(rootDir, "agents"), path.join(rootDir, "skills")];

  for (const candidate of candidates) {
    const stat = await safeStat(candidate);
    if (!stat?.isDirectory()) {
      continue;
    }
    const entries = await collectMarkdownFiles(candidate);
    for (const absolutePath of entries) {
      const relativePath = path.relative(rootDir, absolutePath).replace(/\\/g, "/");
      if (!isConfigurationDocumentPath(relativePath)) {
        continue;
      }
      const text = await fs.readFile(absolutePath, "utf8");
      documents.push({ path: relativePath, text });
    }
  }

  documents.sort((left, right) => left.path.localeCompare(right.path));

  return {
    scopeId: path.basename(rootDir),
    documents,
  };
}

async function collectMarkdownFiles(directory: string): Promise<string[]> {
  const output: string[] = [];
  const entries = await fs.readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      output.push(...(await collectMarkdownFiles(absolutePath)));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".md")) {
      output.push(absolutePath);
    }
  }

  return output;
}

async function safeStat(targetPath: string) {
  try {
    return await fs.stat(targetPath);
  } catch {
    return undefined;
  }
}
