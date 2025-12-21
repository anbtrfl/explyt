# Task 05: Rename AgentListener Methods to Match Agent Turn Lifecycle

## Goal
Rename `onAssistantMessageStart()` and `onAssistantMessageFinish()` in AgentListener to better reflect the agent turn lifecycle semantics.

## Description
After the refactoring in Task 01, the methods `onAssistantMessageStart()` and `onAssistantMessageFinish()` are now called in sync with `startAgentTurn()` and `endAgentTurn()`. The current names suggest they are about "messages" but they actually represent the agent turn lifecycle.

The new names should:
1. Better reflect that they mark the start and end of an agent turn
2. Be consistent with the `startAgentTurn()` / `endAgentTurn()` naming in MutableHistory
3. Make the code more readable and self-documenting

## Proposed Renaming

### Option A (Recommended): Match MutableHistory naming
- `onAssistantMessageStart()` → `onAgentTurnStart()`
- `onAssistantMessageFinish()` → `onAgentTurnEnd()`

**Rationale:** Directly mirrors the MutableHistory methods, making the relationship clear.

### Option B: Use "Started/Finished" suffix
- `onAssistantMessageStart()` → `onAgentTurnStarted()`
- `onAssistantMessageFinish()` → `onAgentTurnFinished()`

**Rationale:** Past tense indicates the event has occurred.

### Option C: Keep "Assistant" terminology
- `onAssistantMessageStart()` → `onAssistantTurnStart()`
- `onAssistantMessageFinish()` → `onAssistantTurnEnd()`

**Rationale:** Maintains consistency with "assistant" terminology used elsewhere.

## Caveats & Key Points

### Breaking Change
This is a breaking change that will affect all implementations of AgentListener:
- All implementations must be updated
- All call sites must be updated
- The IDE's "Rename" refactoring should handle most of this automatically

### Consistency
After renaming, the lifecycle will be:
```kotlin
history.startAgentTurn()
agentListener.onAgentTurnStart()  // or chosen name

// ... process events ...

agentListener.onAgentTurnEnd()  // or chosen name
history.endAgentTurn()
```

### Implementations to Update
Search for all implementations of AgentListener:
- MessageListViewModel (likely the main implementation)
- Any test implementations
- Any other custom listeners

## Main Changes

### File: `platform/agent-api/src/main/kotlin/com/explyt/agent/v4/AgentListener.kt`

**Changes:**
1. Rename `onAssistantMessageStart()` to the chosen name
2. Rename `onAssistantMessageFinish()` to the chosen name
3. Update the CompositeAgentListener implementation

### File: `platform/agent-api/src/main/kotlin/com/explyt/agent/v4/AgentExecutor.kt`

**Changes:**
1. Update call to `agentListener.onAssistantMessageStart()` (before events flow)
2. Update call to `agentListener.onAssistantMessageFinish()` (in onCompletion)

### Other Files
Use IDE's "Find Usages" to locate all implementations and call sites:
- Search for `onAssistantMessageStart`
- Search for `onAssistantMessageFinish`
- Update all occurrences

## Acceptance Criteria

1. ✅ Methods renamed in AgentListener interface
2. ✅ CompositeAgentListener updated
3. ✅ AgentExecutor call sites updated
4. ✅ All implementations of AgentListener updated
5. ✅ All test implementations updated
6. ✅ Code compiles without errors
7. ✅ All tests pass
8. ✅ Method names clearly reflect agent turn lifecycle semantics

## Decision Required

Before implementing this task, decide which naming option to use (A, B, or C).
Document the decision in CONTEXT.md before proceeding.
