# Task 02: Verify History Validator Handles Empty Agent Turns

## Goal
Ensure the HistoryValidator correctly handles empty agent turns (agent turns with no content, reasoning, or tool calls).

## Description
After Task 01, the AgentExecutor will always create an agent turn for every LLM query, even if the LLM returns nothing. We need to verify that the HistoryValidator handles this case correctly and doesn't mark the history as corrupted.

An empty agent turn looks like:
```kotlin
Message.AgentTurn(
    content = null,
    reasoning = null,
    toolCalls = emptyList()
)
```

## Caveats & Key Points

### Current Validation Logic
The validator checks:
- `IncompleteToolCalls` - tool calls without responses
- `AssistantAfterAssistantWithoutTools` - consecutive assistant messages without tool calls between them

### Expected Behavior
Empty agent turns should be treated the same as agent turns with only text:
- They should transition to `Status.UserTurnAfterAssistantWithoutTools`
- They should NOT be marked as corrupted
- A user message can follow them

### Edge Cases
1. Empty agent turn followed by user message - should be valid
2. Empty agent turn followed by another agent turn - should be invalid (same as current behavior)
3. Empty agent turn at the end of history - should be valid

## Main Changes

### File: `platform/agent-api/src/main/kotlin/com/explyt/agent/v4/History.kt`

**Review the validation logic in `HistoryValidator.statuses()`:**
- Check the `Message.AgentTurn` case in the when expression
- Verify that `message.toolCalls.isEmpty()` correctly transitions to `Status.UserTurnAfterAssistantWithoutTools`
- Ensure empty agent turns (no content, no reasoning, no tool calls) are handled the same way

**No code changes expected** - this is a verification task.

## Acceptance Criteria

1. ✅ Review the `HistoryValidator.statuses()` method
2. ✅ Confirm that empty agent turns are handled correctly
3. ✅ Verify that the condition `message.toolCalls.isEmpty()` covers empty agent turns
4. ✅ Document findings: either "no changes needed" or "issues found"
5. ✅ If issues found, document what needs to be fixed (will be addressed in a follow-up task)
