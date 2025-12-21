# Task 05c: Migrate AgentStatesFeature to Structured Prompt API

## Goal

Migrate `AgentStatesFeature.kt` to use the structured prompt building API instead of manipulating raw message content strings.

**Task Type:** Code Modification

## Description

The `AgentStatesFeature` currently converts `StructuredLlmQuery` to `LlmQuery` and manipulates message content using string operations (`modifyOrCreateSystemMessage`, `withSystemReminder`, `withSystemReminderOnLastToolCall`). This defeats the purpose of structured prompts and should be migrated to use the structured API.

**Current Pattern:**
```kotlin
QueryMapper { query ->
    val llmQuery = query.toLlmQuery()
    val currentState = StateTransitionUtils.findCurrentState(agentConfig, llmQuery.chatHistory)
    
    val history = llmQuery
        .chatHistory
        .modifyOrCreateSystemMessage { oldSystemPrompt ->
            buildNewSystemPrompt(oldSystemPrompt, agentConfig, currentState)
        }
        .withSystemReminder(currentState)
    
    llmQuery.copy(chatHistory = history, toolDefinitions = toolDefinitions).toStructured()
}
```

**Target Pattern:**
```kotlin
QueryMapper { query ->
    val llmQuery = query.toLlmQuery()
    val currentState = StateTransitionUtils.findCurrentState(agentConfig, llmQuery.chatHistory)
    
    query.toBuilder()
        .addToSystemMessage {
            section(tag = "state_management") {
                content(buildStateManagementContent(agentConfig, currentState))
            }
        }
        .modifyLastAgentTurn { agentTurn ->
            // Add system reminder to last tool call if needed
            if (currentState != null) {
                addSystemReminderToLastToolCall(agentTurn, currentState)
            }
        }
        .withToolDefinitions(
            if (currentState == null) query.toolDefinitions
            else currentState.toolFilterStrategy(query.toolDefinitions)
        )
        .build()
}
```

## Caveats & Key Points

- ⚠️ **State detection still needs LlmQuery** - `StateTransitionUtils.findCurrentState()` works with raw messages
- ⚠️ **System reminder on tool calls** - Need to handle `withSystemReminderOnLastToolCall` properly
- 💡 Use structured sections for state management content
- 💡 May need to add new builder methods for modifying agent turns
- 🔍 Ensure state transitions still work correctly after migration
- 🔍 Test with actual state transitions to verify behavior

## Main Changes

**Files to Modify:**

1. **AgentStatesFeature.kt**
   - Update `createAgentsStatesQueryMapper()` to use structured API
   - Replace `modifyOrCreateSystemMessage` with `addToSystemMessage`
   - Replace `withSystemReminder` with structured approach
   - Keep `buildNewSystemPrompt()` but adapt to return structured content
   - Keep `commonInstructionsForSystemPrompt()` but adapt to return structured content

2. **StructuredPromptBuilder.kt** (if needed)
   - Add `modifyLastAgentTurn()` method if not present
   - Add `withToolDefinitions()` method if not present
   - Add any other missing builder methods

## Acceptance Criteria

- [ ] `AgentStatesFeature.createAgentsStatesQueryMapper()` uses structured API
- [ ] No conversion to/from `LlmQuery` for prompt manipulation (only for state detection)
- [ ] State management content added as structured sections
- [ ] System reminders handled properly on tool calls
- [ ] Tool filtering still works correctly
- [ ] All code compiles without errors
- [ ] Comprehensive KDoc comments added/updated
- [ ] Code follows Kotlin best practices
- [ ] No nested constructions (per user rules)

## Related Tasks

- **Depends on:** Task 05a
- **Blocks:** Task 06

## Additional Notes

This task addresses the issue where `AgentStatesFeature` was temporarily updated to work with `StructuredLlmQuery` by converting to/from `LlmQuery`. The proper solution is to use the structured API throughout.

The key insight is that state management content should be added as structured sections, not by manipulating raw strings. This makes the prompts inspectable and maintainable.

Note: State detection (`StateTransitionUtils.findCurrentState()`) may still need to work with raw messages since it analyzes the conversation history. This is acceptable - the migration focuses on prompt *building*, not state *detection*.
