# Task 02: Verify MessageListUtils Conversion Logic

## Goal
Verify that `MessageListUtils.kt` correctly converts between view models and the new `Message.AgentTurn` model.

## Description

The `MessageListUtils.kt` file already has code that uses `AgentTurn`, but it needs to be verified for correctness. The `toAgentLibMessages()` function converts view models to agent library messages, and it should properly handle:
- Creating `AgentTurn` messages from `AssistantMessageViewModel`
- Creating `AgentTurn.ToolCall` with embedded responses from `ToolCallViewModel2`
- Properly merging tool calls into existing `AgentTurn` messages

## Caveats & Key Points

- The conversion logic should create `Message.AgentTurn.ToolCall` objects with nullable `response` field
- Tool calls should be merged into the last `AgentTurn` if it exists and is the last message
- If no `AgentTurn` exists or it's not the last message, create a new `AgentTurn` with the tool call
- The `ToolResponse` should wrap the `ToolResult` with the tool call's id and name
- Empty content in `AgentTurn` should be handled correctly (use empty string or null as appropriate)

## Main Changes

**File:** `platform/ij-chat-v3/src/main/kotlin/com/explyt/chat/v4/presentation/vm/MessageListUtils.kt`

1. Verify that `AgentTurn` creation from `AssistantMessageViewModel` is correct
2. Verify that `AgentTurn.ToolCall` creation with embedded response is correct
3. Verify that tool call merging logic is correct
4. Check if empty content handling is appropriate
5. Ensure all imports are correct

## Acceptance Criteria

- [ ] `toAgentLibMessages()` correctly creates `AgentTurn` messages
- [ ] `AgentTurn.ToolCall` objects are created with correct structure
- [ ] Tool calls are properly merged into existing `AgentTurn` messages
- [ ] Empty content is handled correctly
- [ ] File compiles without errors
- [ ] Logic matches the pattern used in `agent-api` module
