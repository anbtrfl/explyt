import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  type Connection,
  type Edge,
  type Node,
  type ReactFlowInstance,
} from "@xyflow/react";
import { useEffect, useRef, useState } from "react";
import { api } from "./api";
import { ConfigNode } from "./components/ConfigNode";
import type {
  AgentSpec,
  CreateNodePayload,
  DemoDocumentsResponse,
  ExportPackage,
  GraphEdge,
  OpenSessionRequest,
  SessionSnapshot,
  SkillSpec,
  ValidationIssue,
} from "../shared/types";

type EditableNode = AgentSpec | SkillSpec;

interface NodeFormState {
  name: string;
  description: string;
  schemaVersion: string;
  toolsText: string;
}

const MIN_ZOOM = 0.4;
const MAX_ZOOM = 2;
const WORKSPACE_EXTENT: [[number, number], [number, number]] = [
  [-1200, -1200],
  [3200, 5200],
];

const nodeTypes = {
  agent: ConfigNode,
  skill: ConfigNode,
};

const EMPTY_OPEN_PAYLOAD = JSON.stringify(
  {
    scopeId: "project-or-folder-id",
    documents: [
      {
        path: "agents/example.md",
        text: "---\nname: example\nschemaVersion: v0.1\ndescription: Example\nskills:\n  - sample-skill\n---\n# Task\n",
      },
    ],
  },
  null,
  2,
);

type Theme = "dark" | "light";

export function App() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "dark";
    return (window.localStorage.getItem("theme") as Theme | null) ?? "dark";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("theme", theme);
  }, [theme]);

  const [session, setSession] = useState<SessionSnapshot | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [formState, setFormState] = useState<NodeFormState | null>(null);
  const [payloadText, setPayloadText] = useState(EMPTY_OPEN_PAYLOAD);
  const [validationResult, setValidationResult] = useState<ExportPackage | null>(null);
  const [exportResult, setExportResult] = useState<ExportPackage | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>("Load the workspace package or open a payload.");
  const [busyLabel, setBusyLabel] = useState<string | null>(null);
  const [fitViewToken, setFitViewToken] = useState(0);
  const [reactFlowReadyToken, setReactFlowReadyToken] = useState(0);
  const reactFlowInstanceRef = useRef<ReactFlowInstance<Node, Edge> | null>(null);

  const selectedNode = findSelectedNode(session, selectedNodeId);
  const selectedEdge = findSelectedEdge(session, selectedEdgeId);
  const issues = session?.packageData.issues ?? [];
  const issueSummary = summarizeIssues(issues);

  useEffect(() => {
    void loadWorkspaceSample();
  }, []);

  useEffect(() => {
    if (!selectedNode) {
      setFormState(null);
      return;
    }
    setFormState({
      name: selectedNode.name,
      description: selectedNode.description,
      schemaVersion: "schemaVersion" in selectedNode ? selectedNode.schemaVersion : "",
      toolsText: "tools" in selectedNode ? selectedNode.tools.join("\n") : "",
    });
  }, [selectedNode]);

  useEffect(() => {
    if (!selectedEdgeId || !session?.graph.edges.some((edge) => edge.id === selectedEdgeId)) {
      setSelectedEdgeId(null);
    }
  }, [selectedEdgeId, session]);

  useEffect(() => {
    if (!session?.sessionId || !reactFlowInstanceRef.current || fitViewToken === 0) {
      return;
    }

    let outerFrame = 0;
    let innerFrame = 0;

    outerFrame = requestAnimationFrame(() => {
      innerFrame = requestAnimationFrame(() => {
        void reactFlowInstanceRef.current?.fitView({
          duration: 0,
          padding: 0.2,
        });
      });
    });

    return () => {
      cancelAnimationFrame(outerFrame);
      cancelAnimationFrame(innerFrame);
    };
  }, [fitViewToken, reactFlowReadyToken, session?.sessionId]);

  const flowNodes: Node[] = session
    ? session.graph.nodes.map((node) => ({
        id: node.id,
        type: node.type,
        position: node.position,
        data: node.data,
        draggable: true,
        selected: node.id === selectedNodeId,
      }))
    : [];

  const flowEdges: Edge[] = session
    ? session.graph.edges.map((edge) => buildFlowEdge(edge, edge.id === selectedEdgeId))
    : [];
  const flowKey = session ? buildFlowKey(session) : "empty";

  async function withBusy<T>(label: string, action: () => Promise<T>): Promise<T | undefined> {
    setBusyLabel(label);
    try {
      const result = await action();
      return result;
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unexpected client error");
      return undefined;
    } finally {
      setBusyLabel(null);
    }
  }

  function applySnapshot(nextSession: SessionSnapshot, preferredNodeId?: string | null): void {
    setSession(nextSession);
    setValidationResult(null);
    setExportResult(null);
    setSelectedEdgeId(null);
    const nextSelectedId =
      preferredNodeId && hasNode(nextSession, preferredNodeId)
        ? preferredNodeId
        : selectedNodeId && hasNode(nextSession, selectedNodeId)
          ? selectedNodeId
          : nextSession.graph.nodes[0]?.id ?? null;
    setSelectedNodeId(nextSelectedId);
  }

  async function loadWorkspaceSample(): Promise<void> {
    const payload = await withBusy("Loading workspace package", () => api.get<DemoDocumentsResponse>("/demo/documents"));
    if (!payload) {
      return;
    }
    setPayloadText(JSON.stringify(payload, null, 2));
    const snapshot = await withBusy("Opening session", () => api.post<SessionSnapshot>("/sessions/open", payload));
    if (!snapshot) {
      return;
    }
    applySnapshot(snapshot);
    setFitViewToken((current) => current + 1);
    setStatusMessage(
      `Opened ${snapshot.packageData.documents.length} documents: ${snapshot.packageData.agents.length} agents, ${snapshot.packageData.skills.length} skills.`,
    );
  }

  async function openPayload(): Promise<void> {
    let parsed: OpenSessionRequest;
    try {
      parsed = JSON.parse(payloadText) as OpenSessionRequest;
    } catch {
      setStatusMessage("Payload JSON is invalid.");
      return;
    }
    const snapshot = await withBusy("Opening payload", () => api.post<SessionSnapshot>("/sessions/open", parsed));
    if (!snapshot) {
      return;
    }
    applySnapshot(snapshot);
    setFitViewToken((current) => current + 1);
    setStatusMessage(`Opened payload for scope ${snapshot.scopeId}.`);
  }

  async function runValidation(): Promise<void> {
    if (!session) {
      return;
    }
    const result = await withBusy("Running validation", () =>
      api.post<ExportPackage>(`/sessions/${session.sessionId}/validate`, {}),
    );
    if (!result) {
      return;
    }
    setValidationResult(result);
    setStatusMessage(
      result.blocked
        ? `Validation found ${result.issues.length} issues and export is currently blocked.`
        : `Validation completed with ${result.issues.length} issues.`,
    );
  }

  async function runExport(): Promise<void> {
    if (!session) {
      return;
    }
    const result = await withBusy("Exporting documents", () =>
      api.post<ExportPackage>(`/sessions/${session.sessionId}/export`, {}),
    );
    if (!result) {
      return;
    }
    setExportResult(result);
    setStatusMessage(
      result.blocked
        ? `Export blocked by ${result.issues.filter((issue) => issue.severity === "error").length} errors.`
        : describeExportResult(result, "Prepared"),
    );
  }

  async function saveToRepository(): Promise<void> {
    if (!session) {
      return;
    }
    const result = await withBusy("Saving documents to repository", () =>
      api.post<ExportPackage>(`/sessions/${session.sessionId}/save`, {}),
    );
    if (!result) {
      return;
    }

    if (result.blocked) {
      setStatusMessage(
        `Save blocked by ${result.issues.filter((issue) => issue.severity === "error").length} errors.`,
      );
      return;
    }

    await loadWorkspaceSample();
    setStatusMessage(describeExportResult(result, "Saved"));
  }

  async function addNode(kind: CreateNodePayload["kind"]): Promise<void> {
    if (!session) {
      return;
    }
    const existingNodeIds = new Set(session.graph.nodes.map((node) => node.id));
    const snapshot = await withBusy(`Adding ${kind}`, () =>
      api.post<SessionSnapshot>(`/sessions/${session.sessionId}/nodes`, { kind }),
    );
    if (!snapshot) {
      return;
    }
    const createdNode = snapshot.graph.nodes.find((node) => !existingNodeIds.has(node.id));
    applySnapshot(snapshot, createdNode?.id ?? null);
    setFitViewToken((current) => current + 1);
    setStatusMessage(`Added new ${kind} node.`);
  }

  async function applyNodeEdits(): Promise<void> {
    if (!session || !selectedNode || !formState) {
      return;
    }
    const payload =
      "schemaVersion" in selectedNode
        ? {
            name: formState.name,
            description: formState.description,
            schemaVersion: formState.schemaVersion,
            tools: splitList(formState.toolsText),
          }
        : {
            name: formState.name,
            description: formState.description,
          };

    const snapshot = await withBusy(`Updating ${selectedNode.name || selectedNode.id}`, () =>
      api.put<SessionSnapshot>(`/sessions/${session.sessionId}/nodes/${selectedNode.id}`, payload),
    );
    if (!snapshot) {
      return;
    }
    applySnapshot(snapshot, selectedNode.id);
    setStatusMessage(`Updated ${formState.name || selectedNode.id}.`);
  }

  async function onConnect(connection: Connection): Promise<void> {
    if (!session || !connection.source || !connection.target) {
      return;
    }
    const snapshot = await withBusy("Creating relation", () =>
      api.post<SessionSnapshot>(`/sessions/${session.sessionId}/relations`, {
        sourceId: connection.source,
        targetId: connection.target,
      }),
    );
    if (!snapshot) {
      return;
    }
    applySnapshot(snapshot, connection.source);
    setStatusMessage("Relation added.");
  }

  async function onDeleteEdges(edges: Edge[]): Promise<void> {
    if (!session || edges.length === 0) {
      return;
    }
    let lastSnapshot: SessionSnapshot | undefined;
    for (const edge of edges) {
      lastSnapshot = await withBusy("Removing relation", () =>
        api.delete<SessionSnapshot>(`/sessions/${session.sessionId}/relations/${edge.id}`),
      );
    }

    if (!lastSnapshot) {
      return;
    }
    applySnapshot(lastSnapshot, selectedNodeId);
    setStatusMessage(`Removed ${edges.length} relation${edges.length === 1 ? "" : "s"}.`);
  }

  async function onDeleteNodes(nodes: Node[]): Promise<void> {
    if (!session || nodes.length === 0) {
      return;
    }
    let lastSnapshot: SessionSnapshot | undefined;
    for (const node of nodes) {
      lastSnapshot = await withBusy("Removing node", () =>
        api.delete<SessionSnapshot>(`/sessions/${session.sessionId}/nodes/${node.id}`),
      );
    }

    if (!lastSnapshot) {
      return;
    }

    applySnapshot(lastSnapshot, selectedNodeId);
    setFitViewToken((current) => current + 1);
    setStatusMessage(`Removed ${nodes.length} node${nodes.length === 1 ? "" : "s"}.`);
  }

  async function deleteCurrentSelection(): Promise<void> {
    if (!session) {
      return;
    }

    if (selectedEdge) {
      await onDeleteEdges([buildFlowEdge(selectedEdge, true)]);
      return;
    }

    if (selectedNode) {
      await onDeleteNodes([
        {
          id: selectedNode.id,
          position: {
            x: selectedNode.visualMeta.x,
            y: selectedNode.visualMeta.y,
          },
          data: {},
          type: "schemaVersion" in selectedNode ? "agent" : "skill",
        } as Node,
      ]);
    }
  }

  function centerGraph(): void {
    if (!session) {
      return;
    }

    if (reactFlowInstanceRef.current) {
      void reactFlowInstanceRef.current.fitView({
        duration: 180,
        padding: 0.2,
      });
    } else {
      setFitViewToken((current) => current + 1);
    }
    setStatusMessage("Graph centered.");
  }

  async function onNodeDragStop(node: Node): Promise<void> {
    if (!session) {
      return;
    }
    const snapshot = await withBusy("Saving node position", () =>
      api.put<SessionSnapshot>(`/sessions/${session.sessionId}/nodes/${node.id}/position`, {
        x: node.position.x,
        y: node.position.y,
      }),
    );
    if (!snapshot) {
      return;
    }
    applySnapshot(snapshot, node.id);
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.key !== "Delete" && event.key !== "Backspace") || !session) {
        return;
      }

      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT")
      ) {
        return;
      }

      if (!selectedNode && !selectedEdge) {
        return;
      }

      event.preventDefault();
      void deleteCurrentSelection();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleteCurrentSelection, selectedEdge, selectedNode, session]);

  const handleNodeClick = (_event: unknown, node: Node) => {
    setSelectedNodeId(node.id);
    setSelectedEdgeId(null);
  };

  return (
    <div className="app-shell">
      <button
        type="button"
        className="theme-toggle"
        aria-label="Toggle theme"
        onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
      >
        <span>{theme === "dark" ? "Light" : "Dark"}</span>
        <span className="theme-toggle__track">
          <span className="theme-toggle__thumb" />
        </span>
      </button>

      <header className="topbar">
        <div>
          <h1>Agent Config Visualizer</h1>
          <p className="topbar__text">
            Markdown + YAML frontmatter import, node-based editing, validation,
            and export preview.
          </p>
        </div>
      </header>

      <div className="status-row">
        <div className="status-pill">{busyLabel ?? statusMessage}</div>
        <div className="status-metrics">
          <span>{session?.packageData.documents.length ?? 0} docs</span>
          <span>{session?.packageData.agents.length ?? 0} agents</span>
          <span>{session?.packageData.skills.length ?? 0} skills</span>
          <span>{session?.packageData.relations.length ?? 0} relations</span>
          <span>{issueSummary.errors} errors</span>
          <span>{issueSummary.warnings} warnings</span>
        </div>
      </div>

      <main className="workspace-grid">
        <aside className="panel panel--left">
          <section className="section-card">
            <div className="section-card__header">
              <h2>Properties</h2>
              <button
                className="button button--ghost button--small"
                disabled={!selectedNode || !formState}
                onClick={() => void applyNodeEdits()}
              >
                Apply
              </button>
            </div>
            {!selectedNode || !formState ? (
              <p className="empty-state">
                Select a node to edit its properties.
              </p>
            ) : (
              <div className="property-form">
                <label className="form-field">
                  <span>Name</span>
                  <input
                    value={formState.name}
                    onChange={(event) =>
                      setFormState(
                        (current) =>
                          current && { ...current, name: event.target.value },
                      )
                    }
                  />
                </label>

                {"schemaVersion" in selectedNode ? (
                  <label className="form-field">
                    <span>Schema version</span>
                    <input
                      value={formState.schemaVersion}
                      onChange={(event) =>
                        setFormState(
                          (current) =>
                            current && {
                              ...current,
                              schemaVersion: event.target.value,
                            },
                        )
                      }
                    />
                  </label>
                ) : null}

                <label className="form-field">
                  <span>Description</span>
                  <textarea
                    value={formState.description}
                    onChange={(event) =>
                      setFormState(
                        (current) =>
                          current && {
                            ...current,
                            description: event.target.value,
                          },
                      )
                    }
                  />
                </label>

                {"tools" in selectedNode ? (
                  <label className="form-field">
                    <span>Tools</span>
                    <textarea
                      value={formState.toolsText}
                      onChange={(event) =>
                        setFormState(
                          (current) =>
                            current && {
                              ...current,
                              toolsText: event.target.value,
                            },
                        )
                      }
                    />
                  </label>
                ) : null}

                <div className="meta-block">
                  <div className="meta-block__label">Document path</div>
                  <div className="meta-block__value">
                    {selectedNode.documentPath}
                  </div>
                </div>

                {"tools" in selectedNode ? (
                  <>
                    <div className="meta-block">
                      <div className="meta-block__label">Skills</div>
                      <div className="meta-block__value">
                        {selectedNode.referencedSkills.join(", ") || "No links"}
                      </div>
                    </div>
                    <div className="meta-block">
                      <div className="meta-block__label">Calls agents</div>
                      <div className="meta-block__value">
                        {selectedNode.referencedAgents.join(", ") || "No links"}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="meta-block">
                    <div className="meta-block__label">Used by</div>
                    <div className="meta-block__value">
                      {selectedNode.usedByAgents.join(", ") || "No links"}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </aside>

        <section className="panel panel--canvas">
          <div className="canvas-toolbar">
            <div className="canvas-toolbar__row">
              <button
                className="button button--ghost"
                onClick={() => void loadWorkspaceSample()}
              >
                Reload workspace
              </button>
              <button
                className="button button--ghost"
                disabled={!session}
                onClick={() => void addNode("agent")}
              >
                Add agent
              </button>
              <button
                className="button button--ghost"
                disabled={!session}
                onClick={() => void addNode("skill")}
              >
                Add skill
              </button>
              <button
                className="button button--ghost"
                disabled={!session}
                onClick={() => centerGraph()}
              >
                Center graph
              </button>
              <button
                className="button button--ghost"
                disabled={!session || (!selectedNode && !selectedEdge)}
                onClick={() => void deleteCurrentSelection()}
              >
                {selectedEdge ? "Delete relation" : "Delete selected"}
              </button>
            </div>

            <div className="canvas-toolbar__row canvas-toolbar__row--primary">
              <button
                className="button"
                disabled={!session}
                onClick={() => void runValidation()}
              >
                Validate
              </button>
              <button
                className="button"
                disabled={!session}
                onClick={() => void runExport()}
              >
                Export preview
              </button>
              <button
                className="button"
                disabled={!session}
                onClick={() => void saveToRepository()}
              >
                Save to repository
              </button>
            </div>
          </div>

          <div className="canvas-stage">
            {session ? (
              <ReactFlow
                key={flowKey}
                autoPanOnNodeFocus={false}
                autoPanOnConnect={false}
                autoPanOnNodeDrag={false}
                edges={flowEdges}
                maxZoom={MAX_ZOOM}
                minZoom={0.4}
                nodeTypes={nodeTypes}
                nodes={flowNodes}
                onConnect={(connection) => void onConnect(connection)}
                onEdgeClick={(_event, edge) => {
                  setSelectedEdgeId(edge.id);
                  setSelectedNodeId(null);
                }}
                onEdgesDelete={(edges) => void onDeleteEdges(edges)}
                onInit={(instance) => {
                  reactFlowInstanceRef.current = instance;
                  setReactFlowReadyToken((current) => current + 1);
                }}
                onNodeClick={handleNodeClick}
                onNodesDelete={(nodes) => void onDeleteNodes(nodes)}
                onNodeDragStop={(_event, node) => void onNodeDragStop(node)}
                onPaneClick={() => {
                  setSelectedNodeId(null);
                  setSelectedEdgeId(null);
                }}
                nodeExtent={WORKSPACE_EXTENT}
                proOptions={{ hideAttribution: true }}
                translateExtent={WORKSPACE_EXTENT}
              >
                <Controls />
                <Background
                  color="rgba(255, 255, 255, 0.08)"
                  gap={24}
                  variant={BackgroundVariant.Lines}
                />
              </ReactFlow>
            ) : (
              <div className="canvas-empty">
                Open a session to render the graph.
              </div>
            )}
          </div>
        </section>

        <aside className="panel panel--right">
          <section className="section-card">
            <div className="section-card__header">
              <h2>Diagnostics</h2>
              {validationResult ? (
                <span
                  className={`severity-badge ${validationResult.blocked ? "severity-badge--error" : ""}`}
                >
                  {validationResult.blocked ? "blocked" : "ready"}
                </span>
              ) : null}
            </div>

            {issues.length === 0 ? (
              <p className="empty-state">No current issues.</p>
            ) : (
              <div className="issue-list">
                {issues.map((issue, index) => (
                  <IssueRow
                    issue={issue}
                    key={`${issue.code}-${issue.relatedEntityId ?? issue.documentPath ?? "global"}-${index}`}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="section-card section-card--stretch">
            <div className="section-card__header">
              <h2>Export Preview</h2>
              {exportResult ? (
                <span
                  className={`severity-badge ${exportResult.blocked ? "severity-badge--error" : "severity-badge--ok"}`}
                >
                  {exportResult.blocked ? "blocked" : "ready"}
                </span>
              ) : null}
            </div>

            {!exportResult ? (
              <p className="empty-state">
                Run export preview to inspect changed markdown documents.
              </p>
            ) : exportResult.blocked ? (
              <p className="empty-state">
                Export is blocked. Fix errors in the diagnostics panel and try
                again.
              </p>
            ) : (
              <div className="export-docs">
                {exportResult.deletedDocuments.length > 0 ? (
                  <details className="export-doc" open>
                    <summary>
                      Deleted documents ({exportResult.deletedDocuments.length})
                    </summary>
                    <pre>{exportResult.deletedDocuments.join("\n")}</pre>
                  </details>
                ) : null}
                {exportResult.changedDocuments.map((document) => (
                  <details className="export-doc" key={document.path} open>
                    <summary>{document.path}</summary>
                    <pre>{document.text}</pre>
                  </details>
                ))}
              </div>
            )}
          </section>
        </aside>
      </main>

      <section className="advanced-panel">
        <details className="section-card" open={false}>
          <summary className="advanced-panel__summary">Advanced</summary>
          <div className="advanced-panel__body">
            <div className="section-card__header">
              <h2>Open Session</h2>
              <button
                className="button button--ghost button--small"
                onClick={() => void openPayload()}
              >
                Open payload
              </button>
            </div>
            <p className="section-card__hint">
              The workspace loader uses the current repo. The payload editor
              mirrors the `POST /sessions/open` contract.
            </p>
            <textarea
              className="payload-editor"
              value={payloadText}
              onChange={(event) => setPayloadText(event.target.value)}
              spellCheck={false}
            />
          </div>
        </details>
      </section>
    </div>
  );
}

function buildFlowEdge(edge: GraphEdge, isSelected = false): Edge {
  const isAgentEdge = edge.type === "CALLS_AGENT";
  const strokeWidth = edge.data.issueCount > 0 ? 2.5 : 2;
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    animated: isAgentEdge,
    selected: isSelected,
    style: {
      stroke: edge.data.issueCount > 0 ? "#f17c67" : isAgentEdge ? "#ffb454" : "#6dd3c7",
      strokeWidth: isSelected ? strokeWidth + 1 : strokeWidth,
    },
  };
}

function findSelectedNode(session: SessionSnapshot | null, nodeId: string | null): EditableNode | null {
  if (!session || !nodeId) {
    return null;
  }
  return (
    session.packageData.agents.find((agent) => agent.id === nodeId) ??
    session.packageData.skills.find((skill) => skill.id === nodeId) ??
    null
  );
}

function findSelectedEdge(session: SessionSnapshot | null, edgeId: string | null): GraphEdge | null {
  if (!session || !edgeId) {
    return null;
  }
  return session.graph.edges.find((edge) => edge.id === edgeId) ?? null;
}

function hasNode(session: SessionSnapshot, nodeId: string): boolean {
  return session.graph.nodes.some((node) => node.id === nodeId);
}

function buildFlowKey(session: SessionSnapshot): string {
  const nodeIds = session.graph.nodes.map((node) => node.id).join(",");
  return `${session.sessionId}:${nodeIds}`;
}

function splitList(text: string): string[] {
  return text
    .split(/\n|,/g)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function summarizeIssues(issues: ValidationIssue[]) {
  return issues.reduce(
    (summary, issue) => {
      if (issue.severity === "error") {
        summary.errors += 1;
      }
      if (issue.severity === "warning") {
        summary.warnings += 1;
      }
      return summary;
    },
    { errors: 0, warnings: 0 },
  );
}

function describeExportResult(result: ExportPackage, verb: "Prepared" | "Saved"): string {
  const parts: string[] = [];

  if (result.changedDocuments.length > 0) {
    parts.push(`${result.changedDocuments.length} markdown document${result.changedDocuments.length === 1 ? "" : "s"}`);
  }

  if (result.deletedDocuments.length > 0) {
    parts.push(`${result.deletedDocuments.length} deletion${result.deletedDocuments.length === 1 ? "" : "s"}`);
  }

  if (parts.length === 0) {
    parts.push("no repository changes");
  }

  return `${verb} ${parts.join(" and ")}.`;
}

function IssueRow({ issue }: { issue: ValidationIssue }) {
  return (
    <div className={`issue issue--${issue.severity}`}>
      <div className="issue__header">
        <span className={`severity-badge severity-badge--${issue.severity}`}>{issue.severity}</span>
        <code>{issue.code}</code>
      </div>
      <div className="issue__message">{issue.message}</div>
      {issue.documentPath ? <div className="issue__meta">{issue.documentPath}</div> : null}
      {issue.fieldPath ? <div className="issue__meta">{issue.fieldPath}</div> : null}
    </div>
  );
}
