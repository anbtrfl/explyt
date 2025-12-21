# Task 02: Migrate Message.kt Utility Functions

## Goal

Update utility functions and extensions in `Message.kt` to work with the new `Message` model instead of `MessageOld`.

## Description

The `Message.kt` file contains utility functions like `withSystemReminder()` that operate on tool responses. These need to be updated to work with the new model where tool responses are embedded within `Message.AgentTurn.ToolCall` rather than in separate `ToolResponseMessage`.

This task focuses only on the utilities within the `Message.kt` file itself, not on other files that use these utilities.

## Caveats & Key Points

- The `withSystemReminder()` function currently works on `ToolResponse`
- In the new model, `ToolResponse` is accessed via `AgentTurn.ToolCall.response`
- Keep the function signature compatible if possible
- May need to add new utility functions for working with `AgentTurn`
- Don't break existing `MessageOld` utilities yet (they'll be removed in final task)

## Main Changes

**File:** `platform/agent-api/src/main/kotlin/com/explyt/agent/llm/Message.kt`

### Current Utility (around line 54):

```kotlin
fun ToolResponse.withSystemReminder(systemInfo: String?) = copy(
    response = when (response) {
        is FailureToolCallResponse -> response.copy(systemReminder = systemInfo)
        is SuccessToolCallWithMessageResponse -> response.copy(systemReminder = systemInfo)
        // ... other cases
    }
)
```

### Potential New Utilities Needed:

1. Extension on `Message.AgentTurn.ToolCall` to update response with system reminder
2. Extension on `Message.AgentTurn` to update last tool call's response
3. Helper functions to find tool calls with/without responses

### Example New Utility:

```kotlin
fun Message.AgentTurn.ToolCall.withSystemReminder(systemInfo: String?): Message.AgentTurn.ToolCall {
    val updatedResponse = response?.withSystemReminder(systemInfo) ?: return this
    return copy(response = updatedResponse)
}

fun Message.AgentTurn.withSystemReminderOnLastToolCall(systemInfo: String?): Message.AgentTurn {
    val lastToolCallIdx = toolCalls.indexOfLast { it.response != null }
    if (lastToolCallIdx == -1) return this
    
    val updatedToolCalls = toolCalls.toMutableList()
    updatedToolCalls[lastToolCallIdx] = updatedToolCalls[lastToolCallIdx].withSystemReminder(systemInfo)
    return copy(toolCalls = updatedToolCalls)
}
```

## Acceptance Criteria

- [ ] `ToolResponse.withSystemReminder()` still exists and works (for `MessageOld` compatibility)
- [ ] New utility functions added for `Message.AgentTurn` and `Message.AgentTurn.ToolCall`
- [ ] Utilities handle nullable `response` field correctly
- [ ] File compiles without errors
- [ ] Utilities follow Kotlin best practices (immutable copies, null safety)
