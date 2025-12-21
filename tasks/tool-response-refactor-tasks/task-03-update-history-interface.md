# Task 03: Update History Interface and Implementation

## Goal
Update the `History` interface and its implementation to work with `ToolCallResponse` instead of `ToolResponse`.

## Description
The `History.kt` file contains the `MutableHistory` interface with methods for managing chat history. The `appendToolCallFinished()` method currently accepts a `ToolResponse` parameter, which needs to be changed to accept `ToolCallResponse` directly.

## Caveats & Key Points
- The `appendToolCallFinished()` method signature needs to change
- The implementation creates a `ToolResponse` wrapper before storing - this needs to be removed
- The method needs to find the matching tool call by ID and update its response field
- The `HistoryValidator` may also need updates (covered in next task)

## Main Changes
**File:** `platform/agent-api/src/main/kotlin/com/explyt/agent/v4/History.kt`

1. Update `MutableHistory` interface:
   ```kotlin
   suspend fun appendToolCallFinished(toolCallId: String, response: ToolCallResponse)
   ```
   Changed from: `suspend fun appendToolCallFinished(toolCallId: String, response: ToolResponse)`

2. Update the implementation of `appendToolCallFinished()`:
   - Remove the line that creates `ToolResponse` wrapper
   - Directly update the tool call's response field with the `ToolCallResponse`
   - The logic should find the last `AgentTurn`, find the matching tool call by ID, and update its response

3. Update any helper functions or internal logic that references `ToolResponse`

## Acceptance Criteria
- [ ] `MutableHistory.appendToolCallFinished()` accepts `ToolCallResponse` instead of `ToolResponse`
- [ ] Implementation correctly updates the tool call's response field
- [ ] Tool call matching by ID still works correctly
- [ ] No intermediate `ToolResponse` wrapper is created
- [ ] Code compiles without errors
- [ ] The history structure remains valid after tool call completion
