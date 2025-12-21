# Task 03: Migrate AgentAiConverterUtils.kt

## Goal

Update conversion functions between agent `Message` types and AI client `AiMessage` types to work with the new unified `Message.AgentTurn` model.

## Description

The `AgentAiConverterUtils.kt` file contains bidirectional conversion logic:
- `Message.toAiMessage()` - converts agent messages to AI client format
- `AiMessage.toAgentMessage()` - converts AI client messages to agent format

The key challenge: The new `Message.AgentTurn` combines assistant message + tool responses, but the AI client still uses separate message types. We need to handle splitting/merging during conversion.

## Caveats & Key Points

- **Critical:** AI client uses separate messages for assistant and tool responses
- **Critical:** `Message.AgentTurn` may have tool calls without responses (during streaming)
- When converting `Message.AgentTurn` → `AiMessage`, may need to generate multiple AI messages
- When converting `AiMessage` → `Message`, need to merge assistant + tool messages into `AgentTurn`
- The conversion must handle the `reasoning` field properly
- Must handle empty/null content fields (new model has defaults)

## Main Changes

**File:** `platform/agent-api/src/main/kotlin/com/explyt/agent/utils/AgentAiConverterUtils.kt`

### Current Implementation (lines 22-48):

```kotlin
fun Message.toAiMessage(): AiMessage = when (this) {
    is Message.AssistantMessage -> AiMessage.assistant(content, emptyList(), toolCalls.map(...))
    is Message.SystemMessage -> AiMessage.system(content)
    is Message.ToolResponseMessage -> AiMessage.tool(toolResponses.map(...))
    is Message.UserMessage -> AiMessage.userWithImages(...)
}

fun AiMessage.toAgentMessage(): Message = when (type) {
    MessageType.SYSTEM -> Message.SystemMessage(content)
    MessageType.USER -> Message.UserMessage(content, imageParts().map(...))
    MessageType.ASSISTANT -> Message.AssistantMessage(content, toolCalls.map(...))
    MessageType.TOOL -> Message.ToolResponseMessage(toolResponses.map(...))
}
```

### New Implementation Strategy:

1. **Change imports:** `MessageOld` → `Message`

2. **Update `Message.toAiMessage()`:**
   - `Message.AgentTurn` → `AiMessage.assistant()` (tool calls without responses)
   - Note: Tool responses are NOT converted here (they're embedded in AgentTurn)
   - Handle nullable `content` and `reasoning` fields

3. **Update `AiMessage.toAgentMessage()`:**
   - `MessageType.ASSISTANT` → `Message.AgentTurn` with tool calls (responses = null)
   - `MessageType.TOOL` → This is tricky! Need context to merge with previous AgentTurn
   - May need to change signature or add helper function

4. **Consider adding:** `List<AiMessage>.toAgentMessages()` to handle merging

### Example New Implementation:

```kotlin
fun Message.toAiMessage(): AiMessage = when (this) {
    is Message.AgentTurn -> {
        val toolCallsWithoutResponses = toolCalls.map { 
            AiToolCall(it.id, it.name, it.arguments) 
        }
        AiMessage.assistant(
            content ?: "", 
            emptyList(), 
            toolCallsWithoutResponses
        )
    }
    is Message.SystemMessage -> AiMessage.system(content)
    is Message.UserMessage -> AiMessage.userWithImages(...)
}

// May need a new function for converting lists
fun List<Message>.toAiMessages(): List<AiMessage> = flatMap { message ->
    when (message) {
        is Message.AgentTurn -> {
            val assistantMsg = AiMessage.assistant(
                message.content ?: "",
                emptyList(),
                message.toolCalls.map { AiToolCall(it.id, it.name, it.arguments) }
            )
            val toolResponses = message.toolCalls.mapNotNull { it.response }
            if (toolResponses.isNotEmpty()) {
                listOf(
                    assistantMsg,
                    AiMessage.tool(toolResponses.map { it.toAiToolResponse() })
                )
            } else {
                listOf(assistantMsg)
            }
        }
        else -> listOf(message.toAiMessage())
    }
}
```

## Acceptance Criteria

- [ ] Import changed from `MessageOld` to `Message`
- [ ] `Message.toAiMessage()` handles `Message.AgentTurn` correctly
- [ ] Conversion handles nullable `content` and `reasoning` fields
- [ ] Tool calls are converted without responses (responses stay in AgentTurn)
- [ ] `AiMessage.toAgentMessage()` creates `Message.AgentTurn` for assistant messages
- [ ] Consider adding list conversion function if needed
- [ ] File compiles without errors
- [ ] All existing helper functions updated (toAiToolCall, toAgentToolCall, etc.)
