# Task 05: Migrate StateTransitionTool.kt

## Goal

Update the state transition tool logic to work with the new `Message.AgentTurn` model, simplifying the tool call/response matching logic.

## Description

The `StateTransitionTool.kt` file contains logic to find the current agent state by looking at the last successful state transition tool call. Currently, it:

1. Finds tool responses in `ToolResponseMessage` 
2. Matches them with tool calls in `AssistantMessage` by ID
3. Parses the arguments to get the target state

With the new model, this becomes much simpler since tool calls and responses are in the same `AgentTurn` message.

## Caveats & Key Points

- **Major simplification:** No more cross-message ID matching needed
- Tool calls with responses are already paired in `AgentTurn.ToolCall`
- Still need to parse JSON arguments from tool call
- Still need to handle serialization exceptions
- The `findCurrentState()` function is the main focus
- The `createToolDefinition()` functions should work unchanged

## Main Changes

**File:** `platform/agent-api/src/main/kotlin/com/explyt/agent/v4/features/states/StateTransitionTool.kt`

### Current Implementation (lines 56-78):

```kotlin
fun findCurrentState(
    config: AgentConfigV4,
    messages: List<Message>,
): AgentStateConfig? {
    val stateName = messages
        .flatMap { (it as? Message.ToolResponseMessage)?.toolResponses.orEmpty() }
        .lastOrNull { it.name == TOOL_NAME && it.response is SuccessToolCallResponse }
        ?.id // id of last successful state transition tool call
        ?.let { id ->
            val toolCalls = messages.flatMap { (it as? Message.AssistantMessage)?.toolCalls.orEmpty() }
            val toolCall = toolCalls.firstOrNull { it.id == id } ?: return@let null
            try {
                val parsedArgs = json.decodeFromString<StateTransitionToolArgsV4>(toolCall.arguments)
                parsedArgs.targetState
            } catch (_: SerializationException) {
                null
            }
        } ?: config.initialStateName
    val state = config.states.firstOrNull { it.name == stateName }
    return state
}
```

### New Implementation:

```kotlin
fun findCurrentState(
    config: AgentConfigV4,
    messages: List<Message>,
): AgentStateConfig? {
    val stateName = messages
        .filterIsInstance<Message.AgentTurn>()
        .flatMap { it.toolCalls }
        .lastOrNull { toolCall ->
            toolCall.name == TOOL_NAME && 
            toolCall.response?.response is SuccessToolCallResponse
        }
        ?.let { toolCall ->
            try {
                val parsedArgs = json.decodeFromString<StateTransitionToolArgsV4>(toolCall.arguments)
                parsedArgs.targetState
            } catch (_: SerializationException) {
                null
            }
        } ?: config.initialStateName
    
    return config.states.firstOrNull { it.name == stateName }
}
```

### Key Improvements:

1. **Single pass:** Only iterate through `AgentTurn` messages
2. **No ID matching:** Tool call and response are already paired
3. **Simpler logic:** Direct access to `toolCall.response`
4. **Clearer intent:** The code directly expresses what we're looking for

### Other Changes:

- Update import: `MessageOld` → `Message`
- Verify `createToolDefinition()` functions still work (they should - they only use `List<Message>` parameter)

## Acceptance Criteria

- [ ] Import changed from `MessageOld` to `Message`
- [ ] `findCurrentState()` updated to use `Message.AgentTurn`
- [ ] No more cross-message tool call/response matching
- [ ] Tool call response accessed via `toolCall.response?.response`
- [ ] Serialization exception handling preserved
- [ ] `createToolDefinition()` functions unchanged (or minimally changed)
- [ ] File compiles without errors
- [ ] Logic is simpler and more readable than before
