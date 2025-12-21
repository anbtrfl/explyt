# Task 04: Refactor Converter Usages

## Goal

Update all existing usages of the removed `toAiMessage()` and `toAgentMessage()` methods to use the safer list-based conversion functions `toAiMessages()` and `toAgentMessages()`.

## Description

In Task 03, we removed the dangerous single-message conversion methods (`Message.toAiMessage()` and `AiMessage.toAgentMessage()`) because they were too easy to misuse and couldn't properly handle the unified `Message.AgentTurn` model. These methods have been replaced with `AgentMessagesConverter.toAiMessages()` and `AgentMessagesConverter.toAgentMessages()` object methods.

Now we need to find and update all existing usages in the codebase to use the new converter object methods.

## Known Usages

Based on the search results, there is at least one usage to fix:

1. **File:** `platform/agent-api/src/test/kotlin/com/explyt/agent/utils/OpenAITestProvider.kt`
   - **Line 58:** `val aiMessages = messages.map { it.toAiMessage() }`
   - **Fix:** Change to `val aiMessages = AgentMessagesConverter.toAiMessages(messages)`

## Search Strategy

Search for the following patterns in the `agent-api` module:
- `.toAiMessage()`
- `.toAgentMessage()`
- `.map { it.toAiMessage() }`
- `.map { it.toAgentMessage() }`

## Main Changes

### Pattern 1: Single message conversion
```kotlin
// OLD (REMOVED)
val aiMessage = message.toAiMessage()

// NEW - wrap in list and use object method
val aiMessages = AgentMessagesConverter.toAiMessages(listOf(message))
val aiMessage = aiMessages.single() // or .first() if appropriate
```

### Pattern 2: List mapping
```kotlin
// OLD (REMOVED)
val aiMessages = messages.map { it.toAiMessage() }

// NEW - use converter object
val aiMessages = AgentMessagesConverter.toAiMessages(messages)
```

### Pattern 3: Single AI message to agent
```kotlin
// OLD (REMOVED)
val agentMessage = aiMessage.toAgentMessage()

// NEW - wrap in list and use object method
val agentMessages = AgentMessagesConverter.toAgentMessages(listOf(aiMessage))
val agentMessage = agentMessages.single() // or .first() if appropriate
```

### Pattern 4: List mapping from AI
```kotlin
// OLD (REMOVED)
val agentMessages = aiMessages.map { it.toAgentMessage() }

// NEW - use converter object
val agentMessages = AgentMessagesConverter.toAgentMessages(aiMessages)
```

## Caveats & Key Points

- **Critical:** The list converters handle AgentTurn splitting/merging correctly, which single-message conversion cannot do
- **Critical:** When converting a single message, you may get multiple AI messages back (if AgentTurn has tool responses)
- **Critical:** When converting AI messages, consecutive ASSISTANT + TOOL messages will be merged into one AgentTurn
- Be careful with `.single()` vs `.first()` - use `.single()` only when you're certain there's exactly one result
- Consider if the code logic needs to change to handle multiple messages properly

## Acceptance Criteria

- [ ] All usages of `.toAiMessage()` are replaced with `AgentMessagesConverter.toAiMessages()`
- [ ] All usages of `.toAgentMessage()` are replaced with `AgentMessagesConverter.toAgentMessages()`
- [ ] All usages of `.map { it.toAiMessage() }` are replaced with `AgentMessagesConverter.toAiMessages()`
- [ ] All usages of `.map { it.toAgentMessage() }` are replaced with `AgentMessagesConverter.toAgentMessages()`
- [ ] Code handles the possibility of multiple messages from AgentTurn splitting
- [ ] Code handles the merging of consecutive ASSISTANT + TOOL messages
- [ ] All files compile without errors
- [ ] Tests pass (if any)

## Testing

After making changes, verify:
1. The code compiles without errors
2. Run any affected tests to ensure they still pass
3. Check that the conversion logic produces the expected results
