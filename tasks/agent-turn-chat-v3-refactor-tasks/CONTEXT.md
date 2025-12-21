# ij-chat-v3 Message API Migration Context

## Project Overview

This migration updates the `ij-chat-v3` module to use the new unified `Message.AgentTurn` API from `agent-api`. The `agent-api` module has already been migrated from the old two-message model (separate `AssistantMessage` and `ToolResponseMessage`) to the new unified `AgentTurn` model where tool calls and their responses are embedded together.

## Key Architectural Changes

### Old Model (Still in ij-chat-v3)
- **Message.AssistantMessage** - Assistant response with tool calls
- **Message.ToolResponseMessage** - Tool execution results (separate message)
- **MutableHistory API**: `appendStartOfAssistantMessage()`, `appendEndOfAssistantMessage()`, `appendToolCallStarted(ToolCall)`, `appendToolCallFinished(ToolCall, ToolResult)`

### New Model (Already in agent-api)
- **Message.AgentTurn** - Combines assistant message + tool calls + tool responses in one atomic unit
- **Message.AgentTurn.ToolCall** - Nested class with `response: ToolResponse?` field
- **MutableHistory API**: `startAgentTurn()`, `endAgentTurn()`, `appendToolCallStarted(Message.AgentTurn.ToolCall)`, `appendToolCallFinished(toolCallId: String, response: ToolResponse)`

### Critical Change: Tool Call/Response Unification

**Before:** Tool calls and responses were in separate messages, requiring ID matching across messages.

**After:** Each `AgentTurn.ToolCall` contains both the call arguments AND the response (nullable), making agent turns atomic and self-contained.

## Migration Strategy

1. Update `MutableHistory` implementation in `MessageListViewModel` to use new API
2. Update message conversion utilities in `MessageListUtils.kt`
3. Update serialization layer to handle new model
4. Update test files to use `Message.AgentTurn`
5. Update any remaining usages of old message types

## Files to Migrate

Based on search results, the following files need migration:

### Core Files (High Priority)
1. `v4/presentation/vm/MessageListViewModel.kt` - Implements `MutableHistory` interface with old API
2. `v4/presentation/vm/MessageListUtils.kt` - Already partially migrated, needs verification
3. `v4/serialization/SerializableMessage.kt` - Serialization model still uses old types
4. `v4/serialization/ChatSerializer.kt` - Converts between view models and serializable messages

### Test Files
5. `v3/domain/usecase/compression/HistoryCompressorImplTest.kt` - Uses old `AssistantMessage` and `ToolResponseMessage`

### Other Files (May need updates)
6. `v3/domain/usecase/compression/HistoryCompressorImpl.kt` - Already uses `AgentTurn`, verify correctness
7. `v3/domain/usecase/llm/ExplytLlmProvider.kt` - Already uses `AgentTurn`, verify correctness
8. `v4/presentation/vm/ChatViewModelV4.kt` - May need updates for history handling
9. `v3/stats/ChatFeatureTracker.kt` - Statistics tracking
10. `v3/stats/EventFactoryChatFeatureTracker.kt` - Event tracking
11. `v3/stats/ChatFeatureTrackerAdapter.kt` - Adapter for tracking

## Key Constraints

- All changes must be within `ij-chat-v3` module
- Maintain backward compatibility for serialization (old chats must load correctly)
- Each task should be independently compilable where possible
- Focus on fixing compilation errors systematically
- The `agent-api` module is already fully migrated and should not be changed

## Progress Tracking

### Completed Tasks
- [x] Task 00: Identify all compilation errors
- [x] Task 01: Update MessageListViewModel MutableHistory implementation
- [x] Task 02: Verify MessageListUtils conversion logic
- [x] Task 03: Update serialization layer (SerializableMessage and ChatSerializer)
- [x] Task 04: Update test files
- [x] Task 05: Verify and fix remaining files
- [x] Task 06: Final compilation check and cleanup
- [x] Task 07: Fix tool call serialization issue

### Compilation Errors (from Task 00)

**Total Errors: 62 across 3 files**

#### File 1: MessageListViewModel.kt (8 errors)
**Location:** `platform/ij-chat-v3/src/main/kotlin/com/explyt/chat/v4/presentation/vm/MessageListViewModel.kt`

1. **Line 19** - `ABSTRACT_MEMBER_NOT_IMPLEMENTED`: Class doesn't implement new MutableHistory methods:
   - `suspend fun appendToolCallStarted(toolCall: Message.AgentTurn.ToolCall)`
   - `suspend fun appendToolCallFinished(toolCallId: String, response: ToolResponse)`
   - `suspend fun startAgentTurn()`
   - `suspend fun endAgentTurn()`

2. **Line 34** - `NOTHING_TO_OVERRIDE`: `appendToolCallStarted` overrides nothing (wrong signature)
   - Expected: `suspend fun appendToolCallStarted(toolCall: Message.AgentTurn.ToolCall)`

3. **Line 39** - `NOTHING_TO_OVERRIDE`: `appendToolCallFinished` overrides nothing (wrong signature)
   - Expected: `suspend fun appendToolCallFinished(toolCallId: String, response: ToolResponse)`

4. **Line 64** - `NOTHING_TO_OVERRIDE`: `appendStartOfAssistantMessage` overrides nothing (method removed from interface)

5. **Line 78** - `NOTHING_TO_OVERRIDE`: `appendEndOfAssistantMessage` overrides nothing (method removed from interface)

6. **Line 134** - `NO_ELSE_IN_WHEN`: 'when' expression must handle `is AgentTurn` branch

7. **Line 135** - `UNRESOLVED_REFERENCE`: Unresolved reference 'AssistantMessage' (removed from API)

8. **Line 143** - `UNRESOLVED_REFERENCE`: Unresolved reference 'ToolResponseMessage' (removed from API)

#### File 2: HistoryCompressorImplTest.kt (53 errors)
**Location:** `platform/ij-chat-v3/src/test/kotlin/com/explyt/chat/v3/domain/usecase/compression/HistoryCompressorImplTest.kt`

**Error Categories:**
- **Unresolved references to removed types** (18 occurrences):
  - `AssistantMessage` - Lines: 27, 59, 60, 61, 155, 185, 327, 329, 357
  - `ToolResponseMessage` - Lines: 34, 66, 67, 68, 160, 210, 362
  
- **Unresolved references to removed properties** (28 occurrences):
  - `content` - Lines: 62 (2x), 156, 186, 327, 329
  - `toolCalls` - Lines: 63 (2x), 157, 158, 187, 358, 359 (2x), 360 (2x)
  - `reasoning` - Lines: 64 (2x)
  - `toolResponses` - Lines: 69 (2x), 161, 162, 211, 363, 364 (2x), 365 (2x)
  - `id` - Lines: 158, 162, 359 (2x), 360 (2x), 364 (2x), 365 (2x)

- **Type inference errors** (6 occurrences):
  - `CANNOT_INFER_PARAMETER_TYPE` - Lines: 158, 162, 359, 360, 364, 365

- **Exhaustive when** (1 occurrence):
  - `NO_ELSE_IN_WHEN` - Line: 49 (missing `is AgentTurn` branch)

#### File 3: ChatViewModelV4.kt (1 error)
**Location:** `platform/ij-chat-v3/src/main/kotlin/com/explyt/chat/v4/presentation/vm/ChatViewModelV4.kt`

1. **Line 117** - `UNRESOLVED_REFERENCE`: Unresolved reference 'decodeMessageVms'

#### Files with NO errors:
- `MessageListUtils.kt` - ✅ Already migrated
- `SerializableMessage.kt` - ✅ No compilation errors
- `ChatSerializer.kt` - ✅ No compilation errors
- `HistoryCompressorImpl.kt` - ✅ Already uses AgentTurn
- `ExplytLlmProvider.kt` - ✅ Already uses AgentTurn
- `ChatFeatureTracker.kt` - ✅ No errors
- `ChatFeatureTrackerAdapter.kt` - ✅ No errors
- `EventFactoryChatFeatureTracker.kt` - ✅ No errors

#### Error Summary by Category:

1. **Method Signature Mismatches (MutableHistory API)** - 5 errors
   - Missing implementations of new methods: `startAgentTurn()`, `endAgentTurn()`
   - Wrong signatures for: `appendToolCallStarted()`, `appendToolCallFinished()`
   - Obsolete methods: `appendStartOfAssistantMessage()`, `appendEndOfAssistantMessage()`

2. **Missing Type References** - 18 errors
   - `AssistantMessage` (9 occurrences)
   - `ToolResponseMessage` (9 occurrences)

3. **Missing Property References** - 28 errors
   - Properties from removed message types

4. **Type Inference Errors** - 6 errors
   - Cascading from missing type references

5. **Exhaustive When Expressions** - 2 errors
   - Missing `is AgentTurn` branches

6. **Other** - 1 error
   - Missing function reference in ChatViewModelV4

#### Priority Files (by error count):
1. **HistoryCompressorImplTest.kt** - 53 errors (highest priority for Task 04)
2. **MessageListViewModel.kt** - 8 errors (highest priority for Task 01)
3. **ChatViewModelV4.kt** - 1 error (needs investigation)

#### Task Coverage Analysis:
✅ All affected files are covered by existing tasks:
- Task 01 covers MessageListViewModel.kt
- Task 04 covers HistoryCompressorImplTest.kt
- Task 05 can cover ChatViewModelV4.kt (or may need separate investigation)

### Key Decisions Made

**Task 00:**
- Identified 62 compilation errors across 3 files
- MessageListViewModel.kt has 8 errors, primarily method signature mismatches with new MutableHistory API
- HistoryCompressorImplTest.kt has 53 errors, all related to removed message types (AssistantMessage, ToolResponseMessage)
- ChatViewModelV4.kt has 1 error (unresolved reference to 'decodeMessageVms')
- Several files (MessageListUtils.kt, SerializableMessage.kt, ChatSerializer.kt, etc.) have NO compilation errors, suggesting they may already be migrated or compatible
- All affected files are covered by existing tasks

**Task 01:**
- Renamed `appendStartOfAssistantMessage()` to `startAgentTurn()`
- Renamed `appendEndOfAssistantMessage()` to `endAgentTurn()`
- Updated `appendToolCallStarted()` to accept `Message.AgentTurn.ToolCall` and convert it to simple `ToolCall` for view model
- Updated `appendToolCallFinished()` to accept `toolCallId: String` and `ToolResponse`, extracting the actual result from `response.response`
- Updated `repairHistory()` to check for `Message.AgentTurn` instead of `Message.AssistantMessage` and removed check for `Message.ToolResponseMessage`
- Added import for `ToolResponse`
- All 8 compilation errors in MessageListViewModel.kt are now resolved

**Task 02:**
- Verified MessageListUtils.kt conversion logic is correct
- AgentTurn.ToolCall creation with embedded responses works correctly
- Tool call merging logic properly adds tool calls to existing AgentTurn or creates new ones
- Changed `content = ""` to `content = null` when creating AgentTurn with only tool calls, matching the pattern from agent-api
- File compiles without errors and follows agent-api patterns

**Task 03:**
- Added new `SerializableMessage.AgentTurn` type with embedded `SerializableToolCall` list for unified serialization format
- Kept legacy `AssistantMessage` and `ToolMessage` types for backward compatibility with old saved chats
- Updated serialization to group `AssistantMessageViewModel` with following `ToolCallViewModel2` instances into a single `AgentTurn`
- Updated deserialization to handle both new `AgentTurn` format and legacy separate message formats
- Tool calls with null responses are skipped during deserialization (incomplete tool calls)
- Serialization now produces more compact format with tool calls embedded in their parent agent turn
- Both files compile without errors and maintain backward compatibility

**Task 04:**
- Updated `HistoryCompressorImplTest.kt` to use new `Message.AgentTurn` model
- Replaced `assistantMessage()` helper with `agentTurn()` that creates `Message.AgentTurn`
- Removed `toolResponseMessage()` helper (responses now embedded in tool calls)
- Updated `toolCall()` helper to create `Message.AgentTurn.ToolCall` with embedded `response` parameter
- Updated `assertMessagesEqual()` to handle `Message.AgentTurn` instead of old `AssistantMessage` and `ToolResponseMessage` types
- Updated all 16 test cases to use new unified message structure with embedded tool responses
- Fixed `AiUtils.kt` by replacing deprecated `toAiMessage()` with `AgentMessagesConverter.toAiMessages()`
- Fixed `SafeAgentExecutorV4.kt` by removing handling for removed `AgentResult.UnprocessedToolCalls`
- Fixed `ChatViewModelV4.kt` by replacing `decodeMessageVms()` with `ChatSerializer.deserializeMessageViewModels()`
- All files compile without errors and tests follow the new AgentTurn model

**Task 05:**
- Verified all files mentioned in the task have no compilation errors
- Fixed bug in `HistoryCompressorImpl.filterRedundantInfo()` where failed tool call filtering was incorrect
- Changed filter logic from `toolCall.response !is FailureToolCallResponse` to `response == null || response.response !is FailureToolCallResponse`
- The issue was that `toolCall.response` is of type `ToolResponse?` which wraps the actual `ToolCallResponse`
- Updated filtering logic to handle edge case: keep last agent turn with null content (agent made tool calls but no text yet), but filter out agent turns with blank content
- All 16 tests in HistoryCompressorImplTest now pass
- Module compiles successfully and all tests pass

**Task 06:**
- Verified zero compilation errors in all source files (main and test)
- All tests pass successfully (HistoryCompressorImplTest with 16 tests)
- Module builds successfully with Gradle
- Removed commented-out old code from MessageListViewModel.kt that referenced removed Message.AssistantMessage and Message.ToolResponseMessage types
- Verified no active references to old message types remain (only in comments in task documentation and one entirely commented-out debug action file)
- No migration-related TODOs found - all existing TODOs are unrelated to the migration
- Migration is complete and successful

**Task 07:**
- Fixed critical bug in tool call serialization in `ChatSerializer.kt`
- The bug: `pendingToolCalls.asReversed()` returns a view, not a copy. When `pendingToolCalls.clear()` was called, it cleared the underlying list, which also affected the reversed view stored in the AgentTurn, resulting in 0 tool calls
- Fixed by calling `.toList()` on the reversed view to create a copy: `pendingToolCalls.asReversed().toList()`
- Also fixed deserialization to use `ToolUtils.invokeOrRestoreTool()` instead of `ToolUtils.restoreTool()` to handle nullable tool responses
- Added warning logging for orphaned tool calls during serialization
- Created comprehensive tests in `ChatSerializerTest.kt` to verify serialization/deserialization of tool calls
- All tests pass and module compiles successfully

### Issues Encountered

**Task 00:**
- Static analysis on entire module timed out, had to analyze files individually
- Some files mentioned in initial context (MessageListUtils.kt, SerializableMessage.kt, ChatSerializer.kt) have no compilation errors, suggesting they may not need migration or are already compatible

**Task 01:**
- No issues encountered. The migration was straightforward following the new MutableHistory API

**Task 02:**
- No issues encountered. The file was already mostly correct, only needed a minor adjustment to use `null` instead of empty string for content

**Task 03:**
- No issues encountered. The migration was straightforward with clear separation between new format (AgentTurn) and legacy formats (AssistantMessage/ToolMessage)

**Task 04:**
- Found additional compilation errors in `AiUtils.kt`, `SafeAgentExecutorV4.kt`, and `ChatViewModelV4.kt` that were not caught in Task 00
- The `toAiMessage()` extension function was removed from agent-api and replaced with `AgentMessagesConverter.toAiMessages()`
- The `AgentResult.UnprocessedToolCalls` was removed from agent-api as part of the migration (no longer needed with unified AgentTurn)
- The `decodeMessageVms()` method doesn't exist; should use `ChatSerializer.deserializeMessageViewModels()` instead

**Task 05:**
- Found a bug in `HistoryCompressorImpl.filterRedundantInfo()` that was causing test failures
- The filtering logic was checking `toolCall.response !is FailureToolCallResponse`, but `toolCall.response` is of type `ToolResponse?` (which wraps `ToolCallResponse`), not `ToolCallResponse` directly
- Had to use a local variable to enable smart cast: `val response = toolCall.response; response == null || response.response !is FailureToolCallResponse`
- Discovered edge case in filtering logic: last agent turn with null content should be kept (shows agent attempted tool calls), but agent turns with blank content should be filtered out

**Task 07:**
- Found critical bug: `pendingToolCalls.asReversed()` returns a view, not a copy
- When `pendingToolCalls.clear()` was called after creating AgentTurn, it cleared the underlying list, which also cleared the tool calls in the AgentTurn (since asReversed() returns a view)
- This caused all tool calls to be lost during serialization
- Fixed by calling `.toList()` to create a copy: `pendingToolCalls.asReversed().toList()`
- Also fixed deserialization to handle null responses using `ToolUtils.invokeOrRestoreTool()`
- Created comprehensive tests to verify the fix

### Important Notes
- The `MessageListUtils.kt` file already has some code using `AgentTurn`, but it may need verification
- The `MutableHistory` interface in `agent-api` has been updated with new method names and signatures
- Tool call handling now requires creating both `ToolCall` (for execution) and `Message.AgentTurn.ToolCall` (for history)
- Serialization format now uses `AgentTurn` with embedded tool calls, but can still deserialize old formats for backward compatibility
- Tool calls with null responses (in-progress or failed) are now properly handled during deserialization using `ToolUtils.invokeOrRestoreTool()`
- Orphaned tool calls (tool calls without a parent assistant message) are logged as warnings during serialization
