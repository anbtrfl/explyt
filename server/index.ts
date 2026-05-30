import express from "express";
import path from "node:path";
import { promises as fs } from "node:fs";
import { fileURLToPath } from "node:url";
import type {
  CreateNodePayload,
  CreateRelationPayload,
  OpenSessionRequest,
  UpdateNodePayload,
  UpdatePositionPayload,
} from "../shared/types";
import { SessionManager } from "./domain";
import { loadWorkspaceDocuments } from "./demo";
import { saveExportedDocuments } from "./repository";

const ALLOWED_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

function rejectRemoteHost(request: express.Request, response: express.Response): boolean {
  const host = (request.headers.host ?? "").split(":")[0];
  if (!ALLOWED_HOSTS.has(host)) {
    response.status(403).json({ message: "This endpoint is available only from localhost." });
    return true;
  }
  return false;
}

const app = express();
const port = Number(process.env.PORT ?? 3001);
const sessionManager = new SessionManager();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const workspaceRoot = process.env.WORKSPACE_ROOT ? path.resolve(process.env.WORKSPACE_ROOT) : repoRoot;
const distDir = path.join(repoRoot, "dist");
// sessionId → absolute path of the workspace this session was opened from
const sessionRootMap = new Map<string, string>();

app.use(express.json({ limit: "5mb" }));

app.get("/api/health", (_request, response) => {
  response.json({ ok: true });
});

app.get("/api/demo/documents", async (_request, response, next) => {
  try {
    response.json(await loadWorkspaceDocuments(workspaceRoot));
  } catch (error) {
    next(error);
  }
});

app.post("/api/sessions/open", (request, response, next) => {
  try {
    const snapshot = sessionManager.openSession(request.body as OpenSessionRequest);
    response.json(snapshot);
  } catch (error) {
    next(error);
  }
});

app.post("/api/sessions/open-from-path", async (request, response, next) => {
  if (rejectRemoteHost(request, response)) return;
  try {
    const body = request.body as { rootPath?: unknown };
    if (typeof body?.rootPath !== "string" || body.rootPath.trim() === "") {
      response.status(400).json({ message: "rootPath must be a non-empty string" });
      return;
    }
    const trimmed = body.rootPath.trim();
    if (!path.isAbsolute(trimmed)) {
      response.status(400).json({ message: "rootPath must be an absolute path." });
      return;
    }
    const absoluteRoot = path.resolve(trimmed);
    let stat;
    try {
      stat = await fs.stat(absoluteRoot);
    } catch {
      response.status(404).json({ message: `Path does not exist: ${absoluteRoot}` });
      return;
    }
    if (!stat.isDirectory()) {
      response.status(400).json({ message: `Path is not a directory: ${absoluteRoot}` });
      return;
    }
    const payload = await loadWorkspaceDocuments(absoluteRoot);
    if (payload.documents.length === 0) {
      response.status(400).json({
        message: `No agent or skill markdown files found under ${absoluteRoot}. Expected agents/ and/or skills/ subfolders with .md files inside.`,
      });
      return;
    }
    const snapshot = sessionManager.openSession(payload);
    sessionRootMap.set(snapshot.sessionId, absoluteRoot);
    response.json(snapshot);
  } catch (error) {
    next(error);
  }
});

app.get("/api/sessions/:sessionId", (request, response, next) => {
  try {
    const snapshot = sessionManager.getSnapshot(request.params.sessionId);
    if (!snapshot) {
      response.status(404).json({ message: "Session was not found" });
      return;
    }
    response.json(snapshot);
  } catch (error) {
    next(error);
  }
});

app.post("/api/sessions/:sessionId/validate", (request, response, next) => {
  try {
    response.json(sessionManager.validate(request.params.sessionId));
  } catch (error) {
    next(error);
  }
});

app.post("/api/sessions/:sessionId/export", (request, response, next) => {
  try {
    response.json(sessionManager.export(request.params.sessionId));
  } catch (error) {
    next(error);
  }
});

app.post("/api/sessions/:sessionId/save", async (request, response, next) => {
  try {
    const sessionId = request.params.sessionId;
    const mappedRoot = sessionRootMap.get(sessionId);
    const customWorkspaceRoot = process.env.WORKSPACE_ROOT !== undefined;
    // A payload-only session (no backing folder, and the server was not started with an
    // explicit WORKSPACE_ROOT) has nowhere safe to write — refuse instead of silently
    // dumping edits into the repository the dev server lives in.
    if (!mappedRoot && !customWorkspaceRoot) {
      response.status(400).json({
        message:
          "Save is unavailable for payload-only sessions. Open the project via Workspace path in Advanced (or start the server with WORKSPACE_ROOT) to enable Save. Use Download changes to keep the edits.",
      });
      return;
    }
    const exportPackage = sessionManager.export(sessionId);
    const targetRoot = mappedRoot ?? workspaceRoot;
    response.json(await saveExportedDocuments(targetRoot, exportPackage));
  } catch (error) {
    next(error);
  }
});

app.post("/api/sessions/:sessionId/nodes", (request, response, next) => {
  try {
    response.json(sessionManager.createNode(request.params.sessionId, request.body as CreateNodePayload));
  } catch (error) {
    next(error);
  }
});

app.put("/api/sessions/:sessionId/nodes/:nodeId", (request, response, next) => {
  try {
    response.json(
      sessionManager.updateNode(request.params.sessionId, request.params.nodeId, request.body as UpdateNodePayload),
    );
  } catch (error) {
    next(error);
  }
});

app.put("/api/sessions/:sessionId/nodes/:nodeId/position", (request, response, next) => {
  try {
    response.json(
      sessionManager.updateNodePosition(
        request.params.sessionId,
        request.params.nodeId,
        request.body as UpdatePositionPayload,
      ),
    );
  } catch (error) {
    next(error);
  }
});

app.delete("/api/sessions/:sessionId/nodes/:nodeId", (request, response, next) => {
  try {
    response.json(sessionManager.deleteNode(request.params.sessionId, request.params.nodeId));
  } catch (error) {
    next(error);
  }
});

app.post("/api/sessions/:sessionId/relations", (request, response, next) => {
  try {
    response.json(sessionManager.createRelation(request.params.sessionId, request.body as CreateRelationPayload));
  } catch (error) {
    next(error);
  }
});

app.delete("/api/sessions/:sessionId/relations/:relationId", (request, response, next) => {
  try {
    response.json(sessionManager.deleteRelation(request.params.sessionId, request.params.relationId));
  } catch (error) {
    next(error);
  }
});

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  const message = error instanceof Error ? error.message : "Unexpected server error";
  response.status(400).json({ message });
});

app.use(express.static(distDir));

app.get(/^(?!\/api\/).*/, (request, response) => {
  if (request.path.startsWith("/api/")) {
    response.status(404).json({ message: "API route was not found" });
    return;
  }
  response.sendFile(path.join(distDir, "index.html"));
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
  if (workspaceRoot !== repoRoot) {
    console.log(`Workspace root: ${workspaceRoot}`);
  }
});
