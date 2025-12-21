# Task 01: Refactor AgentExecutor to Always Call startAgentTurn/endAgentTurn

## Goal
Simplify AgentExecutor by always calling `startAgentTurn()` and `endAgentTurn()` for every LLM query, removing conditional logic.

## Description
Currently, `startAgentTurn()` and `endAgentTurn()` are called conditionally based on whether text or reasoning events occur. This creates complexity with the `addedMessage` flag and helper functions. 

The refactoring will:
1. Call `startAgentTurn()` unconditionally before processing LLM events
2. Call `endAgentTurn()` unconditionally in `onCompletion`
3. Remove the `addedMessage` flag
4. Remove `startAgentTurnIfNeeded()` and `endAgentTurnIfNeeded()` helper functions
5. Simplify event handling logic

## Caveats & Key Points

### Empty Agent Turns
- After this change, every LLM query will create an agent turn, even if the LLM returns no text/reasoning/tool calls
- This is acceptable and simplifies the logic
- The history validator should handle empty agent turns correctly

### Error Handling
- `endAgentTurn()` must be called even if an error occurs during event processing
- The `onCompletion` block handles this correctly (called on both success and failure)

### Cancellation
- `onCompletion` is called even on cancellation, so `endAgentTurn()` will be called
- This ensures history consistency

### Event Flow
The new flow will be:
```kotlin
history.startAgentTurn()
agentListener.onAssistantMessageStart()

events
    .onEach { agentListener.onLlmEvent(it) }
    .onEach { event -> /* handle events */ }
    .onCompletion {
        agentListener.onAssistantMessageFinish()
        history.endAgentTurn()
    }
    .collect()
```

## Main Changes

### File: `platform/agent-api/src/main/kotlin/com/explyt/agent/v4/AgentExecutor.kt`

**Changes:**
1. Remove the `addedMessage` variable declaration
2. Remove `startAgentTurnIfNeeded()` function
3. Remove `endAgentTurnIfNeeded()` function
4. Add `history.startAgentTurn()` and `agentListener.onAssistantMessageStart()` before the events flow
5. Move `agentListener.onAssistantMessageFinish()` and `history.endAgentTurn()` into `onCompletion`
6. Remove all calls to `startAgentTurnIfNeeded()` from event handlers
7. Remove the call to `endAgentTurnIfNeeded()` from the tool call event handler

## Acceptance Criteria

1. ✅ `startAgentTurn()` is called exactly once before processing LLM events
2. ✅ `endAgentTurn()` is called exactly once in `onCompletion`
3. ✅ The `addedMessage` flag is completely removed
4. ✅ Helper functions `startAgentTurnIfNeeded()` and `endAgentTurnIfNeeded()` are removed
5. ✅ No conditional logic around `startAgentTurn()` / `endAgentTurn()` calls
6. ✅ Code compiles without errors
7. ✅ Event handling logic is simplified (no more conditional start/end calls in event handlers)
8. ✅ `agentListener.onAssistantMessageStart()` and `agentListener.onAssistantMessageFinish()` are called in sync with history methods
