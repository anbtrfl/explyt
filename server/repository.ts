import { promises as fs } from "node:fs";
import path from "node:path";
import type { ExportPackage } from "../shared/types";

export async function saveExportedDocuments(rootDir: string, exportPackage: ExportPackage): Promise<ExportPackage> {
  if (exportPackage.blocked) {
    return exportPackage;
  }

  const changedDocumentPaths = new Set(exportPackage.changedDocuments.map((document) => document.path));

  for (const relativePath of exportPackage.deletedDocuments) {
    if (changedDocumentPaths.has(relativePath)) {
      continue;
    }

    const targetPath = resolveInsideRoot(rootDir, relativePath);
    try {
      await fs.unlink(targetPath);
    } catch (error) {
      if (!(error instanceof Error) || "code" in error === false || error.code !== "ENOENT") {
        throw error;
      }
    }
  }

  for (const document of exportPackage.changedDocuments) {
    const targetPath = resolveInsideRoot(rootDir, document.path);
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, document.text, "utf8");
  }

  return exportPackage;
}

function resolveInsideRoot(rootDir: string, relativePath: string): string {
  const absoluteRoot = path.resolve(rootDir);
  const targetPath = path.resolve(rootDir, relativePath);
  const relativeToRoot = path.relative(absoluteRoot, targetPath);

  if (relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot)) {
    throw new Error(`Refusing to write outside repository root: ${relativePath}`);
  }

  return targetPath;
}
