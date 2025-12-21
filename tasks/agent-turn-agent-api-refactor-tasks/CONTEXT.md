# Message to MessageNew Migration Context

## Project Overview

This migration refactors the message model in the `agent-api` module from the old `Message` sealed interface to the new `MessageNew` model. The key architectural change is unifying tool calls and their responses into a single `AgentTurn` message type, rather than having separate `AssistantMessage` and `ToolResponseMessage` types.

## Key Architectural Changes

### Old Model (Message)
- **Message.UserMessage** - User input with images and extra content
- **Message.SystemMessage** - System prompts
- **Message.AssistantMessage** - Assistant response with tool calls and reasoning
- **Message.ToolResponseMessage** - Tool execution results (separate message)

### New Model (MessageNew → Message)
- **Message.UserMessage** - User input (unchanged)
- **Message.SystemMessage** - System prompts (unchanged)
- **Message.AgentTurn** - Combines assistant message + tool calls + tool responses in one atomic unit

### Critical Change: Tool Call/Response Unification

**Before:** Tool calls and responses were in separate messages, requiring ID matching across messages.

**After:** Each `AgentTurn.ToolCall` contains both the call arguments AND the response (nullable), making agent turns atomic and self-contained.

## Migration Strategy

1. Rename `MessageNew` → `Message` and remove old `Message`
2. Migrate files one by one, fixing compilation errors
3. Update type checks: `Message.AssistantMessage` → `Message.AgentTurn`
4. Update tool call/response matching logic (now simpler - no cross-message matching needed)
5. Update history validation logic
6. Update conversion utilities (to/from AI client messages)

## Files Using Message (13 files)

1. `utils/AgentAiConverterUtils.kt` - Conversion to/from AI client messages
2. `AgentState.kt` - State interface using Message in system reminder
3. `v4/features/Facts.kt` - Fact injection into messages
4. `utils/HistoryUtils.kt` - System message modification utilities
5. `executor/impl/extensions/HistoryCompressor.kt` - History compression interface
6. `v4/features/states/AgentConfigV4.kt` - Agent configuration
7. `v4/features/states/AgentStatesFeature.kt` - State management with system reminders
8. `v4/LlmQuery.kt` - Query data structure
9. `v4/features/AgentStatsCollector.kt` - Statistics collection
10. `v4/features/states/StateTransitionTool.kt` - State transition tool (complex tool call/response matching)
11. `v4/History.kt` - History interface and validation
12. `v4/AgentExecutor.kt` - Core agent execution loop (uses old MutableHistory API)
13. `llm/Message.kt` - The message definitions themselves

## Key Constraints

- All changes must be within `agent-api` module
- Maintain backward compatibility during migration (both models exist temporarily)
- Each task should be independently compilable
- Focus on fixing compilation errors systematically

## Progress Tracking

### Completed Tasks
- [x] Task 01: Rename MessageNew to Message and create MessageOld
- [x] Task 02: Migrate Message.kt utility functions
- [x] Task 03: Migrate AgentAiConverterUtils.kt
- [x] Task 03a: Refactor converter usages
- [x] Task 04: Migrate History.kt and HistoryValidator
- [x] Task 05: Migrate StateTransitionTool.kt
- [x] Task 06: Migrate AgentStatesFeature.kt
- [x] Task 06a: Migrate AgentExecutor.kt
- [x] Task 07: Migrate Facts.kt
- [x] Task 08: Migrate remaining utility files
- [x] Task 09: Remove MessageOld and final cleanup
- [x] Task 10: Refactor History Validator tests

### Key Decisions Made
- **Task 01**: Successfully renamed `Message` → `MessageOld` and `MessageNew` → `Message`. Both models now coexist in the same file, allowing incremental migration of other files.
- **Task 02**: Added new utility functions for `Message.AgentTurn.ToolCall` and `Message.AgentTurn` that reuse the existing `ToolResponse.withSystemReminder()` function, maintaining consistency and avoiding code duplication.
- **Task 03**: Updated conversion functions to work with `Message.AgentTurn`. Removed dangerous single-message conversion methods and created `AgentMessagesConverter` object with `toAiMessages()` and `toAgentMessages()` methods. Used `buildList` for both methods for cleaner, more idiomatic code. The converters properly handle splitting AgentTurn into assistant + tool messages and merging them back using backward-looking approach. Changed to use `json` instance from utils instead of `Json` for consistency. Created Task 03a to handle refactoring existing usages.
- **Task 03a**: Refactored all usages of removed single-message conversion methods. Found and updated one usage in `OpenAITestProvider.kt` test file, changing from `.map { it.toAiMessage() }` to `AgentMessagesConverter.toAiMessages()`. No other usages found in the codebase.
- **Task 04**: Migrated `History.kt` and `HistoryValidator` to work with `Message.AgentTurn`. Updated `MutableHistory` interface with new method signatures: `startAgentTurn()`, `endAgentTurn()`, `appendToolCallStarted(Message.AgentTurn.ToolCall)`, and `appendToolCallFinished(toolCallId: String, response: ToolResponse)`. Removed `Status.UnprocessedToolCalls` state and added `CorruptedReason.IncompleteToolCalls`. Simplified validation logic significantly - no more cross-message tool call ID matching needed since tool calls and responses are now unified in `AgentTurn`. Updated helper functions to use new method names.

### Issues Encountered
- **Task 01**: No issues encountered. The renaming was straightforward and compiled without errors.
- **Task 02**: Initial implementation had type confusion between `ToolResponse` and `ToolCallResponse`. Fixed by reusing the existing `ToolResponse.withSystemReminder()` extension function.
- **Task 03**: No issues encountered. The conversion logic was updated smoothly to handle the new AgentTurn model. Removed single-message converters to prevent misuse.
- **Task 03a**: No issues encountered. Only one usage found in test code, which was straightforward to update.
- **Task 04**: No issues encountered. The migration was straightforward and resulted in significantly simpler validation logic. The removal of cross-message tool call tracking eliminated about 15 lines of complex ID matching code.
- **Task 05**: No issues encountered. The migration was straightforward and compiled successfully on the first attempt. The new implementation is cleaner and more readable.
- **Task 06**: No issues encountered. The migration was straightforward and compiled successfully.
- **Task 06a**: No issues encountered. The migration was straightforward and compiled successfully on the first attempt. All method calls were renamed correctly, and the tool call handling was updated to work with both `ToolCall` (for execution) and `Message.AgentTurn.ToolCall` (for history).
- **Task 07**: No migration needed. The Facts.kt file was already using the new `Message` model because the imports were generic (`import com.explyt.agent.llm.Message`). When `MessageNew` was renamed to `Message` in Task 01, this file automatically started using the new model. Verified that the file compiles without errors and has no references to `MessageOld`.
- **Task 09**: No issues encountered. The removal of `MessageOld` was straightforward. The test migration required converting 17 test cases from the old two-message model (separate `AssistantMessage` and `ToolResponseMessage`) to the new unified `AgentTurn` model. The key change was embedding tool responses directly in `Message.AgentTurn.ToolCall` objects instead of having separate messages. Tests for cross-message ID matching were replaced with tests for incomplete tool calls (where `response == null`). All tests compile and pass on the first attempt.

### Important Notes
- **Task 01**: The `Message.AgentTurn.ToolCall` nested class has nullable `response: ToolResponse?` field as required. All `@Serializable` annotations preserved. No imports in other files were changed.
- **Task 02**: The new utility functions properly handle the nullable `response` field in `Message.AgentTurn.ToolCall`. The `withSystemReminderOnLastToolCall()` function updates only the last tool call that has a response, maintaining immutability through copy operations.
- **Task 03**: Created `AgentMessagesConverter` object with two methods: `toAiMessages()` splits AgentTurn into separate assistant and tool messages when tool responses are present. `toAgentMessages()` uses a backward-looking approach: it iterates through AI messages and when it encounters a TOOL message, it looks back at the last result message and merges the responses into it if it's an AgentTurn. Both methods use `buildList` for clean, idiomatic code. Single-message conversion methods were removed because they were too dangerous. Task 03a created to refactor existing usages.
- **Task 03a**: The refactoring was minimal - only one test file (`OpenAITestProvider.kt`) needed updating. The change was simple: replaced `.map { it.toAiMessage() }` with `AgentMessagesConverter.toAiMessages(messages)`. This confirms that the dangerous single-message converters had limited usage, making their removal safe.
- **Task 04**: The validation state machine is now much cleaner. Key insight: `AgentTurn` with incomplete tool calls (where `response == null`) is considered corrupted in the final history, but during streaming this is expected. The validation checks `message.toolCalls.any { it.response == null }` to detect incomplete tool calls. The `appendToolCallWithResult` helper creates a `ToolResponse` from the `ToolResult` (which is a typealias for `ToolCallResponse`), wrapping it with the tool call's id and name. Import changed from `ToolCall` to `ToolResponse` to match the new signatures.
- **Task 05**: Migrated `StateTransitionTool.kt` to use `Message.AgentTurn`. The `findCurrentState()` function is now significantly simpler - eliminated cross-message ID matching by directly accessing tool calls and their responses from `AgentTurn`. The logic now uses `filterIsInstance<Message.AgentTurn>()` and `flatMap { it.toolCalls }` to get all tool calls, then checks `toolCall.response?.response is SuccessToolCallResponse` to find the last successful state transition. This is a major simplification from the previous two-pass approach.
- **Task 06**: Migrated `AgentStatesFeature.kt` to use `Message.AgentTurn`. Updated the `withSystemReminder()` function to find the last `AgentTurn` with tool responses and inject the system reminder using the utility function `withSystemReminderOnLastToolCall()` from Task 02. The logic is now cleaner: finds the last `AgentTurn` where `message.toolCalls.any { it.response != null }`, then applies the system reminder. Added import for `withSystemReminderOnLastToolCall`. The `createAgentsStatesQueryMapper()` function works correctly without changes.
- **Task 06a**: Migrated `AgentExecutor.kt` to use the new `MutableHistory` API. Renamed local helper functions from `appendStartOfAssistantMessageIfNeeded()` / `appendEndOfAssistantMessageIfNeeded()` to `startAgentTurnIfNeeded()` / `endAgentTurnIfNeeded()`. Updated all method calls to use the new API: `startAgentTurn()`, `endAgentTurn()`, `appendToolCallStarted(Message.AgentTurn.ToolCall)`, and `appendToolCallFinished(String, ToolResponse)`. Updated tool call handling in `onLlmToolCallEvent()` to create both `ToolCall` (for execution) and `Message.AgentTurn.ToolCall` (for history). Removed `AgentResult.UnprocessedToolCalls` from the sealed interface and removed the corresponding `Status.UnprocessedToolCalls` handling from the when expression. Added imports for `Message` and `ToolResponse`. The migration simplifies the code by eliminating the need to track unprocessed tool calls separately.
- **Task 07**: Facts.kt was already using the new `Message` model. The file only works with `Message.UserMessage` and `Message.SystemMessage`, which have identical structure in both old and new models. Since the imports were generic (`import com.explyt.agent.llm.Message`), the file automatically started using the new model after Task 01's rename. The fact injection logic works correctly: it finds the first `SystemMessage` (or creates one), injects facts into it, then finds the last `UserMessage` and injects facts before it. The code handles empty content fields correctly with default values (`content: String = ""`). No code changes were needed.
- **Task 09**: Successfully removed `MessageOld` sealed interface and all its nested types from `Message.kt`. Removed the `// TODO: refactor completely` comment. Updated `HistoryValidatorTest.kt` to use the new `Message.AgentTurn` model instead of the old `Message.AssistantMessage` and `Message.ToolResponseMessage` types. Converted all 17 test cases to work with the unified tool call/response model. Tests now validate `CorruptedReason.IncompleteToolCalls` instead of the removed `Status.UnprocessedToolCalls` and `CorruptedReason.ToolResponseIdMismatch`. All tests pass successfully. The entire `agent-api` module compiles without errors.
- **Task 08**: All 6 remaining utility files were already using the new `Message` model. Like Task 07, these files had generic imports (`import com.explyt.agent.llm.Message`) which automatically resolved to the new model after Task 01's rename. Files verified: `HistoryUtils.kt`, `AgentState.kt`, `LlmQuery.kt`, `AgentStatsCollector.kt`, `AgentConfigV4.kt`, and `HistoryCompressor.kt`. Static analysis confirmed zero compilation errors and no references to `MessageOld` in any file. Full module compilation successful. No code changes were needed. **Key insight:** The generic import strategy from Task 01 worked perfectly - about half of the files (Tasks 07 and 08) required zero migration effort because they automatically picked up the new model.
- **Task 09**: The `MessageOld` sealed interface is now completely removed from the codebase. The new `Message` model with unified `AgentTurn` is the only message model. All 17 test cases in `HistoryValidatorTest.kt` were successfully migrated to use `Message.AgentTurn` with embedded tool responses. The tests now properly validate the new model's constraints: tool calls must have responses (`response != null`) in final history, and incomplete tool calls are detected as `CorruptedReason.IncompleteToolCalls`. The migration eliminates all cross-message tool call ID matching logic from tests, making them simpler and more maintainable. Module compiles cleanly with zero errors and all tests pass.
- **Task 10**: Task was already completed as part of Task 09. The `HistoryValidatorTest.kt` file was fully migrated during Task 09, with all 19 test cases updated to use `Message.AgentTurn` instead of the old `Message.AssistantMessage` and `Message.ToolResponseMessage` types. All tests pass successfully. The test suite now validates the new unified tool call/response model, including tests for incomplete tool calls (`CorruptedReason.IncompleteToolCalls`), completed tool calls, and all existing validation rules (system message position, user after user, etc.). No additional work was needed.
