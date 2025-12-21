# Message to MessageNew Migration - Task Breakdown

## Overview

This directory contains a complete task breakdown for migrating from the old `Message` model to the new `MessageNew` model in the `agent-api` module. The migration involves renaming `MessageNew` to `Message`, removing the old `Message` (renamed to `MessageOld`), and fixing all compilation errors.

## Key Architectural Change

**Old Model:** Tool calls and responses were in separate messages (`AssistantMessage` + `ToolResponseMessage`)

**New Model:** Tool calls and responses are unified in a single `AgentTurn` message, making agent turns atomic and self-contained.

## Task List (9 Tasks)

### Phase 1: Foundation (Tasks 1-2)
1. **task-01-rename-messagenew-to-message.md** - Rename MessageNew → Message, Message → MessageOld
2. **task-02-migrate-message-kt-utilities.md** - Update utility functions in Message.kt

### Phase 2: Core Infrastructure (Tasks 3-4)
3. **task-03-migrate-converter-utils.md** - Update AI client message conversions
4. **task-04-migrate-history-and-validator.md** - Update History interface and validation logic

### Phase 3: Feature Migration (Tasks 5-7)
5. **task-05-migrate-state-transition-tool.md** - Simplify state transition tool call matching
6. **task-06-migrate-agent-states-feature.md** - Update system reminder injection
7. **task-07-migrate-facts-feature.md** - Update fact injection logic

### Phase 4: Cleanup (Tasks 8-9)
8. **task-08-migrate-remaining-files.md** - Update remaining utility files
9. **task-09-remove-messageold-and-cleanup.md** - Remove MessageOld and finalize

## Files to Migrate (12 files)

1. `llm/Message.kt` - Core message definitions
2. `utils/AgentAiConverterUtils.kt` - Conversion utilities
3. `v4/History.kt` - History interface and validation
4. `v4/features/states/StateTransitionTool.kt` - State transition logic
5. `v4/features/states/AgentStatesFeature.kt` - State management
6. `v4/features/Facts.kt` - Fact injection
7. `utils/HistoryUtils.kt` - History utilities
8. `AgentState.kt` - State interface
9. `v4/LlmQuery.kt` - Query data structure
10. `v4/features/AgentStatsCollector.kt` - Statistics
11. `v4/features/states/AgentConfigV4.kt` - Configuration
12. `executor/impl/extensions/HistoryCompressor.kt` - Compression interface

## How to Execute

### For Each Task:

1. Read `CONTEXT.md` for background and progress
2. Read the specific task file (e.g., `task-01-*.md`)
3. Execute the changes as specified
4. Provide a **brief summary** (3-5 bullet points)
5. Update `CONTEXT.md` with your progress
6. Wait for user approval
7. Commit with format: `[Task XX] Description`

### Using the Prompt Template:

Copy the content from `PROMPT_TEMPLATE.md` and provide it to the coding agent along with the specific task number.

Example:
```
[Paste PROMPT_TEMPLATE.md content]

Execute Task 01: Rename MessageNew to Message and Create MessageOld
```

## Key Benefits of New Model

✅ **Atomic Agent Turns** - Each AgentTurn is self-contained with all tool calls and responses
✅ **Simpler Matching** - No need to match tool call IDs across separate messages
✅ **Better Validation** - Can validate completeness within a single message
✅ **Clearer Semantics** - One agent turn = one message, regardless of tool usage

## Important Notes

- All work is confined to the `agent-api` module
- Each task should be independently compilable
- Tasks build on each other - execute sequentially
- Both models exist temporarily during migration
- Final task removes the old model completely

## Progress Tracking

See `CONTEXT.md` for real-time progress updates from agents executing tasks.
