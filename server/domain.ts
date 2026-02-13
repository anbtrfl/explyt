import path from "node:path";
import { randomUUID } from "node:crypto";
import { isMap, parseDocument } from "yaml";
import type {
  AgentSpec,
  ConfigurationPackage,
  GraphEdge,
  GraphNode,
  OpenSessionRequest,
  SessionSnapshot,
  SkillSpec,
  SourceDocument,
  ValidationIssue,
  VisualMeta,
} from "../shared/types";

type SourceDocumentState = SourceDocument & {
  yamlDoc?: YamlDoc;
  generatedFromUi?: boolean;
  entityId?: string;
};

type YamlDoc = ReturnType<typeof parseDocument>;

interface SessionState {
  id: string;
  scopeId: string;
  packageData: ConfigurationPackageState;
  deletedDocumentPaths: string[];
}

interface ConfigurationPackageState extends ConfigurationPackage {
  documents: SourceDocumentState[];
}

const KNOWN_AGENT_KEYS = new Set(["name", "schemaVersion", "description", "tools", "skills", "agents"]);
const KNOWN_SKILL_KEYS = new Set(["name", "description", "use-by"]);

export class SessionManager {
  private sessions = new Map<string, SessionState>();

  openSession(request: OpenSessionRequest): SessionSnapshot {
    const session = createSession(request);
    this.sessions.set(session.id, session);
    return buildSnapshot(session);
  }

  getSnapshot(sessionId: string): SessionSnapshot | undefined {
    const session = this.sessions.get(sessionId);
    return session ? buildSnapshot(session) : undefined;
  }
}

function createSession(request: OpenSessionRequest): SessionState {
  const documents = request.documents.map((document) => parseSourceDocument(document.path, document.text));
  const agents: AgentSpec[] = [];
  const skills: SkillSpec[] = [];

  for (const document of documents) {
    if (!document.yamlDoc || document.roundTripState.parseError) {
      continue;
    }

    const plain = toPlainObject(document.yamlDoc);
    const kind = detectDocumentKind(document.path, plain);
    document.kind = kind;

    if (kind === "agent") {
      agents.push(createAgentSpec(document, plain));
    } else if (kind === "skill") {
      skills.push(createSkillSpec(document, plain));
    }
  }

  applyInitialLayout(agents, skills);

  const packageData: ConfigurationPackageState = {
    scopeId: request.scopeId,
    documents,
    agents,
    skills,
    relations: [],
    issues: [],
  };

  return {
    id: randomUUID(),
    scopeId: request.scopeId,
    packageData,
    deletedDocumentPaths: [],
  };
}

function parseSourceDocument(filePath: string, rawText: string): SourceDocumentState {
  const { hasFrontmatter, frontmatterText, markdownBody, parseError } = splitFrontmatter(rawText);
  let yamlDoc: YamlDoc | undefined;
  let yamlError = parseError;
  let preservedKeys: string[] = [];
  let extraFields: Record<string, unknown> = {};
  let kind: SourceDocument["kind"] = "unknown";

  if (hasFrontmatter && !parseError) {
    const parsed = parseDocument(frontmatterText, {
      keepSourceTokens: true,
      strict: false,
      uniqueKeys: false,
    });
    yamlDoc = parsed;
    if (parsed.errors.length > 0) {
      yamlError = parsed.errors.map((error) => error.message).join("; ");
    } else {
      const plain = toPlainObject(parsed);
      preservedKeys = Object.keys(plain);
      kind = detectDocumentKind(filePath, plain);
      extraFields = extractExtraFields(kind, plain);
    }
  }

  return {
    path: filePath,
    kind,
    rawText,
    frontmatterText,
    markdownBody,
    extraFields,
    roundTripState: {
      hasFrontmatter,
      parseError: yamlError,
      preservedKeys,
    },
    yamlDoc,
  };
}

function splitFrontmatter(rawText: string): {
  hasFrontmatter: boolean;
  frontmatterText: string;
  markdownBody: string;
  parseError?: string;
} {
  const normalized = rawText.replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) {
    return {
      hasFrontmatter: false,
      frontmatterText: "",
      markdownBody: normalized,
    };
  }

  const match = normalized.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    return {
      hasFrontmatter: true,
      frontmatterText: "",
      markdownBody: normalized,
      parseError: "Frontmatter block is not closed correctly",
    };
  }

  return {
    hasFrontmatter: true,
    frontmatterText: match[1],
    markdownBody: match[2] ?? "",
  };
}

function detectDocumentKind(filePath: string, plain: Record<string, unknown>): SourceDocument["kind"] {
  if (filePath.startsWith("skills/") || filePath.endsWith("/SKILL.md") || "use-by" in plain) {
    return "skill";
  }
  if (filePath.startsWith("agents/") || "tools" in plain || "skills" in plain || "schemaVersion" in plain) {
    return "agent";
  }
  return "unknown";
}

function createAgentSpec(document: SourceDocumentState, plain: Record<string, unknown>): AgentSpec {
  return {
    id: randomUUID(),
    name: readString(plain.name),
    schemaVersion: readString(plain.schemaVersion),
    description: readString(plain.description),
    tools: readStringArray(plain.tools),
    referencedSkills: readStringArray(plain.skills),
    referencedAgents: readStringArray(plain.agents),
    extraFields: extractExtraFields("agent", plain),
    visualMeta: emptyVisualMeta(),
    documentPath: document.path,
  };
}

function createSkillSpec(document: SourceDocumentState, plain: Record<string, unknown>): SkillSpec {
  return {
    id: randomUUID(),
    name: readString(plain.name),
    description: readString(plain.description),
    usedByAgents: readStringArray(plain["use-by"]),
    extraFields: extractExtraFields("skill", plain),
    visualMeta: emptyVisualMeta(),
    documentPath: document.path,
  };
}

function extractExtraFields(kind: SourceDocument["kind"], plain: Record<string, unknown>): Record<string, unknown> {
  const knownKeys = kind === "agent" ? KNOWN_AGENT_KEYS : kind === "skill" ? KNOWN_SKILL_KEYS : new Set<string>();
  return Object.fromEntries(Object.entries(plain).filter(([key]) => !knownKeys.has(key)));
}

function emptyVisualMeta(): VisualMeta {
  return {
    x: 0,
    y: 0,
    collapsed: false,
    selected: false,
  };
}

function applyInitialLayout(agents: AgentSpec[], skills: SkillSpec[]): void {
  agents
    .sort((left, right) => left.name.localeCompare(right.name))
    .forEach((agent, index) => {
      agent.visualMeta = {
        ...agent.visualMeta,
        x: 120,
        y: 120 + index * 140,
      };
    });

  skills
    .sort((left, right) => left.name.localeCompare(right.name))
    .forEach((skill, index) => {
      skill.visualMeta = {
        ...skill.visualMeta,
        x: 520,
        y: 120 + index * 140,
      };
    });
}

function buildSnapshot(session: SessionState): SessionSnapshot {
  const issues = session.packageData.issues;
  const issueCounts = countIssuesByEntity(issues);

  const nodes: GraphNode[] = [
    ...session.packageData.agents.map((agent) => ({
      id: agent.id,
      type: "agent" as const,
      position: {
        x: agent.visualMeta.x,
        y: agent.visualMeta.y,
      },
      data: {
        label: agent.name || "(unnamed agent)",
        kind: "agent" as const,
        description: agent.description,
        documentPath: agent.documentPath,
        schemaVersion: agent.schemaVersion,
        issueCount: issueCounts.get(agent.id) ?? 0,
      },
    })),
    ...session.packageData.skills.map((skill) => ({
      id: skill.id,
      type: "skill" as const,
      position: {
        x: skill.visualMeta.x,
        y: skill.visualMeta.y,
      },
      data: {
        label: skill.name || "(unnamed skill)",
        kind: "skill" as const,
        description: skill.description,
        documentPath: skill.documentPath,
        issueCount: issueCounts.get(skill.id) ?? 0,
      },
    })),
  ];

  const edges: GraphEdge[] = session.packageData.relations.map((relation) => ({
    id: relation.id,
    source: relation.sourceId,
    target: relation.targetId,
    type: relation.type,
    data: {
      issueCount: issueCounts.get(relation.id) ?? 0,
    },
  }));

  return {
    sessionId: session.id,
    scopeId: session.scopeId,
    graph: { nodes, edges },
    packageData: {
      ...session.packageData,
      documents: session.packageData.documents.map(stripDocumentState),
    },
  };
}

function stripDocumentState(document: SourceDocumentState): SourceDocument {
  return {
    path: document.path,
    kind: document.kind,
    rawText: document.rawText,
    frontmatterText: document.frontmatterText,
    markdownBody: document.markdownBody,
    extraFields: document.extraFields,
    roundTripState: document.roundTripState,
  };
}

function countIssuesByEntity(issues: ValidationIssue[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const issue of issues) {
    if (!issue.relatedEntityId) {
      continue;
    }
    counts.set(issue.relatedEntityId, (counts.get(issue.relatedEntityId) ?? 0) + 1);
  }
  return counts;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return sanitizeStringArray(value);
  }
  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }
  return [];
}

function sanitizeStringArray(value: unknown[]): string[] {
  return uniqueSorted(
    value
      .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
      .filter(Boolean),
  );
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function toPlainObject(yamlDoc: YamlDoc): Record<string, unknown> {
  const value = yamlDoc.toJS();
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

export function isConfigurationDocumentPath(filePath: string): boolean {
  return filePath.startsWith("agents/") || filePath.endsWith("/SKILL.md");
}

export function ensureConfigMap(yamlDoc: YamlDoc): void {
  if (!yamlDoc.contents || !isMap(yamlDoc.contents)) {
    yamlDoc.contents = yamlDoc.createNode({});
  }
}

// Suppress "unused" warnings for imports kept for future stages.
void path;
