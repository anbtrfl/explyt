export type DocumentKind = "agent" | "skill" | "unknown";
export type RelationType = "USES_SKILL" | "CALLS_AGENT";
export type Severity = "error" | "warning" | "info";

export interface WorkspaceDocument {
  path: string;
  text: string;
}

export interface OpenSessionRequest {
  scopeId: string;
  documents: WorkspaceDocument[];
}

export interface VisualMeta {
  x: number;
  y: number;
  collapsed: boolean;
  selected: boolean;
}

export interface SourceDocument {
  path: string;
  kind: DocumentKind;
  rawText: string;
  frontmatterText: string;
  markdownBody: string;
  extraFields: Record<string, unknown>;
  roundTripState: {
    hasFrontmatter: boolean;
    parseError?: string;
    preservedKeys: string[];
  };
}

export interface AgentSpec {
  id: string;
  name: string;
  schemaVersion: string;
  description: string;
  tools: string[];
  referencedSkills: string[];
  referencedAgents: string[];
  extraFields: Record<string, unknown>;
  visualMeta: VisualMeta;
  documentPath: string;
  isNew?: boolean;
}

export interface SkillSpec {
  id: string;
  name: string;
  description: string;
  usedByAgents: string[];
  extraFields: Record<string, unknown>;
  visualMeta: VisualMeta;
  documentPath: string;
  isNew?: boolean;
}

export interface RelationOrigin {
  location: "agent.skills" | "skill.use-by" | "agent.agents";
  documentPath: string;
}

export interface Relation {
  id: string;
  type: RelationType;
  sourceId: string;
  targetId: string;
  origin: RelationOrigin[];
}

export interface ValidationIssue {
  severity: Severity;
  code: string;
  message: string;
  documentPath?: string;
  fieldPath?: string;
  relatedEntityId?: string;
}

export interface GraphNodeData extends Record<string, unknown> {
  label: string;
  kind: DocumentKind;
  description: string;
  documentPath: string;
  schemaVersion?: string;
  issueCount: number;
}

export interface GraphNode {
  id: string;
  type: DocumentKind;
  position: {
    x: number;
    y: number;
  };
  data: GraphNodeData;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: RelationType;
  data: {
    issueCount: number;
  };
}

export interface SessionGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface ConfigurationPackage {
  scopeId: string;
  documents: SourceDocument[];
  agents: AgentSpec[];
  skills: SkillSpec[];
  relations: Relation[];
  issues: ValidationIssue[];
}

export interface SessionSnapshot {
  sessionId: string;
  scopeId: string;
  graph: SessionGraph;
  packageData: ConfigurationPackage;
}

export interface ChangedDocument {
  path: string;
  text: string;
}

export interface ExportPackage {
  blocked: boolean;
  changedDocuments: ChangedDocument[];
  deletedDocuments: string[];
  issues: ValidationIssue[];
}

export interface UpdateNodePayload {
  name?: string;
  description?: string;
  schemaVersion?: string;
  tools?: string[];
}

export interface UpdatePositionPayload {
  x: number;
  y: number;
}

export interface CreateNodePayload {
  kind: "agent" | "skill";
}

export interface CreateRelationPayload {
  sourceId: string;
  targetId: string;
}

export interface DemoDocumentsResponse extends OpenSessionRequest {}
