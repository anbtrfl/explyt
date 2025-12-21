# Task 06a: Migrate AgentExecutor.kt

## Goal

Update `AgentExecutor.kt` to use the new `MutableHistory` API with `startAgentTurn()` and `endAgentTurn()` instead of the old `appendStartOfAssistantMessage()` and `appendEndOfAssistantMessage()` methods.

## Description

The `AgentExecutor.kt` file is the core execution engine for the agent. It orchestrates the agent loop, handling LLM queries, streaming responses, and tool execution. The file currently uses the old `MutableHistory` API methods that were replaced in Task 04.

The key change is that the old API had separate methods for starting/ending assistant messages:
- `appendStartOfAssistantMessage()` → `startAgentTurn()`
- `appendEndOfAssistantMessage()` → `endAgentTurn()`

Additionally, the tool call handling needs to be updated:
- `appendToolCallStarted(toolCall: ToolCall)` → `appendToolCallStarted(toolCall: Message.AgentTurn.ToolCall)`
- `appendToolCallFinished(toolCall: ToolCall, toolResult: ToolResult)` → `appendToolCallFinished(toolCallId: String, response: ToolResponse)`

## Caveats & Key Points

- The file uses a streaming approach with local functions `appendStartOfAssistantMessageIfNeeded()` and `appendEndOfAssistantMessageIfNeeded()`
- These functions need to be renamed to match the new API
- The tool call handling in `onLlmToolCallEvent()` needs to be updated to:
  1. Convert `ToolCall` to `Message.AgentTurn.ToolCall` when calling `appendToolCallStarted()`
  2. Pass only `toolCallId` and `ToolResponse` to `appendToolCallFinished()` instead of the full `ToolCall` and `ToolResult`
- The `ToolResponse` should be constructed from the tool call ID, name, and result
- The `AgentResult.UnprocessedToolCalls` status is no longer used in the new model (removed in Task 04)
- Need to import `Message.AgentTurn.ToolCall` and `ToolResponse`

## Main Changes

### File: `platform/agent-api/src/main/kotlin/com/explyt/agent/v4/AgentExecutor.kt`

**Lines 49-63: Update local function names**

**Current:**
```kotlin
                        suspend fun appendStartOfAssistantMessageIfNeeded() {
                            if (!addedMessage) {
                                agentListener.onAssistantMessageStart()
                                history.appendStartOfAssistantMessage()
                                addedMessage = true
                            }
                        }

                        suspend fun appendEndOfAssistantMessageIfNeeded() {
                            if (addedMessage) {
                                agentListener.onAssistantMessageFinish()
                                history.appendEndOfAssistantMessage()
                                addedMessage = false
                            }
                        }
```

**Change to:**
```kotlin
                        suspend fun startAgentTurnIfNeeded() {
                            if (!addedMessage) {
                                agentListener.onAssistantMessageStart()
                                history.startAgentTurn()
                                addedMessage = true
                            }
                        }

                        suspend fun endAgentTurnIfNeeded() {
                            if (addedMessage) {
                                agentListener.onAssistantMessageFinish()
                                history.endAgentTurn()
                                addedMessage = false
                            }
                        }
```

**Lines 65-82: Update function calls**

**Current:**
```kotlin
                        events
                            .onEach { agentListener.onLlmEvent(it) }
                            .onEach { event ->
                                when (event) {
                                    is LlmQueryEvent.LlmEndOfMessageEvent -> onLlmEndOfMessageEvent(event)
                                    is LlmQueryEvent.LlmReasoningEvent -> {
                                        appendStartOfAssistantMessageIfNeeded()
                                        onLlmReasoningEvent(event)
                                    }

                                    is LlmQueryEvent.LlmTextEvent -> {
                                        appendStartOfAssistantMessageIfNeeded()
                                        onLlmTextEvent(event)
                                    }

                                    is LlmQueryEvent.LlmToolCallEvent -> {
                                        appendEndOfAssistantMessageIfNeeded()
                                        onLlmToolCallEvent(event)
                                    }
                                }
                            }
                            .onCompletion {
                                appendEndOfAssistantMessageIfNeeded()
                            }
                            .collect()
```

**Change to:**
```kotlin
                        events
                            .onEach { agentListener.onLlmEvent(it) }
                            .onEach { event ->
                                when (event) {
                                    is LlmQueryEvent.LlmEndOfMessageEvent -> onLlmEndOfMessageEvent(event)
                                    is LlmQueryEvent.LlmReasoningEvent -> {
                                        startAgentTurnIfNeeded()
                                        onLlmReasoningEvent(event)
                                    }

                                    is LlmQueryEvent.LlmTextEvent -> {
                                        startAgentTurnIfNeeded()
                                        onLlmTextEvent(event)
                                    }

                                    is LlmQueryEvent.LlmToolCallEvent -> {
                                        endAgentTurnIfNeeded()
                                        onLlmToolCallEvent(event)
                                    }
                                }
                            }
                            .onCompletion {
                                endAgentTurnIfNeeded()
                            }
                            .collect()
```

**Lines 97-102: Remove UnprocessedToolCalls handling**

**Current:**
```kotlin
                    is HistoryValidator.Status.UnprocessedToolCalls -> {
                        // TODO: It's unexpected, but we can process unprocessed tool calls
                        return AgentResult.UnprocessedToolCalls(status.unprocessedToolCallIds)
                            .also { agentListener.onFinishedProcessing(it) }
                    }
```

**Change to:**
Remove this entire `when` branch since `Status.UnprocessedToolCalls` no longer exists.

**Lines 152-172: Update tool call handling**

**Current:**
```kotlin
    private suspend fun AgentCtx.onLlmToolCallEvent(event: LlmQueryEvent.LlmToolCallEvent) {
        val toolCall = ToolCall(event.toolCallId.callId, event.toolCallId.toolName, event.toolArgs)

        // Add tool call to history BEFORE execution
        history.appendToolCallStarted(toolCall)
        agentListener.onToolCallStarted(toolCall)

        val result = runCatching {
            execute(toolCall)
        }

        val exceptionOrNull = result.exceptionOrNull()
        if (exceptionOrNull is CancellationException) {
            throw exceptionOrNull
        }

        // Update history with result AFTER execution
        result.onSuccess { toolResult ->
            history.appendToolCallFinished(toolCall, toolResult)
        }

        agentListener.onToolCallFinished(toolCall, result)
    }
```

**Change to:**
```kotlin
    private suspend fun AgentCtx.onLlmToolCallEvent(event: LlmQueryEvent.LlmToolCallEvent) {
        val toolCallId = event.toolCallId.callId
        val toolName = event.toolCallId.toolName
        val toolCall = ToolCall(toolCallId, toolName, event.toolArgs)
        
        // Create Message.AgentTurn.ToolCall for history
        val agentTurnToolCall = Message.AgentTurn.ToolCall(
            id = toolCallId,
            name = toolName,
            arguments = event.toolArgs,
            response = null
        )

        // Add tool call to history BEFORE execution
        history.appendToolCallStarted(agentTurnToolCall)
        agentListener.onToolCallStarted(toolCall)

        val result = runCatching {
            execute(toolCall)
        }

        val exceptionOrNull = result.exceptionOrNull()
        if (exceptionOrNull is CancellationException) {
            throw exceptionOrNull
        }

        // Update history with result AFTER execution
        result.onSuccess { toolResult ->
            val toolResponse = ToolResponse(toolCallId, toolName, toolResult)
            history.appendToolCallFinished(toolCallId, toolResponse)
        }

        agentListener.onToolCallFinished(toolCall, result)
    }
```

**Lines 1-10: Update imports**

**Current:**
```kotlin
package com.explyt.agent.v4

import com.explyt.agent.llm.LlmQueryEvent
import com.explyt.agent.llm.ToolCall
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.NonCancellable
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.flow.onCompletion
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.withContext
```

**Change to:**
```kotlin
package com.explyt.agent.v4

import com.explyt.agent.llm.LlmQueryEvent
import com.explyt.agent.llm.Message
import com.explyt.agent.llm.ToolCall
import com.explyt.agent.llm.ToolResponse
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.NonCancellable
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.flow.onCompletion
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.withContext
```

**Lines 13-18: Update AgentResult**

**Current:**
```kotlin
sealed interface AgentResult {
    data class Failure(val exception: Exception) : AgentResult
    data class CorruptedHistory(val reason: HistoryValidator.CorruptedReason) : AgentResult
    data object StoppedOnUserTurn : AgentResult
    data object StoppedOnSystemOrUserTurn : AgentResult
    data class UnprocessedToolCalls(val unprocessedToolCallIds: List<String>) : AgentResult
    data object StoppedByLoopBreak : AgentResult
    data class Cancelled(val exception: CancellationException) : AgentResult
}
```

**Change to:**
```kotlin
sealed interface AgentResult {
    data class Failure(val exception: Exception) : AgentResult
    data class CorruptedHistory(val reason: HistoryValidator.CorruptedReason) : AgentResult
    data object StoppedOnUserTurn : AgentResult
    data object StoppedOnSystemOrUserTurn : AgentResult
    data object StoppedByLoopBreak : AgentResult
    data class Cancelled(val exception: CancellationException) : AgentResult
}
```

## Acceptance Criteria

- [ ] All `appendStartOfAssistantMessage()` calls replaced with `startAgentTurn()`
- [ ] All `appendEndOfAssistantMessage()` calls replaced with `endAgentTurn()`
- [ ] Local helper functions renamed to `startAgentTurnIfNeeded()` and `endAgentTurnIfNeeded()`
- [ ] Tool call handling updated to use `Message.AgentTurn.ToolCall` and `ToolResponse`
- [ ] `AgentResult.UnprocessedToolCalls` removed from sealed interface
- [ ] `Status.UnprocessedToolCalls` handling removed from when expression
- [ ] Imports updated to include `Message` and `ToolResponse`
- [ ] File compiles without errors
- [ ] No references to old API methods remain

## Testing

After migration:
1. Verify the file compiles without errors
2. Check that no compilation errors are introduced in dependent files
3. Verify that the agent execution flow still works correctly with the new API

## Notes

- This file was not originally listed in the 12 files using Message in CONTEXT.md, but it uses the old MutableHistory API
- The migration is straightforward - mostly renaming method calls
- The tool call handling is slightly more complex as it needs to create both `ToolCall` (for execution) and `Message.AgentTurn.ToolCall` (for history)
- The removal of `UnprocessedToolCalls` simplifies the result handling
