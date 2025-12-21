# Task 07: Migrate Facts.kt

## Goal

Update the Facts feature to work with the new `Message` model, particularly the fact injection logic for user messages.

## Description

The `Facts.kt` file provides a system for injecting contextual facts into system messages and user messages. The main changes needed:

1. Update imports from `MessageOld` to `Message`
2. Update type checks for `Message.UserMessage` and `Message.SystemMessage`
3. Ensure fact injection logic works with the new message structure

This is a relatively straightforward migration since Facts only deals with `UserMessage` and `SystemMessage`, which haven't changed structurally.

## Caveats & Key Points

- `UserMessage` and `SystemMessage` have the same structure in both models
- The main change is just updating imports and type references
- The `FactQueryMapper.map()` function is the core logic
- Need to handle the case where `content` field has default value of `""` in new model
- The `insertContentFromFacts()` function should work unchanged

## Main Changes

**File:** `platform/agent-api/src/main/kotlin/com/explyt/agent/v4/features/Facts.kt`

### Changes Required:

1. **Update imports (lines 3-4):**
```kotlin
// Old
import com.explyt.agent.llm.Message
import com.explyt.agent.llm.Message.SystemMessage

// New
import com.explyt.agent.llm.Message
import com.explyt.agent.llm.Message.SystemMessage
```
(Should be the same, but verify `Message` refers to new model)

2. **Update type checks (lines 42-43, 53-56):**

**Current:**
```kotlin
val systemMessage = query.chatHistory.firstOrNull() as? SystemMessage
    ?: SystemMessage(content = "").also {
        updatedChatHistory.addFirst(it)
    }

val lastUserMessage = query.chatHistory
    .lastOrNull() as? Message.UserMessage
    ?: return updatedQuery
```

**New:**
```kotlin
val systemMessage = query.chatHistory.firstOrNull() as? SystemMessage
    ?: SystemMessage(content = "").also {
        updatedChatHistory.addFirst(it)
    }

val lastUserMessage = query.chatHistory
    .lastOrNull() as? Message.UserMessage
    ?: return updatedQuery
```

(Should be identical, just verify it compiles with new `Message`)

3. **Verify default values:**
   - New `SystemMessage` has `content: String = ""`
   - New `UserMessage` has `content: String = ""`
   - This is compatible with existing logic

## Acceptance Criteria

- [ ] Imports reference new `Message` model
- [ ] Type checks for `Message.UserMessage` compile correctly
- [ ] Type checks for `Message.SystemMessage` compile correctly
- [ ] `FactQueryMapper.map()` function works correctly
- [ ] Fact injection into system message works
- [ ] Fact injection into last user message works
- [ ] Handles empty content fields correctly
- [ ] File compiles without errors
- [ ] All tests pass (if any exist for this feature)
