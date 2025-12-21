# Task 06: Migrate AgentStatesFeature.kt

## Goal

Update the agent states feature to work with the new `Message.AgentTurn` model, particularly the system reminder injection logic.

## Description

The `AgentStatesFeature.kt` file manages agent state transitions and injects system reminders into the last tool response. With the new model:

1. System reminders are still injected into tool responses
2. But tool responses are now inside `AgentTurn.ToolCall` objects
3. Need to find the last `AgentTurn` with tool responses and update it

The main complexity is in the `withSystemReminder()` private function that modifies the last tool response message.

## Caveats & Key Points

- **Critical:** System reminders must be injected into the last tool response
- Tool responses are now at `AgentTurn.toolCalls[i].response`
- Need to find the last tool call that has a response (not null)
- Must create immutable copies (Kotlin best practice)
- The utility function from Task 02 (`AgentTurn.withSystemReminderOnLastToolCall()`) should be used here
- The `createAgentsStatesQueryMapper()` function is the main entry point

## Main Changes

**File:** `platform/agent-api/src/main/kotlin/com/explyt/agent/v4/features/states/AgentStatesFeature.kt`

### Current Implementation (lines 33-50):

```kotlin
private fun List<Message>.withSystemReminder(currentState: AgentStateConfig?): List<Message> {
    currentState ?: return this

    val chatHistory = toMutableList()
    val lastToolResponseIdx = chatHistory.indexOfLast {
        it is Message.ToolResponseMessage && it.toolResponses.isNotEmpty()
    }
    if (lastToolResponseIdx != -1) {
        val lastToolResponse = chatHistory[lastToolResponseIdx] as Message.ToolResponseMessage
        chatHistory[lastToolResponseIdx] = lastToolResponse.copy(
            toolResponses = lastToolResponse.toolResponses.toMutableList().also { toolResponses ->
                toolResponses[toolResponses.lastIndex] = toolResponses[toolResponses.lastIndex]
                    .withSystemReminder(currentState.getSystemReminder(chatHistory))
            }
        )
    }
    return chatHistory
}
```

### New Implementation:

```kotlin
private fun List<Message>.withSystemReminder(currentState: AgentStateConfig?): List<Message> {
    currentState ?: return this

    val chatHistory = toMutableList()
    val lastAgentTurnIdx = chatHistory.indexOfLast { message ->
        message is Message.AgentTurn && message.toolCalls.any { it.response != null }
    }
    
    if (lastAgentTurnIdx != -1) {
        val lastAgentTurn = chatHistory[lastAgentTurnIdx] as Message.AgentTurn
        val systemReminder = currentState.getSystemReminder(chatHistory)
        
        // Use the utility function from Task 02
        chatHistory[lastAgentTurnIdx] = lastAgentTurn.withSystemReminderOnLastToolCall(systemReminder)
    }
    
    return chatHistory
}
```

### Alternative Implementation (if utility not available):

```kotlin
private fun List<Message>.withSystemReminder(currentState: AgentStateConfig?): List<Message> {
    currentState ?: return this

    val chatHistory = toMutableList()
    val lastAgentTurnIdx = chatHistory.indexOfLast { message ->
        message is Message.AgentTurn && message.toolCalls.any { it.response != null }
    }
    
    if (lastAgentTurnIdx != -1) {
        val lastAgentTurn = chatHistory[lastAgentTurnIdx] as Message.AgentTurn
        val systemReminder = currentState.getSystemReminder(chatHistory)
        
        val updatedToolCalls = lastAgentTurn.toolCalls.toMutableList()
        val lastToolCallWithResponseIdx = updatedToolCalls.indexOfLast { it.response != null }
        
        if (lastToolCallWithResponseIdx != -1) {
            val toolCall = updatedToolCalls[lastToolCallWithResponseIdx]
            val updatedResponse = toolCall.response?.withSystemReminder(systemReminder)
            updatedToolCalls[lastToolCallWithResponseIdx] = toolCall.copy(response = updatedResponse)
        }
        
        chatHistory[lastAgentTurnIdx] = lastAgentTurn.copy(toolCalls = updatedToolCalls)
    }
    
    return chatHistory
}
```

### Other Changes:

- Update import: `MessageOld` → `Message`
- Verify `createAgentsStatesQueryMapper()` still works correctly
- Verify `buildNewSystemPrompt()` and `commonInstructionsForSystemPrompt()` are unchanged

## Acceptance Criteria

- [ ] Import changed from `MessageOld` to `Message`
- [ ] `withSystemReminder()` updated to work with `Message.AgentTurn`
- [ ] System reminder injected into last tool call's response
- [ ] Handles case where no tool responses exist
- [ ] Uses utility function from Task 02 if available
- [ ] Immutable copies created (no direct mutation)
- [ ] `createAgentsStatesQueryMapper()` works correctly
- [ ] File compiles without errors
- [ ] Logic follows user's coding style rule (no nested constructions)
