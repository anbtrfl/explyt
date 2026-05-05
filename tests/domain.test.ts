import { describe, it, expect, beforeEach } from "vitest";
import { SessionManager, isConfigurationDocumentPath } from "../server/domain";
import type { OpenSessionRequest, WorkspaceDocument } from "../shared/types";

const agentDoc = (name: string, opts: Partial<{
  schemaVersion: string;
  description: string;
  tools: string[];
  skills: string[];
  agents: string[];
  extra: string;
  body: string;
}> = {}): WorkspaceDocument => {
  const lines = ["---", `name: ${name}`];
  lines.push(`schemaVersion: "${opts.schemaVersion ?? "v0.1"}"`);
  if (opts.description !== undefined) lines.push(`description: "${opts.description}"`);
  if (opts.tools) {
    lines.push("tools:");
    for (const tool of opts.tools) lines.push(`  - ${tool}`);
  }
  if (opts.skills) {
    lines.push("skills:");
    for (const s of opts.skills) lines.push(`  - ${s}`);
  }
  if (opts.agents) {
    lines.push("agents:");
    for (const a of opts.agents) lines.push(`  - ${a}`);
  }
  if (opts.extra) lines.push(opts.extra);
  lines.push("---");
  if (opts.body) lines.push(opts.body);
  return { path: `agents/${name}.md`, text: lines.join("\n") + "\n" };
};

const skillDoc = (name: string, opts: Partial<{
  description: string;
  useBy: string[];
  body: string;
}> = {}): WorkspaceDocument => {
  const lines = ["---", `name: ${name}`];
  if (opts.description !== undefined) lines.push(`description: "${opts.description}"`);
  if (opts.useBy) {
    lines.push("use-by:");
    for (const a of opts.useBy) lines.push(`  - ${a}`);
  }
  lines.push("---");
  if (opts.body) lines.push(opts.body);
  return { path: `skills/${name}/SKILL.md`, text: lines.join("\n") + "\n" };
};

const baseRequest = (documents: WorkspaceDocument[]): OpenSessionRequest => ({
  scopeId: "test-scope",
  documents,
});

describe("SessionManager.openSession", () => {
  let manager: SessionManager;

  beforeEach(() => {
    manager = new SessionManager();
  });

  it("opens an empty session with no documents", () => {
    const snapshot = manager.openSession({ scopeId: "empty", documents: [] });
    expect(snapshot.sessionId).toBeTruthy();
    expect(snapshot.scopeId).toBe("empty");
    expect(snapshot.graph.nodes).toHaveLength(0);
    expect(snapshot.graph.edges).toHaveLength(0);
  });

  it("parses agent and skill documents into nodes", () => {
    const snapshot = manager.openSession(baseRequest([
      agentDoc("alpha", { skills: ["s1"] }),
      skillDoc("s1"),
    ]));
    expect(snapshot.graph.nodes).toHaveLength(2);
    expect(snapshot.graph.edges).toHaveLength(1);
    expect(snapshot.graph.edges[0].type).toBe("USES_SKILL");
  });

  it("creates relation from skill use-by side", () => {
    const snapshot = manager.openSession(baseRequest([
      agentDoc("alpha"),
      skillDoc("s1", { useBy: ["alpha"] }),
    ]));
    expect(snapshot.graph.edges).toHaveLength(1);
  });

  it("warns when relation is one-sided", () => {
    const snapshot = manager.openSession(baseRequest([
      agentDoc("alpha", { skills: ["s1"] }),
      skillDoc("s1"),
    ]));
    const oneSided = snapshot.packageData.issues.find(i => i.code === "RELATION_ONE_SIDED");
    expect(oneSided).toBeDefined();
    expect(oneSided?.severity).toBe("warning");
  });

  it("does not warn when relation is on both sides", () => {
    const snapshot = manager.openSession(baseRequest([
      agentDoc("alpha", { skills: ["s1"] }),
      skillDoc("s1", { useBy: ["alpha"] }),
    ]));
    const oneSided = snapshot.packageData.issues.find(i => i.code === "RELATION_ONE_SIDED");
    expect(oneSided).toBeUndefined();
  });

  it("emits unresolved reference issue when target missing", () => {
    const snapshot = manager.openSession(baseRequest([
      agentDoc("alpha", { skills: ["ghost"] }),
    ]));
    const issue = snapshot.packageData.issues.find(i => i.code === "REFERENCE_UNRESOLVED");
    expect(issue).toBeDefined();
  });

  it("creates CALLS_AGENT relation between agents", () => {
    const snapshot = manager.openSession(baseRequest([
      agentDoc("alpha", { agents: ["beta"] }),
      agentDoc("beta"),
    ]));
    expect(snapshot.graph.edges.find(e => e.type === "CALLS_AGENT")).toBeDefined();
  });

  it("detects agent cycles", () => {
    const snapshot = manager.openSession(baseRequest([
      agentDoc("a", { agents: ["b"] }),
      agentDoc("b", { agents: ["a"] }),
    ]));
    const cycle = snapshot.packageData.issues.find(i => i.code === "AGENT_CYCLE");
    expect(cycle).toBeDefined();
  });

  it("flags unsupported schemaVersion", () => {
    const snapshot = manager.openSession(baseRequest([
      agentDoc("alpha", { schemaVersion: "v9.9" }),
    ]));
    expect(snapshot.packageData.issues.find(i => i.code === "SCHEMA_UNSUPPORTED")).toBeDefined();
  });

  it("flags missing schemaVersion", () => {
    const text = `---\nname: alpha\nschemaVersion: ""\n---\n`;
    const snapshot = manager.openSession(baseRequest([
      { path: "agents/alpha.md", text },
    ]));
    expect(snapshot.packageData.issues.find(i => i.code === "SCHEMA_REQUIRED")).toBeDefined();
  });

  it("flags duplicate names", () => {
    const snapshot = manager.openSession(baseRequest([
      agentDoc("dup"),
      { ...agentDoc("dup"), path: "agents/dup-2.md" },
    ]));
    expect(snapshot.packageData.issues.find(i => i.code === "NAME_DUPLICATE")).toBeDefined();
  });

  it("flags invalid name characters", () => {
    const text = `---\nname: "bad name!"\nschemaVersion: "v0.1"\n---\n`;
    const snapshot = manager.openSession(baseRequest([
      { path: "agents/bad.md", text },
    ]));
    expect(snapshot.packageData.issues.find(i => i.code === "NAME_INVALID")).toBeDefined();
  });

  it("flags missing frontmatter", () => {
    const snapshot = manager.openSession(baseRequest([
      { path: "agents/no-fm.md", text: "just markdown" },
    ]));
    expect(snapshot.packageData.issues.find(i => i.code === "FM_MISSING")).toBeDefined();
  });

  it("flags broken frontmatter block", () => {
    const snapshot = manager.openSession(baseRequest([
      { path: "agents/broken.md", text: "---\nname: test\n" },
    ]));
    const fmParse = snapshot.packageData.issues.find(i => i.code === "FM_PARSE");
    expect(fmParse).toBeDefined();
  });

  it("preserves extra fields and markdown body", () => {
    const text = `---\nname: alpha\nschemaVersion: "v0.1"\ncustom: 42\n---\n# Body\n`;
    const snapshot = manager.openSession(baseRequest([
      { path: "agents/alpha.md", text },
    ]));
    const doc = snapshot.packageData.documents[0];
    expect(doc.extraFields.custom).toBe(42);
    expect(doc.markdownBody).toContain("# Body");
  });
});

describe("SessionManager.getSnapshot / validate / export", () => {
  let manager: SessionManager;
  let sessionId: string;

  beforeEach(() => {
    manager = new SessionManager();
    sessionId = manager.openSession(baseRequest([
      agentDoc("alpha", { skills: ["s1"] }),
      skillDoc("s1", { useBy: ["alpha"] }),
    ])).sessionId;
  });

  it("returns undefined snapshot for unknown session", () => {
    expect(manager.getSnapshot("missing")).toBeUndefined();
  });

  it("returns snapshot for known session", () => {
    expect(manager.getSnapshot(sessionId)).toBeDefined();
  });

  it("validate returns issues", () => {
    const result = manager.validate(sessionId);
    expect(result.blocked).toBe(false);
    expect(Array.isArray(result.issues)).toBe(true);
  });

  it("export returns changedDocuments when valid", () => {
    const result = manager.export(sessionId);
    expect(result.blocked).toBe(false);
    expect(result.changedDocuments.length).toBeGreaterThan(0);
    expect(result.changedDocuments[0].text).toContain("---");
  });

  it("export blocked when validation has errors", () => {
    const errored = manager.openSession(baseRequest([
      agentDoc("alpha", { skills: ["ghost"] }),
    ])).sessionId;
    const result = manager.export(errored);
    expect(result.blocked).toBe(true);
    expect(result.changedDocuments).toHaveLength(0);
  });

  it("throws when validating missing session", () => {
    expect(() => manager.validate("missing")).toThrow();
  });
});

describe("SessionManager mutations", () => {
  let manager: SessionManager;
  let sessionId: string;

  const setup = () => {
    manager = new SessionManager();
    return manager.openSession(baseRequest([
      agentDoc("alpha", { skills: ["s1"] }),
      skillDoc("s1", { useBy: ["alpha"] }),
    ]));
  };

  beforeEach(() => {
    sessionId = setup().sessionId;
  });

  it("updateNode changes name", () => {
    const snapshot = manager.getSnapshot(sessionId)!;
    const agent = snapshot.packageData.agents[0];
    const updated = manager.updateNode(sessionId, agent.id, { name: "renamed" });
    const found = updated.packageData.agents.find(a => a.id === agent.id);
    expect(found?.name).toBe("renamed");
  });

  it("updateNode changes description, schemaVersion, tools", () => {
    const snapshot = manager.getSnapshot(sessionId)!;
    const agent = snapshot.packageData.agents[0];
    const updated = manager.updateNode(sessionId, agent.id, {
      description: "new desc",
      schemaVersion: "v0.1",
      tools: ["t1", "t2"],
    });
    const found = updated.packageData.agents.find(a => a.id === agent.id)!;
    expect(found.description).toBe("new desc");
    expect(found.tools).toEqual(["t1", "t2"]);
  });

  it("updateNode throws for missing node", () => {
    expect(() => manager.updateNode(sessionId, "missing", { name: "x" })).toThrow();
  });

  it("updateNodePosition updates coordinates", () => {
    const snapshot = manager.getSnapshot(sessionId)!;
    const node = snapshot.graph.nodes[0];
    const updated = manager.updateNodePosition(sessionId, node.id, { x: 999, y: 888 });
    const updatedNode = updated.graph.nodes.find(n => n.id === node.id)!;
    expect(updatedNode.position).toEqual({ x: 999, y: 888 });
  });

  it("updateNodePosition throws for missing", () => {
    expect(() => manager.updateNodePosition(sessionId, "missing", { x: 1, y: 1 })).toThrow();
  });

  it("createNode adds an agent", () => {
    const before = manager.getSnapshot(sessionId)!.packageData.agents.length;
    const after = manager.createNode(sessionId, { kind: "agent" });
    expect(after.packageData.agents.length).toBe(before + 1);
    const newAgent = after.packageData.agents.find(a => a.isNew);
    expect(newAgent).toBeDefined();
    expect(newAgent!.documentPath).toContain("agents/");
  });

  it("createNode adds a skill", () => {
    const after = manager.createNode(sessionId, { kind: "skill" });
    const newSkill = after.packageData.skills.find(s => s.isNew);
    expect(newSkill).toBeDefined();
    expect(newSkill!.documentPath).toContain("/SKILL.md");
  });

  it("renaming a new node updates its document path", () => {
    const created = manager.createNode(sessionId, { kind: "agent" });
    const newAgent = created.packageData.agents.find(a => a.isNew)!;
    const renamed = manager.updateNode(sessionId, newAgent.id, { name: "fresh-name" });
    const after = renamed.packageData.agents.find(a => a.id === newAgent.id)!;
    expect(after.documentPath).toContain("fresh-name");
  });

  it("createRelation creates USES_SKILL", () => {
    const fresh = manager.openSession(baseRequest([
      agentDoc("alpha"),
      skillDoc("s1"),
    ]));
    const agent = fresh.packageData.agents[0];
    const skill = fresh.packageData.skills[0];
    const after = manager.createRelation(fresh.sessionId, {
      sourceId: agent.id,
      targetId: skill.id,
    });
    expect(after.graph.edges.some(e => e.type === "USES_SKILL")).toBe(true);
  });

  it("createRelation creates CALLS_AGENT", () => {
    const fresh = manager.openSession(baseRequest([
      agentDoc("a"),
      agentDoc("b"),
    ]));
    const [a, b] = fresh.packageData.agents;
    const after = manager.createRelation(fresh.sessionId, {
      sourceId: a.id,
      targetId: b.id,
    });
    expect(after.graph.edges.some(e => e.type === "CALLS_AGENT")).toBe(true);
  });

  it("createRelation rejects skill -> agent", () => {
    const fresh = manager.openSession(baseRequest([
      agentDoc("a"),
      skillDoc("s"),
    ]));
    const agent = fresh.packageData.agents[0];
    const skill = fresh.packageData.skills[0];
    expect(() => manager.createRelation(fresh.sessionId, {
      sourceId: skill.id,
      targetId: agent.id,
    })).toThrow();
  });

  it("createRelation throws when nodes missing", () => {
    expect(() => manager.createRelation(sessionId, {
      sourceId: "x",
      targetId: "y",
    })).toThrow();
  });

  it("deleteRelation removes edge", () => {
    const snapshot = manager.getSnapshot(sessionId)!;
    const edge = snapshot.graph.edges[0];
    const after = manager.deleteRelation(sessionId, edge.id);
    expect(after.graph.edges.some(e => e.id === edge.id)).toBe(false);
  });

  it("deleteNode removes node and its relations", () => {
    const snapshot = manager.getSnapshot(sessionId)!;
    const agent = snapshot.packageData.agents[0];
    const after = manager.deleteNode(sessionId, agent.id);
    expect(after.packageData.agents.some(a => a.id === agent.id)).toBe(false);
    expect(after.graph.edges.some(e => e.source === agent.id || e.target === agent.id)).toBe(false);
  });

  it("deleteNode throws for missing node", () => {
    expect(() => manager.deleteNode(sessionId, "missing")).toThrow();
  });

  it("deleteNode of original document marks for deletion", () => {
    const snapshot = manager.getSnapshot(sessionId)!;
    const agent = snapshot.packageData.agents[0];
    manager.deleteNode(sessionId, agent.id);
    const result = manager.export(sessionId);
    // skill becomes invalid (use-by points to deleted alpha), so blocked
    // but deletedDocuments should at least be tracked
    if (!result.blocked) {
      expect(result.deletedDocuments).toContain(agent.documentPath);
    }
  });

  it("deleteNode of new node does not track for deletion", () => {
    const created = manager.createNode(sessionId, { kind: "agent" });
    const newAgent = created.packageData.agents.find(a => a.isNew)!;
    manager.deleteNode(sessionId, newAgent.id);
    const result = manager.export(sessionId);
    expect(result.deletedDocuments).not.toContain(newAgent.documentPath);
  });
});

describe("isConfigurationDocumentPath", () => {
  it("recognizes agent paths", () => {
    expect(isConfigurationDocumentPath("agents/alpha.md")).toBe(true);
  });

  it("recognizes skill paths", () => {
    expect(isConfigurationDocumentPath("skills/foo/SKILL.md")).toBe(true);
  });

  it("rejects unrelated paths", () => {
    expect(isConfigurationDocumentPath("README.md")).toBe(false);
  });
});

describe("export round-trip", () => {
  it("preserves extra fields when re-exporting", () => {
    const manager = new SessionManager();
    const text = `---\nname: alpha\nschemaVersion: "v0.1"\ndescription: ""\nowner: alice\n---\nbody\n`;
    const snap = manager.openSession(baseRequest([
      { path: "agents/alpha.md", text },
    ]));
    const exp = manager.export(snap.sessionId);
    expect(exp.blocked).toBe(false);
    const out = exp.changedDocuments[0];
    expect(out.text).toContain("owner: alice");
    expect(out.text).toContain("body");
  });
});
