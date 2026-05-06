import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { saveExportedDocuments } from "../server/repository";
import type { ExportPackage } from "../shared/types";

let tmpRoot: string;

beforeEach(async () => {
  tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "explyt-test-"));
});

afterEach(async () => {
  await fs.rm(tmpRoot, { recursive: true, force: true });
});

describe("saveExportedDocuments", () => {
  it("writes changed documents to disk", async () => {
    const pkg: ExportPackage = {
      blocked: false,
      changedDocuments: [{ path: "agents/alpha.md", text: "hello" }],
      deletedDocuments: [],
      issues: [],
    };
    const result = await saveExportedDocuments(tmpRoot, pkg);
    expect(result).toBe(pkg);
    const written = await fs.readFile(path.join(tmpRoot, "agents/alpha.md"), "utf8");
    expect(written).toBe("hello");
  });

  it("creates intermediate directories", async () => {
    const pkg: ExportPackage = {
      blocked: false,
      changedDocuments: [{ path: "skills/deep/nested/SKILL.md", text: "x" }],
      deletedDocuments: [],
      issues: [],
    };
    await saveExportedDocuments(tmpRoot, pkg);
    const written = await fs.readFile(path.join(tmpRoot, "skills/deep/nested/SKILL.md"), "utf8");
    expect(written).toBe("x");
  });

  it("does nothing when blocked", async () => {
    const pkg: ExportPackage = {
      blocked: true,
      changedDocuments: [{ path: "agents/x.md", text: "abc" }],
      deletedDocuments: [],
      issues: [],
    };
    const result = await saveExportedDocuments(tmpRoot, pkg);
    expect(result).toBe(pkg);
    await expect(fs.access(path.join(tmpRoot, "agents/x.md"))).rejects.toBeTruthy();
  });

  it("deletes documents marked for deletion", async () => {
    const target = path.join(tmpRoot, "agents/old.md");
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, "stale");

    const pkg: ExportPackage = {
      blocked: false,
      changedDocuments: [],
      deletedDocuments: ["agents/old.md"],
      issues: [],
    };
    await saveExportedDocuments(tmpRoot, pkg);
    await expect(fs.access(target)).rejects.toBeTruthy();
  });

  it("ignores deletion of non-existent file", async () => {
    const pkg: ExportPackage = {
      blocked: false,
      changedDocuments: [],
      deletedDocuments: ["agents/missing.md"],
      issues: [],
    };
    await expect(saveExportedDocuments(tmpRoot, pkg)).resolves.toBeTruthy();
  });

  it("does not delete a document also being rewritten", async () => {
    const target = path.join(tmpRoot, "agents/keep.md");
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, "old");

    const pkg: ExportPackage = {
      blocked: false,
      changedDocuments: [{ path: "agents/keep.md", text: "new" }],
      deletedDocuments: ["agents/keep.md"],
      issues: [],
    };
    await saveExportedDocuments(tmpRoot, pkg);
    const text = await fs.readFile(target, "utf8");
    expect(text).toBe("new");
  });

  it("refuses to write outside the root", async () => {
    const pkg: ExportPackage = {
      blocked: false,
      changedDocuments: [{ path: "../escape.md", text: "x" }],
      deletedDocuments: [],
      issues: [],
    };
    await expect(saveExportedDocuments(tmpRoot, pkg)).rejects.toThrow(/outside repository root/);
  });
});
