# Task 07: Update ij-chat-v3 Module

## Goal
Update the ij-chat-v3 module to work with the new `ToolCallResponse` structure.

## Description
The ij-chat-v3 module contains UI components and view models that work with tool calls and responses. These need to be updated to work with the simplified structure.

## Caveats & Key Points
- `MessageListViewModel` implements `MutableHistory` and needs updating
- `MessageListUtils.kt` creates `ToolResponse` objects
- Test files like `HistoryCompressorImplTest.kt` create `ToolResponse` objects
- UI rendering components may reference tool responses
- Chat events may contain `ToolCallResponse` references

## Main Changes
**File:** `platform/ij-chat-v3/src/main/kotlin/com/explyt/chat/v4/presentation/vm/MessageListViewModel.kt`

1. Update `appendToolCallFinished()` implementation to accept `ToolCallResponse`

**File:** `platform/ij-chat-v3/src/main/kotlin/com/explyt/chat/v4/presentation/vm/MessageListUtils.kt`

1. Update tool response creation (around line 35):
   ```kotlin
   // OLD:
   response = toolResult?.let { ToolResponse(toolCall.id, toolCall.name, it) }
   
   // NEW:
   response = toolResult
   ```

**File:** `platform/ij-chat-v3/src/test/kotlin/com/explyt/chat/v3/domain/usecase/compression/HistoryCompressorImplTest.kt`

1. Update test helper function `toolCall()`:
   - Change parameter type from `response: ToolResponse?` to `response: ToolCallResponse?`
   - Update the function body to create `Message.AgentTurn.ToolCall` directly

2. Update test cases that create tool responses

**Other files to check:**
- `ChatEvent.kt` - may have `ToolCallResponse` references
- Tool UI components - may need updates
- Any other files that reference `ToolResponse`

## Acceptance Criteria
- [ ] `MessageListViewModel.appendToolCallFinished()` accepts `ToolCallResponse`
- [ ] No `ToolResponse` wrapper objects are created in the module
- [ ] All files compile without errors
- [ ] All tests pass
- [ ] UI rendering of tool responses works correctly
- [ ] Chat functionality with tools works end-to-end
