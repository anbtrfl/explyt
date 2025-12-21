# Agent Turn Lifecycle Refactoring - Context

## Project Overview
This refactoring simplifies the agent turn lifecycle in the Explyt Agent API by ensuring `startAgentTurn()` and `endAgentTurn()` are always called for every LLM query, eliminating conditional logic.

## Current Structure (Before Refactoring)

### AgentExecutor Event Handling
```kotlin
var addedMessage = false

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

events
    .onEach { event ->
        when (event) {
            is LlmReasoningEvent -> {
                startAgentTurnIfNeeded()  // Conditional
                onLlmReasoningEvent(event)
            }
            is LlmTextEvent -> {
                startAgentTurnIfNeeded()  // Conditional
                onLlmTextEvent(event)
            }
            is LlmToolCallEvent -> {
                endAgentTurnIfNeeded()  // Conditional
                onLlmToolCallEvent(event)
            }
        }
    }
    .onCompletion {
        endAgentTurnIfNeeded()  // Conditional
    }
    .collect()
```

### Issues with Current Approach
1. **Conditional Logic** - `startAgentTurn()` and `endAgentTurn()` are called conditionally based on event types
2. **State Management** - Requires `addedMessage` flag to track whether an agent turn was started
3. **Complexity** - Helper functions add cognitive overhead
4. **Inconsistency** - Agent turns are only created when text/reasoning events occur

## Target Structure (After Refactoring)

### Simplified Event Handling
```kotlin
history.startAgentTurn()
agentListener.onAssistantMessageStart()

events
    .onEach { event ->
        when (event) {
            is LlmReasoningEvent -> onLlmReasoningEvent(event)
            is LlmTextEvent -> onLlmTextEvent(event)
            is LlmToolCallEvent -> onLlmToolCallEvent(event)
        }
    }
    .onCompletion {
        agentListener.onAssistantMessageFinish()
        history.endAgentTurn()
    }
    .collect()
```

### Benefits
1. **Simplicity** - No conditional logic, no state tracking
2. **Consistency** - Every LLM query creates an agent turn
3. **Predictability** - Always know when agent turns are created
4. **Easier to Reason About** - Clear lifecycle: start → events → end

## Rationale

### Why Always Create Agent Turns?
1. **Simplifies Code** - Removes conditional logic and state management
2. **Consistent Behavior** - Every LLM query has the same lifecycle
3. **Empty Turns Are Valid** - An agent turn with no content/reasoning/tool calls is a valid state
4. **Better Error Handling** - `onCompletion` ensures `endAgentTurn()` is always called, even on errors

### Empty Agent Turns
After this refactoring, it's possible to have empty agent turns:
```kotlin
Message.AgentTurn(
    content = null,
    reasoning = null,
    toolCalls = emptyList()
)
```

This is acceptable because:
- The LLM was queried but returned nothing
- The history accurately reflects what happened
- The validator treats empty turns the same as text-only turns

## Key Architectural Decisions

### MutableHistory Interface
The `MutableHistory` interface defines the agent turn lifecycle:
```kotlin
interface MutableHistory : History {
    suspend fun startAgentTurn()
    suspend fun appendReasoningToken(token: String)
    suspend fun appendResponseToken(token: String)
    suspend fun appendToolCallStarted(toolCall: Message.AgentTurn.ToolCall)
    suspend fun appendToolCallFinished(toolCallId: String, response: ToolCallResponse)
    suspend fun endAgentTurn()
}
```

### History Validator
The `HistoryValidator` validates the message sequence:
- Empty agent turns should be treated like text-only agent turns
- They transition to `Status.UserTurnAfterAssistantWithoutTools`
- They are NOT marked as corrupted

### Agent Listener
The `AgentListener` is notified of agent turn lifecycle events:
- `onAssistantMessageStart()` - called when agent turn starts
- `onAssistantMessageFinish()` - called when agent turn ends
- These should be called in sync with `startAgentTurn()` / `endAgentTurn()`

## Important Files

### Core Files
- `platform/agent-api/src/main/kotlin/com/explyt/agent/v4/AgentExecutor.kt` - Main execution loop
- `platform/agent-api/src/main/kotlin/com/explyt/agent/v4/History.kt` - MutableHistory interface and validator
- `platform/agent-api/src/main/kotlin/com/explyt/agent/llm/Message.kt` - Message definitions

### Implementation Files
- `platform/ij-chat-v3/src/main/kotlin/com/explyt/chat/v4/presentation/vm/MessageListViewModel.kt` - MutableHistory implementation
- `platform/ij-chat-v3/src/main/kotlin/com/explyt/chat/v4/presentation/vm/AssistantMessageViewModel.kt` - Assistant message view model
- `platform/ij-chat-v3/src/main/kotlin/com/explyt/chat/v4/presentation/vm/MessageListUtils.kt` - Conversion utilities

### Test Files
- `platform/agent-api/src/test/kotlin/com/explyt/agent/v4/HistoryValidatorTest.kt` - Validator tests

## Dependencies Between Tasks

1. **Task 01** must be completed first - it changes the core AgentExecutor logic
2. **Task 02** should be done after Task 01 - verifies the validator handles empty turns
3. **Task 03** should be done after Task 01 - updates tests to match new behavior
4. **Task 04** should be done after Task 01 - verifies implementations handle empty turns
5. **Task 05** should be done after Task 01 - renames AgentListener methods to match the new lifecycle

Tasks 02, 03, 04, and 05 can be done in parallel after Task 01 is complete.

## Progress Tracking

### Completed Tasks
- ✅ Task 01: Refactor AgentExecutor to Always Call startAgentTurn/endAgentTurn
- ✅ Task 02: Verify History Validator Handles Empty Agent Turns
- ✅ Task 03: Update Tests for Always-Created Agent Turns
- ✅ Task 04: Verify MutableHistory Implementations Handle Empty Agent Turns
- ✅ Task 05: Rename AgentListener Methods to Match Agent Turn Lifecycle

### Current Task
All tasks completed!

## Key Learnings

### Task 01 - AgentExecutor Refactoring
- Successfully removed all conditional logic around `startAgentTurn()` and `endAgentTurn()`
- Eliminated `addedMessage` flag and helper functions (`startAgentTurnIfNeeded()`, `endAgentTurnIfNeeded()`)
- Simplified event handling - no more conditional calls in event handlers
- The refactoring was straightforward with no compilation errors
- Every LLM query now creates an agent turn unconditionally

### Task 02 - History Validator Verification
- Verified that HistoryValidator correctly handles empty agent turns
- The condition `message.toolCalls.isEmpty()` properly transitions to `Status.UserTurnAfterAssistantWithoutTools`
- Empty agent turns (content = null, reasoning = null, toolCalls = emptyList()) are treated the same as text-only agent turns
- Added three new tests to explicitly verify empty agent turn edge cases
- All tests pass - no code changes to the validator were needed

### Task List Changes After Task 02
- Added Task 05: Rename AgentListener Methods to Match Agent Turn Lifecycle
- Rationale: After Task 01, `onAssistantMessageStart()` and `onAssistantMessageFinish()` are called in sync with `startAgentTurn()` / `endAgentTurn()`, but the names don't reflect this relationship
- The new task will rename these methods to better match the agent turn lifecycle semantics

### Task 03 - Update Tests for Always-Created Agent Turns
- Verified all tests in agent-api module pass after Task 01 refactoring
- Verified all tests in ij-chat-v3 module pass
- No tests were found that directly test AgentExecutor or mock startAgentTurn/endAgentTurn
- Empty agent turn tests were already added in Task 02
- No test updates were needed - all existing tests are compatible with the new behavior

### Task 04 - Verify MutableHistory Implementations Handle Empty Agent Turns
- Reviewed MessageListViewModel implementation of MutableHistory
- Found issue in MessageListUtils.toAgentLibMessages(): empty strings were used instead of null
- Fixed: Convert empty strings to null for content and reasoning fields
- AssistantMessageViewModel initializes with empty strings ("") for content/reasoning
- When no tokens are appended, these remain empty strings
- The conversion now properly uses null for empty content/reasoning
- All tests pass after the fix

### Task 05 - Rename AgentListener Methods to Match Agent Turn Lifecycle
- Decision: Used Option A (recommended) - match MutableHistory naming
- Renamed `onAssistantMessageStart()` → `onAgentTurnStart()`
- Renamed `onAssistantMessageFinish()` → `onAgentTurnEnd()`
- Updated AgentListener interface and CompositeAgentListener
- Updated AgentExecutor call sites
- Updated AgentStatsCollector implementation
- Method names now clearly reflect agent turn lifecycle semantics
- All tests pass after renaming

## Issues Encountered

### Task 01
No issues encountered. The refactoring was clean and straightforward.

### Task 02
No issues encountered. The validator already handles empty agent turns correctly.

### Task 03
No issues encountered. All existing tests pass without modifications.

### Task 04
Found and fixed issue where empty strings were used instead of null for empty agent turn content/reasoning.

### Task 05
No issues encountered. Renaming was straightforward and all tests pass.
