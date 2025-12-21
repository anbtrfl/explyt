# Task 04: Migrate History.kt and HistoryValidator

## Goal

Update the `History` interface, `MutableHistory` interface, and `HistoryValidator` to work with the new `Message.AgentTurn` model where tool calls and responses are unified.

## Description

This is a critical task that updates the core history management logic. The main changes:

1. **MutableHistory interface:** Update method signatures to work with `AgentTurn`
2. **HistoryValidator:** Simplify validation logic since tool calls/responses are now in same message
3. **History validation states:** Update state machine to reflect new message structure

The key simplification: No more tracking "unprocessed tool calls" across messages - each `AgentTurn` is self-contained.

## Caveats & Key Points

- **Critical:** `MutableHistory` interface changes will break implementations (that's expected)
- The validation logic becomes simpler - no need to match tool call IDs across messages
- `AgentTurn` can have tool calls without responses (during streaming)
- `AgentTurn` can have tool calls with responses (after execution)
- An `AgentTurn` with no tool calls is just a regular assistant response
- The state machine in `HistoryValidator` needs significant updates

## Main Changes

**File:** `platform/agent-api/src/main/kotlin/com/explyt/agent/v4/History.kt`

### Part 1: Update Imports and Interfaces (lines 1-40)

**Current:**
```kotlin
import com.explyt.agent.llm.Message

interface MutableHistory : History {
    suspend fun appendUserMessage(message: Message.UserMessage)
    suspend fun appendToolCallStarted(toolCall: ToolCall)
    suspend fun appendToolCallFinished(toolCall: ToolCall, toolResult: ToolResult)
    suspend fun appendStartOfAssistantMessage()
    suspend fun appendReasoningToken(token: String)
    suspend fun appendResponseToken(token: String)
    suspend fun appendEndOfAssistantMessage()
}
```

**New:**
```kotlin
import com.explyt.agent.llm.Message

interface MutableHistory : History {
    suspend fun appendUserMessage(message: Message.UserMessage)
    
    // Agent turn methods
    suspend fun startAgentTurn()
    suspend fun appendReasoningToken(token: String)
    suspend fun appendResponseToken(token: String)
    
    // Tool call methods
    suspend fun appendToolCallStarted(toolCall: Message.AgentTurn.ToolCall)
    suspend fun appendToolCallFinished(toolCallId: String, response: ToolResponse)
    
    suspend fun endAgentTurn()
}
```

### Part 2: Update HistoryValidator (lines 60-195)

**Key Changes:**

1. **Remove `UnprocessedToolCalls` state** - no longer needed since tool calls/responses are in same message

2. **Simplify validation logic:**

**Current (lines 154-170):**
```kotlin
is Message.AssistantMessage -> when (status) {
    is Status.UnprocessedToolCalls -> Status.Corrupted(...)
    // ... complex logic
    else -> {
        if (message.toolCalls.isNotEmpty()) {
            Status.UnprocessedToolCalls(message.toolCalls.map { it.id })
        } else {
            Status.UserTurnAfterAssistantWithoutTools
        }
    }
}

is Message.ToolResponseMessage -> when (status) {
    is Status.UnprocessedToolCalls -> {
        val expectedIds = status.unprocessedToolCallIds.toSet()
        val responseIds = message.toolResponses.map { it.id }.toSet()
        // Complex ID matching logic
    }
    else -> Status.Corrupted(...)
}
```

**New:**
```kotlin
is Message.AgentTurn -> when (status) {
    Status.SystemMessageOrUserTurn -> Status.Corrupted(CorruptedReason.AssistantFirst)
    Status.UserTurnAfterAssistantWithoutTools -> Status.Corrupted(CorruptedReason.AssistantAfterAssistantWithoutTools)
    
    Status.UserTurnAfterSystem,
    Status.AssistantTurnAfterUser,
    Status.AssistantOrUserTurnAfterToolCall -> {
        // Check if all tool calls have responses
        val hasIncompleteToolCalls = message.toolCalls.any { it.response == null }
        if (hasIncompleteToolCalls) {
            Status.Corrupted(CorruptedReason.IncompleteToolCalls)
        } else if (message.toolCalls.isEmpty()) {
            Status.UserTurnAfterAssistantWithoutTools
        } else {
            Status.AssistantOrUserTurnAfterToolCall
        }
    }
    
    is Status.Corrupted -> status
}
```

3. **Update Status classes:**
   - Remove `UnprocessedToolCalls` data class
   - Add `IncompleteToolCalls` to `CorruptedReason` enum
   - Keep other states mostly the same

4. **Update helper functions:**
```kotlin
suspend fun MutableHistory.appendAssistantMessage(content: String, reasoning: String) = apply {
    startAgentTurn()
    appendReasoningToken(reasoning)
    appendResponseToken(content)
    endAgentTurn()
}

suspend fun MutableHistory.appendToolCallWithResult(
    toolCall: Message.AgentTurn.ToolCall,
    toolResult: ToolResult
) = apply {
    appendToolCallStarted(toolCall)
    appendToolCallFinished(toolCall.id, toolResult.response)
}
```

## Acceptance Criteria

- [ ] Import changed from `MessageOld` to `Message`
- [ ] `MutableHistory` interface updated with new method signatures
- [ ] `HistoryValidator.Status.UnprocessedToolCalls` removed
- [ ] `HistoryValidator.CorruptedReason.IncompleteToolCalls` added
- [ ] Validation logic updated to handle `Message.AgentTurn`
- [ ] No more cross-message tool call ID matching
- [ ] Helper functions updated (`appendAssistantMessage`, `appendToolCallWithResult`)
- [ ] File compiles without errors (implementations will break - that's expected)
- [ ] Validation logic is simpler and clearer than before
