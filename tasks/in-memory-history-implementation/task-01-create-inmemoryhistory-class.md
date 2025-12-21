# Task 01: Create InMemoryHistory Class

## Goal

Implement a simple in-memory implementation of the `MutableHistory` interface that stores messages in a mutable list and handles agent turn lifecycle correctly.

**Task Type:** Code Modification

## Description

Create a new class `InMemoryHistory` that implements the `MutableHistory` interface. This implementation should:
- Store messages in a mutable list
- Track the current agent turn being built
- Handle all message types (user messages, system messages, agent turns)
- Support streaming token appending (reasoning and response tokens)
- Support tool call lifecycle (started → finished)
- Properly manage agent turn state transitions

The implementation should be straightforward and serve as a reference implementation for testing and simple use cases.

## Caveats & Key Points

- ⚠️ Agent turns must be built incrementally - `startAgentTurn()` creates a new turn, tokens are appended, then `endAgentTurn()` finalizes it
- ⚠️ Tool calls follow a two-phase lifecycle: first `appendToolCallStarted()`, then `appendToolCallFinished()` with the result
- ⚠️ The implementation should be thread-safe for suspend functions (use appropriate synchronization if needed)
- 💡 Keep the implementation simple - this is meant to be a reference implementation
- 🔍 Consider edge cases: what happens if `appendResponseToken()` is called before `startAgentTurn()`?

## Main Changes

**New Files:**
- `platform/agent-api/src/main/kotlin/com/explyt/agent/v4/InMemoryHistory.kt` - The main implementation class

**Components/Classes:**
- `InMemoryHistory` - Implements `MutableHistory` interface
  - Private mutable list to store messages
  - Private nullable field to track current agent turn being built
  - All interface methods implemented

**Key Implementation Details:**
- `messages` property returns an immutable copy/view of the internal list
- `startAgentTurn()` initializes a new `Message.AgentTurn` with empty content
- `appendReasoningToken()` and `appendResponseToken()` append to the current turn
- `appendToolCallStarted()` adds a tool call with null response to the current turn
- `appendToolCallFinished()` finds the tool call by ID and updates its response
- `endAgentTurn()` adds the completed turn to the messages list

## Acceptance Criteria

- [ ] `InMemoryHistory` class created and implements `MutableHistory`
- [ ] All interface methods are implemented
- [ ] Code compiles without errors
- [ ] Implementation handles agent turn lifecycle correctly
- [ ] Implementation handles tool call lifecycle correctly
- [ ] Code follows Kotlin best practices (immutability where appropriate, clear naming)

## Related Tasks

- **Blocks:** Task 02 (tests depend on this implementation)

## Additional Notes

Consider using a factory function or companion object method for easy instantiation:
```kotlin
fun InMemoryHistory(initialMessages: List<Message> = emptyList()): InMemoryHistory
```

This will make testing easier and provide a clean API for users.
