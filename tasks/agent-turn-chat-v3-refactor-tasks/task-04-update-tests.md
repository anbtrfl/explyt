# Task 04: Update Test Files

## Goal
Update test files to use the new `Message.AgentTurn` model instead of the old `AssistantMessage` and `ToolResponseMessage` types.

## Description

The test file `HistoryCompressorImplTest.kt` uses the old message model with separate `AssistantMessage` and `ToolResponseMessage` types. It needs to be updated to use the new unified `AgentTurn` model where tool calls and responses are embedded together.

## Caveats & Key Points

- Helper functions like `assistantMessage()` and `toolResponseMessage()` need to be replaced or updated
- Tool calls and responses should be embedded in `AgentTurn.ToolCall` objects
- The `assertMessagesEqual()` function needs to handle `Message.AgentTurn` instead of old types
- Test cases should verify that tool calls with responses are properly embedded
- Follow the pattern used in `agent-api/src/test/kotlin/com/explyt/agent/v4/HistoryValidatorTest.kt`

## Main Changes

**File:** `platform/ij-chat-v3/src/test/kotlin/com/explyt/chat/v3/domain/usecase/compression/HistoryCompressorImplTest.kt`

1. Replace `assistantMessage()` helper to create `Message.AgentTurn`
2. Remove `toolResponseMessage()` helper (responses are now embedded)
3. Update helper to create `Message.AgentTurn.ToolCall` with embedded responses
4. Update `assertMessagesEqual()` to handle `Message.AgentTurn`
5. Update all test cases to use new message structure
6. Verify that tool call/response embedding is correct in tests

## Acceptance Criteria

- [ ] All helper functions create `Message.AgentTurn` instead of old types
- [ ] Tool responses are embedded in `AgentTurn.ToolCall` objects
- [ ] `assertMessagesEqual()` correctly compares `AgentTurn` messages
- [ ] All test cases pass
- [ ] File compiles without errors
- [ ] No references to `AssistantMessage` or `ToolResponseMessage` remain
