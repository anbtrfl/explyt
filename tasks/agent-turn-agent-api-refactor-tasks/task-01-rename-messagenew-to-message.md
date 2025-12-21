# Task 01: Rename MessageNew to Message and Create MessageOld

## Goal

Prepare for migration by renaming `MessageNew` to `Message` and preserving the old `Message` as `MessageOld` to maintain compilation during incremental migration.

## Description

This is the foundational task that sets up the migration. We need to:

1. Rename the existing `Message` sealed interface to `MessageOld`
2. Rename `MessageNew` sealed interface to `Message`
3. Update all internal references within `Message.kt` file
4. Keep both models available so other files can be migrated incrementally

This creates a clean separation where:
- New code uses `Message` (the new model)
- Old code temporarily uses `MessageOld` (will be removed in final task)
- We can migrate files one by one without breaking the entire module

## Caveats & Key Points

- **DO NOT** change any imports in other files yet - that's for subsequent tasks
- The `Message.kt` file itself should only reference the new `Message` types
- Ensure all nested types are properly renamed:
  - `MessageOld.UserMessage`, `MessageOld.SystemMessage`, etc.
  - `Message.UserMessage`, `Message.SystemMessage`, `Message.AgentTurn`
- The `AgentTurn.ToolCall` nested class must be properly defined
- Keep serialization annotations intact

## Main Changes

**File:** `platform/agent-api/src/main/kotlin/com/explyt/agent/llm/Message.kt`

### Changes Required:

1. Rename `sealed interface Message` → `sealed interface MessageOld` (around line 79)
2. Rename all nested classes:
   - `Message.UserMessage` → `MessageOld.UserMessage`
   - `Message.SystemMessage` → `MessageOld.SystemMessage`
   - `Message.AssistantMessage` → `MessageOld.AssistantMessage`
   - `Message.ToolResponseMessage` → `MessageOld.ToolResponseMessage`

3. Rename `sealed interface MessageNew` → `sealed interface Message` (around line 111)
4. Rename all nested classes:
   - `MessageNew.UserMessage` → `Message.UserMessage`
   - `MessageNew.SystemMessage` → `Message.SystemMessage`
   - `MessageNew.AgentTurn` → `Message.AgentTurn`

5. Ensure `Message.AgentTurn.ToolCall` is properly structured with:
   - `id: String`
   - `name: String`
   - `arguments: String`
   - `response: ToolResponse?` (nullable!)

## Acceptance Criteria

- [ ] `MessageOld` sealed interface exists with all 4 message types
- [ ] `Message` sealed interface exists with 3 message types (UserMessage, SystemMessage, AgentTurn)
- [ ] `Message.AgentTurn` contains nested `ToolCall` data class with nullable `response`
- [ ] File compiles without errors
- [ ] All `@Serializable` annotations are preserved
- [ ] No imports in other files are changed yet
