# Task 01: Update MessageListViewModel MutableHistory Implementation

## Goal
Update `MessageListViewModel` to implement the new `MutableHistory` API with renamed methods and new signatures.

## Description

The `MutableHistory` interface in `agent-api` has been updated with new method names and signatures:
- `appendStartOfAssistantMessage()` → `startAgentTurn()`
- `appendEndOfAssistantMessage()` → `endAgentTurn()`
- `appendToolCallStarted(ToolCall)` → `appendToolCallStarted(Message.AgentTurn.ToolCall)`
- `appendToolCallFinished(ToolCall, ToolResult)` → `appendToolCallFinished(toolCallId: String, response: ToolResponse)`

Additionally, the `repairHistory()` method needs to be updated to handle `Message.AgentTurn` instead of `Message.AssistantMessage` and `Message.ToolResponseMessage`.

## Caveats & Key Points

- The new `appendToolCallStarted()` takes `Message.AgentTurn.ToolCall` instead of `ToolCall`
- The new `appendToolCallFinished()` takes `toolCallId: String` and `ToolResponse` instead of `ToolCall` and `ToolResult`
- `ToolResponse` wraps the `ToolResult` (which is a typealias for `ToolCallResponse`) with the tool call's id and name
- The `repairHistory()` method should check for `Message.AgentTurn` instead of `Message.AssistantMessage`
- The commented-out code in `toMessageViewModels()` should be removed or updated if needed

## Main Changes

**File:** `platform/ij-chat-v3/src/main/kotlin/com/explyt/chat/v4/presentation/vm/MessageListViewModel.kt`

1. Rename `appendStartOfAssistantMessage()` to `startAgentTurn()`
2. Rename `appendEndOfAssistantMessage()` to `endAgentTurn()`
3. Update `appendToolCallStarted()` signature to accept `Message.AgentTurn.ToolCall`
4. Update `appendToolCallFinished()` signature to accept `toolCallId: String` and `ToolResponse`
5. Update `repairHistory()` to check for `Message.AgentTurn` instead of `Message.AssistantMessage` and `Message.ToolResponseMessage`
6. Add necessary imports: `ToolResponse`
7. Remove or update commented-out code

## Acceptance Criteria

- [ ] All method signatures match the new `MutableHistory` interface
- [ ] `appendToolCallStarted()` correctly handles `Message.AgentTurn.ToolCall`
- [ ] `appendToolCallFinished()` correctly handles `toolCallId` and `ToolResponse`
- [ ] `repairHistory()` correctly handles `Message.AgentTurn`
- [ ] File compiles without errors
- [ ] No references to old method names remain
