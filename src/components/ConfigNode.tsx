import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { GraphNodeData } from "../../shared/types";

export function ConfigNode({ data }: NodeProps) {
  const typedData = data as GraphNodeData;
  const issueLabel = typedData.issueCount > 0 ? `${typedData.issueCount} issues` : "clean";
  const isAgent = typedData.kind === "agent";

  return (
    <div
      className={`flow-node flow-node--${typedData.kind} ${typedData.issueCount > 0 ? "flow-node--issue" : ""}`}
    >
      <Handle className="flow-node__handle" position={Position.Left} type="target" />
      {isAgent ? <Handle className="flow-node__handle" position={Position.Right} type="source" /> : null}

      <div className="flow-node__header">
        <span className="flow-node__kind">{typedData.kind}</span>
        <span className={`flow-node__badge ${typedData.issueCount > 0 ? "flow-node__badge--issue" : ""}`}>
          {issueLabel}
        </span>
      </div>

      <div className="flow-node__label">{typedData.label}</div>
      <div className="flow-node__path">{typedData.documentPath}</div>

      {typedData.schemaVersion ? <div className="flow-node__meta">schema {typedData.schemaVersion}</div> : null}
    </div>
  );
}
