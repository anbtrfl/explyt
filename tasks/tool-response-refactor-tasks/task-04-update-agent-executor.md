# Task 04: Update AgentExecutor

## Goal
Update the `AgentExecutor` to work with the new `ToolCallResponse` structure when handling tool calls.

## Description
The `AgentExecutor` is responsible for executing the agent loop, including handling tool calls. It currently creates `ToolResponse` objects when tool calls complete, which needs to be changed to work directly with `ToolCallResponse`.

## Caveats & Key Points
- The executor calls `history.appendToolCallFinished()` with tool results
- It creates `ToolResponse` objects before passing them to history
- The tool execution logic itself returns `ToolCallResponse` from `ToolManager`
- Need to ensure tool call ID and name are properly tracked

## Main Changes
**File:** `platform/agent-api/src/main/kotlin/com/explyt/agent/v4/AgentExecutor.kt`

1. Locate the tool call handling logic (around line 177 based on search results)

2. Remove the creation of `ToolResponse` wrapper:
   ```kotlin
   // OLD:
   val toolResponse = ToolResponse(toolCallId, toolName, toolResult)
   history.appendToolCallFinished(toolCallId, toolResponse)
   
   // NEW:
   history.appendToolCallFinished(toolCallId, toolResult)
   ```

3. Verify that `toolResult` is already of type `ToolCallResponse` (it should be from `ToolManager`)

4. Update any other references to `ToolResponse` in the executor

## Acceptance Criteria
- [ ] `AgentExecutor` no longer creates `ToolResponse` wrapper objects
- [ ] Tool results are passed directly to `history.appendToolCallFinished()` as `ToolCallResponse`
- [ ] Tool call execution flow works correctly
- [ ] Tool call ID and name are properly tracked throughout execution
- [ ] Code compiles without errors
- [ ] Agent execution completes successfully with tool calls
