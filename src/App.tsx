import { useEffect, useState } from "react";
import { api } from "./api";
import type {
  AgentSpec,
  DemoDocumentsResponse,
  ExportPackage,
  OpenSessionRequest,
  SessionSnapshot,
  SkillSpec,
  ValidationIssue,
} from "../shared/types";

type EditableNode = AgentSpec | SkillSpec;

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
  const [payloadText, setPayloadText] = useState(EMPTY_OPEN_PAYLOAD);
  const [validationResult, setValidationResult] = useState<ExportPackage | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>("Load the workspace package or open a payload.");
  const [busyLabel, setBusyLabel] = useState<string | null>(null);

  const selectedNode = findSelectedNode(session, selectedNodeId);
  const issues = session?.packageData.issues ?? [];
  const issueSummary = summarizeIssues(issues);

  useEffect(() => {
    void loadWorkspaceSample();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    setSession(snapshot);
    setValidationResult(null);
    setSelectedNodeId(snapshot.graph.nodes[0]?.id ?? null);
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
    setSession(snapshot);
    setValidationResult(null);
    setSelectedNodeId(snapshot.graph.nodes[0]?.id ?? null);
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
    const issueCount = result.issues.length;
    setStatusMessage(
      result.blocked
        ? `Validation found ${issueCount} issue${issueCount === 1 ? "" : "s"} and export is currently blocked.`
        : issueCount === 0
          ? "Validation passed with no issues."
          : `Validation completed with ${issueCount} issue${issueCount === 1 ? "" : "s"}.`,
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <h1>Agent Config Visualizer</h1>
          <p className="topbar__text">
            Markdown + YAML frontmatter import, validation, and export preview.
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
            <button className="button" disabled={!session} onClick={() => void runValidation()}>
              Validate
            </button>
            <button className="button button--ghost" onClick={() => void openPayload()}>
              Open payload
            </button>
          </div>

          <textarea
            className="payload-editor"
            value={payloadText}
            onChange={(event) => setPayloadText(event.target.value)}
            spellCheck={false}
            aria-label="JSON workspace description"
          />
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

          {selectedNode ? (
            <section className="section-card">
              <h2>Selected</h2>
              <div className="meta-block">
                <div className="meta-block__label">Name</div>
                <div className="meta-block__value">{selectedNode.name}</div>
              </div>
              <div className="meta-block">
                <div className="meta-block__label">Document</div>
                <div className="meta-block__value">{selectedNode.documentPath}</div>
              </div>
            </section>
          ) : null}
        </aside>
      </main>
    </div>
  );
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
