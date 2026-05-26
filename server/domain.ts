import path from "node:path";
import { randomUUID } from "node:crypto";
import { isMap, parseDocument } from "yaml";
import type {
  AgentSpec,
  ConfigurationPackage,
  CreateNodePayload,
  CreateRelationPayload,
  ExportPackage,
  GraphEdge,
  GraphNode,
  OpenSessionRequest,
  Relation,
  RelationOrigin,
  RelationType,
  SessionSnapshot,
  SkillSpec,
  SourceDocument,
  UpdateNodePayload,
  UpdatePositionPayload,
  ValidationIssue,
  VisualMeta,
} from "../shared/types";

type SourceDocumentState = SourceDocument & {
  yamlDoc?: YamlDoc;
  generatedFromUi?: boolean;
  entityId?: string;
};

type YamlDoc = ReturnType<typeof parseDocument>;

interface PendingReference {
  id: string;
  type: RelationType;
  sourceName: string;
  targetName: string;
  origin: RelationOrigin;
}

interface SessionState {
  id: string;
  scopeId: string;
  packageData: ConfigurationPackageState;
  pendingReferences: PendingReference[];
  deletedDocumentPaths: string[];
}

interface ConfigurationPackageState extends ConfigurationPackage {
  documents: SourceDocumentState[];
}

type MutableNode = AgentSpec | SkillSpec;

const SUPPORTED_SCHEMA_VERSIONS = new Set(["v0.1"]);
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

  validate(sessionId: string): ExportPackage {
    const session = this.getRequiredSession(sessionId);
    const issues = validatePackage(session);
    return {
      blocked: issues.some((issue) => issue.severity === "error"),
      changedDocuments: [],
      deletedDocuments: [],
      issues,
    };
  }

  export(sessionId: string): ExportPackage {
    const session = this.getRequiredSession(sessionId);
    const issues = validatePackage(session);
    const blocked = issues.some((issue) => issue.severity === "error");
    if (blocked) {
      return { blocked, changedDocuments: [], deletedDocuments: [], issues };
    }
    return exportPackage(session, issues);
  }

  updateNode(sessionId: string, nodeId: string, payload: UpdateNodePayload): SessionSnapshot {
    const session = this.getRequiredSession(sessionId);
    const node = findNode(session, nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} was not found`);
    }

    if (typeof payload.name === "string") {
      node.name = payload.name.trim();
      maybeUpdateGeneratedDocumentPath(session, node);
    }

    if (typeof payload.description === "string") {
      node.description = payload.description;
    }

    if ("schemaVersion" in payload && "schemaVersion" in node && typeof payload.schemaVersion === "string") {
      node.schemaVersion = payload.schemaVersion.trim();
    }

    if ("tools" in payload && "tools" in node && Array.isArray(payload.tools)) {
      node.tools = sanitizeStringArray(payload.tools);
    }

    if ("skills" in payload && "referencedSkills" in node && Array.isArray(payload.skills)) {
      applyAgentSkillList(session, node, sanitizeStringArray(payload.skills));
    }

    reconcilePendingReferences(session);
    validatePackage(session);
    return buildSnapshot(session);
  }

  updateNodePosition(sessionId: string, nodeId: string, payload: UpdatePositionPayload): SessionSnapshot {
    const session = this.getRequiredSession(sessionId);
    const node = findNode(session, nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} was not found`);
    }
    node.visualMeta.x = payload.x;
    node.visualMeta.y = payload.y;
    return buildSnapshot(session);
  }

  createNode(sessionId: string, payload: CreateNodePayload): SessionSnapshot {
    const session = this.getRequiredSession(sessionId);
    const nodeId = randomUUID();
    const seedName = buildUniqueGeneratedName(session, payload.kind);
    const visualMeta = nextVisualMeta(session, payload.kind);

    if (payload.kind === "agent") {
      const agent: AgentSpec = {
        id: nodeId,
        name: seedName,
        schemaVersion: "v0.1",
        description: "",
        tools: [],
        referencedSkills: [],
        referencedAgents: [],
        extraFields: {},
        visualMeta,
        documentPath: buildGeneratedPath("agent", seedName),
        isNew: true,
      };
      session.packageData.agents.push(agent);
      session.packageData.documents.push(createGeneratedDocument(agent.id, agent.documentPath, "agent"));
    } else {
      const skill: SkillSpec = {
        id: nodeId,
        name: seedName,
        description: "",
        usedByAgents: [],
        extraFields: {},
        visualMeta,
        documentPath: buildGeneratedPath("skill", seedName),
        isNew: true,
      };
      session.packageData.skills.push(skill);
      session.packageData.documents.push(createGeneratedDocument(skill.id, skill.documentPath, "skill"));
    }

    reconcilePendingReferences(session);
    validatePackage(session);
    return buildSnapshot(session);
  }

  createRelation(sessionId: string, payload: CreateRelationPayload): SessionSnapshot {
    const session = this.getRequiredSession(sessionId);
    const source = findNode(session, payload.sourceId);
    const target = findNode(session, payload.targetId);
    if (!source || !target) {
      throw new Error("Source or target node was not found");
    }

    const relationType = resolveRelationType(source, target);
    if (!relationType) {
      throw new Error("This connection type is not allowed");
    }

    upsertRelation(session.packageData.relations, relationType, source.id, target.id, []);
    syncProjectionFields(session.packageData);
    reconcilePendingReferences(session);
    validatePackage(session);
    return buildSnapshot(session);
  }

  deleteRelation(sessionId: string, relationId: string): SessionSnapshot {
    const session = this.getRequiredSession(sessionId);
    session.packageData.relations = session.packageData.relations.filter((relation) => relation.id !== relationId);
    syncProjectionFields(session.packageData);
    validatePackage(session);
    return buildSnapshot(session);
  }

  deleteNode(sessionId: string, nodeId: string): SessionSnapshot {
    const session = this.getRequiredSession(sessionId);
    const node = findNode(session, nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} was not found`);
    }

    const document =
      session.packageData.documents.find((candidate) => candidate.entityId === node.id) ??
      session.packageData.documents.find((candidate) => candidate.path === node.documentPath);

    if ("schemaVersion" in node) {
      session.packageData.agents = session.packageData.agents.filter((agent) => agent.id !== node.id);
    } else {
      session.packageData.skills = session.packageData.skills.filter((skill) => skill.id !== node.id);
    }

    session.packageData.documents = session.packageData.documents.filter((candidate) => candidate !== document);
    session.packageData.relations = session.packageData.relations.filter(
      (relation) => relation.sourceId !== node.id && relation.targetId !== node.id,
    );
    session.pendingReferences = session.pendingReferences.filter((pending) => !pendingReferenceTouchesNode(pending, node));

    if (!node.isNew && !document?.generatedFromUi) {
      session.deletedDocumentPaths = uniqueSorted([...session.deletedDocumentPaths, document?.path ?? node.documentPath]);
    }

    syncProjectionFields(session.packageData);
    validatePackage(session);
    return buildSnapshot(session);
  }

  private getRequiredSession(sessionId: string): SessionState {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} was not found`);
    }
    return session;
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

  const session: SessionState = {
    id: randomUUID(),
    scopeId: request.scopeId,
    packageData,
    pendingReferences: [],
    deletedDocumentPaths: [],
  };

  normalizeRelations(session);
  validatePackage(session);
  return session;
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

function normalizeRelations(session: SessionState): void {
  const agentByName = new Map(session.packageData.agents.map((agent) => [agent.name, agent]));
  const skillByName = new Map(session.packageData.skills.map((skill) => [skill.name, skill]));
  const relations: Relation[] = [];
  const pendingReferences: PendingReference[] = [];

  for (const agent of session.packageData.agents) {
    for (const skillName of agent.referencedSkills) {
      const skill = skillByName.get(skillName);
      if (skill) {
        upsertRelation(relations, "USES_SKILL", agent.id, skill.id, [
          { location: "agent.skills", documentPath: agent.documentPath },
        ]);
      } else {
        pendingReferences.push({
          id: randomUUID(),
          type: "USES_SKILL",
          sourceName: agent.name,
          targetName: skillName,
          origin: {
            location: "agent.skills",
            documentPath: agent.documentPath,
          },
        });
      }
    }

    for (const targetAgentName of agent.referencedAgents) {
      const targetAgent = agentByName.get(targetAgentName);
      if (targetAgent) {
        upsertRelation(relations, "CALLS_AGENT", agent.id, targetAgent.id, [
          { location: "agent.agents", documentPath: agent.documentPath },
        ]);
      } else {
        pendingReferences.push({
          id: randomUUID(),
          type: "CALLS_AGENT",
          sourceName: agent.name,
          targetName: targetAgentName,
          origin: {
            location: "agent.agents",
            documentPath: agent.documentPath,
          },
        });
      }
    }
  }

  for (const skill of session.packageData.skills) {
    for (const agentName of skill.usedByAgents) {
      const agent = agentByName.get(agentName);
      if (agent) {
        upsertRelation(relations, "USES_SKILL", agent.id, skill.id, [
          { location: "skill.use-by", documentPath: skill.documentPath },
        ]);
      } else {
        pendingReferences.push({
          id: randomUUID(),
          type: "USES_SKILL",
          sourceName: agentName,
          targetName: skill.name,
          origin: {
            location: "skill.use-by",
            documentPath: skill.documentPath,
          },
        });
      }
    }
  }

  session.packageData.relations = relations.sort((left, right) => left.id.localeCompare(right.id));
  session.pendingReferences = pendingReferences;
  syncProjectionFields(session.packageData);
}

function syncProjectionFields(packageData: ConfigurationPackageState): void {
  const agentById = new Map(packageData.agents.map((agent) => [agent.id, agent]));
  const skillById = new Map(packageData.skills.map((skill) => [skill.id, skill]));

  for (const agent of packageData.agents) {
    agent.referencedSkills = [];
    agent.referencedAgents = [];
  }
  for (const skill of packageData.skills) {
    skill.usedByAgents = [];
  }

  for (const relation of packageData.relations) {
    if (relation.type === "USES_SKILL") {
      const agent = agentById.get(relation.sourceId);
      const skill = skillById.get(relation.targetId);
      if (agent && skill) {
        agent.referencedSkills.push(skill.name);
        skill.usedByAgents.push(agent.name);
      }
    }

    if (relation.type === "CALLS_AGENT") {
      const source = agentById.get(relation.sourceId);
      const target = agentById.get(relation.targetId);
      if (source && target) {
        source.referencedAgents.push(target.name);
      }
    }
  }

  for (const agent of packageData.agents) {
    agent.referencedSkills = uniqueSorted(agent.referencedSkills);
    agent.referencedAgents = uniqueSorted(agent.referencedAgents);
  }

  for (const skill of packageData.skills) {
    skill.usedByAgents = uniqueSorted(skill.usedByAgents);
  }
}

function upsertRelation(
  relations: Relation[],
  type: RelationType,
  sourceId: string,
  targetId: string,
  origin: RelationOrigin[],
): void {
  const relationId = buildRelationId(type, sourceId, targetId);
  const existing = relations.find((relation) => relation.id === relationId);
  if (!existing) {
    relations.push({
      id: relationId,
      type,
      sourceId,
      targetId,
      origin: [...origin],
    });
    return;
  }

  for (const originItem of origin) {
    const hasOrigin = existing.origin.some(
      (candidate) =>
        candidate.location === originItem.location && candidate.documentPath === originItem.documentPath,
    );
    if (!hasOrigin) {
      existing.origin.push(originItem);
    }
  }
}

function buildRelationId(type: RelationType, sourceId: string, targetId: string): string {
  return `${type}:${sourceId}->${targetId}`;
}

function applyAgentSkillList(session: SessionState, agent: AgentSpec, nextSkillNames: string[]): void {
  const nextNames = new Set(nextSkillNames);
  const skillByName = new Map(session.packageData.skills.map((skill) => [skill.name, skill]));

  // Drop USES_SKILL relations from this agent that are no longer listed.
  session.packageData.relations = session.packageData.relations.filter((relation) => {
    if (relation.type !== "USES_SKILL" || relation.sourceId !== agent.id) {
      return true;
    }
    const skill = session.packageData.skills.find((candidate) => candidate.id === relation.targetId);
    if (skill && nextNames.has(skill.name)) {
      return true;
    }
    return false;
  });

  // Drop pending references for this agent (will be rebuilt below).
  session.pendingReferences = session.pendingReferences.filter(
    (pending) => !(pending.type === "USES_SKILL" && pending.sourceName === agent.name),
  );

  // Add/keep relations or pending refs for each listed skill.
  for (const skillName of nextSkillNames) {
    const skill = skillByName.get(skillName);
    if (skill) {
      upsertRelation(session.packageData.relations, "USES_SKILL", agent.id, skill.id, [
        { location: "agent.skills", documentPath: agent.documentPath },
      ]);
    } else {
      session.pendingReferences.push({
        id: randomUUID(),
        type: "USES_SKILL",
        sourceName: agent.name,
        targetName: skillName,
        origin: {
          location: "agent.skills",
          documentPath: agent.documentPath,
        },
      });
    }
  }

  syncProjectionFields(session.packageData);
}

function reconcilePendingReferences(session: SessionState): void {
  const agentByName = new Map(session.packageData.agents.map((agent) => [agent.name, agent]));
  const skillByName = new Map(session.packageData.skills.map((skill) => [skill.name, skill]));
  const remaining: PendingReference[] = [];

  for (const pending of session.pendingReferences) {
    const source = agentByName.get(pending.sourceName);
    const target =
      pending.type === "USES_SKILL" ? skillByName.get(pending.targetName) : agentByName.get(pending.targetName);

    if (source && target) {
      upsertRelation(session.packageData.relations, pending.type, source.id, target.id, [pending.origin]);
      continue;
    }
    remaining.push(pending);
  }

  session.pendingReferences = remaining;
  syncProjectionFields(session.packageData);
}

function pendingReferenceTouchesNode(pending: PendingReference, node: MutableNode): boolean {
  if (pending.origin.documentPath === node.documentPath) {
    return true;
  }

  const normalizedName = node.name.trim();
  if (!normalizedName) {
    return false;
  }

  return pending.sourceName === normalizedName || pending.targetName === normalizedName;
}

function validatePackage(session: SessionState): ValidationIssue[] {
  reconcilePendingReferences(session);

  const issues: ValidationIssue[] = [];
  const packageData = session.packageData;
  const agentById = new Map(packageData.agents.map((agent) => [agent.id, agent]));
  const skillById = new Map(packageData.skills.map((skill) => [skill.id, skill]));
  const agentByName = new Map(packageData.agents.map((agent) => [agent.name, agent]));
  const skillByName = new Map(packageData.skills.map((skill) => [skill.name, skill]));

  for (const document of packageData.documents) {
    if (!document.roundTripState.hasFrontmatter) {
      issues.push({
        severity: "error",
        code: "FM_MISSING",
        message: "Document does not contain a frontmatter block",
        documentPath: document.path,
      });
    }
    if (document.roundTripState.parseError) {
      issues.push({
        severity: "error",
        code: "FM_PARSE",
        message: document.roundTripState.parseError,
        documentPath: document.path,
      });
    }
    if (document.kind === "unknown" && document.roundTripState.hasFrontmatter && !document.roundTripState.parseError) {
      issues.push({
        severity: "warning",
        code: "DOC_KIND_UNKNOWN",
        message: "Document frontmatter was parsed, but the document kind could not be inferred",
        documentPath: document.path,
      });
    }
  }

  validateNodeFields(packageData.agents, issues, "agent");
  validateNodeFields(packageData.skills, issues, "skill");

  for (const pending of session.pendingReferences) {
    const relatedEntityId = agentByName.get(pending.sourceName)?.id ?? skillByName.get(pending.targetName)?.id;
    issues.push({
      severity: "error",
      code: "REFERENCE_UNRESOLVED",
      message: `Reference ${pending.sourceName} -> ${pending.targetName} from ${pending.origin.location} cannot be resolved`,
      documentPath: pending.origin.documentPath,
      fieldPath: pending.origin.location,
      relatedEntityId,
    });
  }

  for (const relation of packageData.relations) {
    if (relation.type === "USES_SKILL") {
      const fromAgent = relation.origin.some((origin) => origin.location === "agent.skills");
      const fromSkill = relation.origin.some((origin) => origin.location === "skill.use-by");
      if ((fromAgent || fromSkill) && !(fromAgent && fromSkill)) {
        issues.push({
          severity: "warning",
          code: "RELATION_ONE_SIDED",
          message: "Agent/skill relation exists only in one YAML projection and will be normalized on export",
          relatedEntityId: relation.id,
        });
      }
    }
  }

  for (const relation of packageData.relations) {
    if (relation.type === "CALLS_AGENT") {
      const source = agentById.get(relation.sourceId);
      const target = agentById.get(relation.targetId);
      if (!source || !target) {
        issues.push({
          severity: "error",
          code: "RELATION_INVALID",
          message: "Agent-to-agent relation points to a missing node",
          relatedEntityId: relation.id,
        });
      }
    }
    if (relation.type === "USES_SKILL") {
      const source = agentById.get(relation.sourceId);
      const target = skillById.get(relation.targetId);
      if (!source || !target) {
        issues.push({
          severity: "error",
          code: "RELATION_INVALID",
          message: "Agent-to-skill relation points to a missing node",
          relatedEntityId: relation.id,
        });
      }
    }
  }

  issues.push(...detectAgentCycles(packageData.agents, packageData.relations));

  packageData.issues = issues;
  return issues;
}

function validateNodeFields(nodes: MutableNode[], issues: ValidationIssue[], kind: "agent" | "skill"): void {
  const nameCounts = new Map<string, number>();

  for (const node of nodes) {
    if (!node.name) {
      issues.push({
        severity: "error",
        code: "NAME_REQUIRED",
        message: `${capitalize(kind)} name is required`,
        documentPath: node.documentPath,
        fieldPath: "name",
        relatedEntityId: node.id,
      });
    }

    if (node.name && !/^[A-Za-z0-9_-]{1,50}$/.test(node.name)) {
      issues.push({
        severity: "error",
        code: "NAME_INVALID",
        message: `${capitalize(kind)} name must be 1-50 chars and contain only Latin letters, digits, hyphens, or underscores`,
        documentPath: node.documentPath,
        fieldPath: "name",
        relatedEntityId: node.id,
      });
    }

    if ("schemaVersion" in node) {
      if (!node.schemaVersion) {
        issues.push({
          severity: "error",
          code: "SCHEMA_REQUIRED",
          message: "Agent schemaVersion is required",
          documentPath: node.documentPath,
          fieldPath: "schemaVersion",
          relatedEntityId: node.id,
        });
      } else if (!SUPPORTED_SCHEMA_VERSIONS.has(node.schemaVersion)) {
        issues.push({
          severity: "error",
          code: "SCHEMA_UNSUPPORTED",
          message: `Unsupported schemaVersion: ${node.schemaVersion}`,
          documentPath: node.documentPath,
          fieldPath: "schemaVersion",
          relatedEntityId: node.id,
        });
      }
    }

    if (node.name) {
      nameCounts.set(node.name, (nameCounts.get(node.name) ?? 0) + 1);
    }
  }

  for (const node of nodes) {
    if (node.name && (nameCounts.get(node.name) ?? 0) > 1) {
      issues.push({
        severity: "error",
        code: "NAME_DUPLICATE",
        message: `${capitalize(kind)} name "${node.name}" is duplicated`,
        documentPath: node.documentPath,
        fieldPath: "name",
        relatedEntityId: node.id,
      });
    }
  }
}

function detectAgentCycles(agents: AgentSpec[], relations: Relation[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const adjacency = new Map<string, string[]>();
  const agentById = new Map(agents.map((agent) => [agent.id, agent]));

  for (const agent of agents) {
    adjacency.set(agent.id, []);
  }

  for (const relation of relations) {
    if (relation.type !== "CALLS_AGENT") {
      continue;
    }
    adjacency.get(relation.sourceId)?.push(relation.targetId);
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();

  const visit = (nodeId: string, stack: string[]): void => {
    if (visiting.has(nodeId)) {
      const cycleStart = stack.indexOf(nodeId);
      const cycle = stack.slice(cycleStart).concat(nodeId);
      const labels = cycle.map((id) => agentById.get(id)?.name ?? id).join(" -> ");
      issues.push({
        severity: "error",
        code: "AGENT_CYCLE",
        message: `Agent call graph contains a cycle: ${labels}`,
        relatedEntityId: nodeId,
      });
      return;
    }

    if (visited.has(nodeId)) {
      return;
    }

    visiting.add(nodeId);
    stack.push(nodeId);

    for (const nextNodeId of adjacency.get(nodeId) ?? []) {
      visit(nextNodeId, stack);
    }

    stack.pop();
    visiting.delete(nodeId);
    visited.add(nodeId);
  };

  for (const agent of agents) {
    visit(agent.id, []);
  }

  return issues;
}

function exportPackage(session: SessionState, issues: ValidationIssue[]): ExportPackage {
  const packageData = session.packageData;
  const changedDocuments = [...packageData.agents, ...packageData.skills]
    .map((node) => projectNodeIntoDocument(packageData, node))
    .sort((left, right) => left.path.localeCompare(right.path));

  return {
    blocked: false,
    changedDocuments,
    deletedDocuments: [...session.deletedDocumentPaths].sort((left, right) => left.localeCompare(right)),
    issues,
  };
}

function projectNodeIntoDocument(packageData: ConfigurationPackageState, node: MutableNode): { path: string; text: string } {
  const documentState =
    packageData.documents.find((document) => document.entityId === node.id) ??
    packageData.documents.find((document) => document.path === node.documentPath);

  if (!documentState) {
    throw new Error(`Document state for ${node.documentPath} was not found`);
  }

  const yamlDoc = documentState.yamlDoc ?? parseDocument("", { keepSourceTokens: true, strict: false });
  writeKnownFields(yamlDoc, node);

  const serializedFrontmatter = yamlDoc.toString({ defaultKeyType: "PLAIN" }).trimEnd();
  const body = documentState.markdownBody ? `\n${documentState.markdownBody}` : "\n";

  return {
    path: node.documentPath,
    text: `---\n${serializedFrontmatter}\n---${body}`,
  };
}

function writeKnownFields(yamlDoc: YamlDoc, node: MutableNode): void {
  yamlDoc.set("name", node.name || "");
  yamlDoc.set("description", node.description || "");

  if ("schemaVersion" in node) {
    yamlDoc.set("schemaVersion", node.schemaVersion || "");
    yamlDoc.set("tools", sanitizeStringArray(node.tools));
    yamlDoc.set("skills", sanitizeStringArray(node.referencedSkills));
    if (node.referencedAgents.length > 0 || yamlDoc.has("agents")) {
      yamlDoc.set("agents", sanitizeStringArray(node.referencedAgents));
    }
  } else {
    if (node.usedByAgents.length > 0 || yamlDoc.has("use-by")) {
      yamlDoc.set("use-by", sanitizeStringArray(node.usedByAgents));
    }
  }
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

  const pendingSkillsByAgent = new Map<string, string[]>();
  for (const pending of session.pendingReferences) {
    if (pending.type !== "USES_SKILL" || pending.origin.location !== "agent.skills") {
      continue;
    }
    const list = pendingSkillsByAgent.get(pending.sourceName) ?? [];
    list.push(pending.targetName);
    pendingSkillsByAgent.set(pending.sourceName, list);
  }

  const agentsWithPending = session.packageData.agents.map((agent) => {
    const pending = pendingSkillsByAgent.get(agent.name);
    if (!pending || pending.length === 0) {
      return agent;
    }
    return { ...agent, referencedSkills: uniqueSorted([...agent.referencedSkills, ...pending]) };
  });

  return {
    sessionId: session.id,
    scopeId: session.scopeId,
    graph: { nodes, edges },
    packageData: {
      ...session.packageData,
      agents: agentsWithPending,
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

function findNode(session: SessionState, nodeId: string): MutableNode | undefined {
  return session.packageData.agents.find((agent) => agent.id === nodeId) ?? session.packageData.skills.find((skill) => skill.id === nodeId);
}

function nextVisualMeta(session: SessionState, kind: "agent" | "skill"): VisualMeta {
  const baseX = kind === "agent" ? 120 : 520;
  const count = kind === "agent" ? session.packageData.agents.length : session.packageData.skills.length;
  return {
    x: baseX,
    y: 120 + count * 140,
    collapsed: false,
    selected: false,
  };
}

function createGeneratedDocument(entityId: string, filePath: string, kind: SourceDocument["kind"]): SourceDocumentState {
  return {
    path: filePath,
    kind,
    rawText: "",
    frontmatterText: "",
    markdownBody: "",
    extraFields: {},
    roundTripState: {
      hasFrontmatter: true,
      preservedKeys: [],
    },
    yamlDoc: parseDocument("", { keepSourceTokens: true, strict: false }),
    generatedFromUi: true,
    entityId,
  };
}

function maybeUpdateGeneratedDocumentPath(session: SessionState, node: MutableNode): void {
  if (!node.isNew) {
    return;
  }
  const nextPath = buildGeneratedPath("schemaVersion" in node ? "agent" : "skill", node.name || node.id);
  const document = session.packageData.documents.find((candidate) => candidate.entityId === node.id);
  if (!document) {
    return;
  }
  document.path = nextPath;
  node.documentPath = nextPath;
}

function buildGeneratedPath(kind: "agent" | "skill", name: string): string {
  const slug = slugify(name || randomUUID());
  return kind === "agent" ? path.posix.join("agents", `${slug}.md`) : path.posix.join("skills", slug, "SKILL.md");
}

function buildUniqueGeneratedName(session: SessionState, kind: "agent" | "skill"): string {
  const existingNames = new Set(
    (kind === "agent" ? session.packageData.agents : session.packageData.skills).map((node) => node.name),
  );

  let index = 1;
  while (existingNames.has(`${kind}-${index}`)) {
    index += 1;
  }

  return `${kind}-${index}`;
}

function resolveRelationType(source: MutableNode, target: MutableNode): RelationType | null {
  if ("schemaVersion" in source && "schemaVersion" in target) {
    return "CALLS_AGENT";
  }
  if ("schemaVersion" in source && !("schemaVersion" in target)) {
    return "USES_SKILL";
  }
  return null;
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

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50) || "node";
}

function toPlainObject(yamlDoc: YamlDoc): Record<string, unknown> {
  const value = yamlDoc.toJS();
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function isConfigurationDocumentPath(filePath: string): boolean {
  return filePath.startsWith("agents/") || filePath.endsWith("/SKILL.md");
}

export function ensureConfigMap(yamlDoc: YamlDoc): void {
  if (!yamlDoc.contents || !isMap(yamlDoc.contents)) {
    yamlDoc.contents = yamlDoc.createNode({});
  }
}
