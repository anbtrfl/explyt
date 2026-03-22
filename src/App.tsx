import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  type Edge,
  type Node,
  type ReactFlowInstance,
} from "@xyflow/react";
import { useEffect, useRef, useState } from "react";
import { api } from "./api";
import { ConfigNode } from "./components/ConfigNode";
import type {
  AgentSpec,
  DemoDocumentsResponse,
  ExportPackage,
  GraphEdge,
  OpenSessionRequest,
  SessionSnapshot,
  SkillSpec,
  ValidationIssue,
} from "../shared/types";

type EditableNode = AgentSpec | SkillSpec;

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

export function App() {
  const [session, setSession] = useState<SessionSnapshot | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [payloadText, setPayloadText] = useState(EMPTY_OPEN_PAYLOAD);
  const [validationResult, setValidationResult] = useState<ExportPackage | null>(null);
  const [exportResult, setExportResult] = useState<ExportPackage | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>("Load the workspace package or open a payload.");
  const [busyLabel, setBusyLabel] = useState<string | null>(null);
  const [fitViewToken, setFitViewToken] = useState(0);
  const reactFlowInstanceRef = useRef<ReactFlowInstance<Node, Edge> | null>(null);

  const selectedNode = findSelectedNode(session, selectedNodeId);
  const issues = session?.packageData.issues ?? [];
  const issueSummary = summarizeIssues(issues);

  useEffect(() => {
    void loadWorkspaceSample();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!session?.sessionId || !reactFlowInstanceRef.current || fitViewToken === 0) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      void reactFlowInstanceRef.current?.fitView({ duration: 0, padding: 0.2 });
    });
    return () => cancelAnimationFrame(frame);
  }, [fitViewToken, session?.sessionId]);

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
      return await action();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unexpected client error");
      return undefined;
    } finally {
      setBusyLabel(null);
    }
  }

  function applySnapshot(nextSession: SessionSnapshot): void {
    setSession(nextSession);
    setValidationResult(null);
    setExportResult(null);
    setSelectedEdgeId(null);
    setSelectedNodeId(nextSession.graph.nodes[0]?.id ?? null);
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
        : result.issues.length === 0
          ? "Validation passed with no issues."
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
        ? `Export blocked by ${result.issues.filter((i) => i.severity === "error").length} errors.`
        : `Prepared ${result.changedDocuments.length} markdown documents.`,
    );
  }

  function centerGraph(): void {
    if (!session) {
      return;
    }
    if (reactFlowInstanceRef.current) {
      void reactFlowInstanceRef.current.fitView({ duration: 180, padding: 0.2 });
    } else {
      setFitViewToken((current) => current + 1);
    }
    setStatusMessage("Graph centered.");
  }

  const handleNodeClick = (_event: unknown, node: Node) => {
    setSelectedNodeId(node.id);
    setSelectedEdgeId(null);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <h1>Agent Config Visualizer</h1>
          <p className="topbar__text">
            Markdown + YAML frontmatter import, node-based view, validation, and export preview.
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
        <section className="panel panel--canvas">
          <div className="canvas-toolbar">
            <button className="button button--ghost" onClick={() => void loadWorkspaceSample()}>
              Reload workspace
            </button>
            <button className="button button--ghost" disabled={!session} onClick={() => centerGraph()}>
              Center graph
            </button>
            <button className="button" disabled={!session} onClick={() => void runValidation()}>
              Validate
            </button>
            <button className="button" disabled={!session} onClick={() => void runExport()}>
              Export preview
            </button>
            <button className="button button--ghost" onClick={() => void openPayload()}>
              Open payload
            </button>
          </div>

          <div className="canvas-stage">
            {session ? (
              <ReactFlow
                key={flowKey}
                edges={flowEdges}
                maxZoom={MAX_ZOOM}
                minZoom={MIN_ZOOM}
                nodeTypes={nodeTypes}
                nodes={flowNodes}
                onInit={(instance) => {
                  reactFlowInstanceRef.current = instance;
                }}
                onNodeClick={handleNodeClick}
                onEdgeClick={(_event, edge) => {
                  setSelectedEdgeId(edge.id);
                  setSelectedNodeId(null);
                }}
                onPaneClick={() => {
                  setSelectedNodeId(null);
                  setSelectedEdgeId(null);
                }}
                nodeExtent={WORKSPACE_EXTENT}
                proOptions={{ hideAttribution: true }}
                translateExtent={WORKSPACE_EXTENT}
              >
                <Controls />
                <Background color="rgba(255, 255, 255, 0.08)" gap={24} variant={BackgroundVariant.Lines} />
              </ReactFlow>
            ) : (
              <div className="canvas-empty">Open a session to render the graph.</div>
            )}
          </div>

          <details className="advanced-panel">
            <summary>Advanced: paste a JSON workspace</summary>
            <textarea
              className="payload-editor"
              value={payloadText}
              onChange={(event) => setPayloadText(event.target.value)}
              spellCheck={false}
              aria-label="JSON workspace description"
            />
          </details>
        </section>

        <aside className="panel panel--right">
          <section className="section-card">
            <div className="section-card__header">
              <h2>Diagnostics</h2>
              {validationResult ? (
                <span className={`severity-badge ${validationResult.blocked ? "severity-badge--error" : ""}`}>
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
                <span className={`severity-badge ${exportResult.blocked ? "severity-badge--error" : "severity-badge--ok"}`}>
                  {exportResult.blocked ? "blocked" : "ready"}
                </span>
              ) : null}
            </div>

            {!exportResult ? (
              <p className="empty-state">Run export preview to inspect changed markdown documents.</p>
            ) : (
              <div className="export-docs">
                {exportResult.changedDocuments.map((document) => (
                  <details className="export-doc" key={document.path} open>
                    <summary>{document.path}</summary>
                    <pre>{document.text}</pre>
                  </details>
                ))}
              </div>
            )}
          </section>

          {selectedNode ? (
            <section className="section-card">
              <h2>Selected node</h2>
              <div className="meta-block">
                <div className="meta-block__label">Name</div>
                <div className="meta-block__value">{selectedNode.name}</div>
              </div>
              <div className="meta-block">
                <div className="meta-block__label">Document path</div>
                <div className="meta-block__value">{selectedNode.documentPath}</div>
              </div>
            </section>
          ) : null}
        </aside>
      </main>
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

function buildFlowKey(session: SessionSnapshot): string {
  const nodeIds = session.graph.nodes.map((node) => node.id).join(",");
  return `${session.sessionId}:${nodeIds}`;
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
