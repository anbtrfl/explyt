# Task 05: Verify and Fix Remaining Files

## Goal
Verify that all remaining files in `ij-chat-v3` correctly use the new `Message.AgentTurn` API and fix any issues found.

## Description

Several files already import and use `Message` from `agent-api`. These files need to be verified to ensure they correctly use the new `AgentTurn` model. Some files may already be correct due to generic imports, while others may need updates.

## Caveats & Key Points

- Files with generic imports (`import com.explyt.agent.llm.Message`) may already be using the new model
- Check for any references to `AssistantMessage` or `ToolResponseMessage`
- Verify that tool call handling is correct
- Check statistics and tracking code for correct message type handling
- Run static analysis to find any compilation errors

## Main Changes

**Files to verify:**
1. `v3/domain/usecase/compression/HistoryCompressorImpl.kt` - Already uses `AgentTurn`, verify correctness
2. `v3/domain/usecase/llm/ExplytLlmProvider.kt` - Already uses `AgentTurn`, verify correctness
3. `v4/presentation/vm/ChatViewModelV4.kt` - May need updates for history handling
4. `v3/stats/ChatFeatureTracker.kt` - Statistics tracking interface
5. `v3/stats/EventFactoryChatFeatureTracker.kt` - Event tracking implementation
6. `v3/stats/ChatFeatureTrackerAdapter.kt` - Adapter for tracking
7. `v3/presentation/view/request/CompressionEventView.kt` - UI view for compression
8. `v4/utils/MessageUtils.kt` - Message utility functions
9. `v4/features/ChatTitleGenerator.kt` - Chat title generation
10. `v3/utils/AiUtils.kt` - AI utility functions

## Acceptance Criteria

- [ ] All files compile without errors
- [ ] No references to old `AssistantMessage` or `ToolResponseMessage` types
- [ ] Tool call handling is correct in all files
- [ ] Statistics and tracking code works with new model
- [ ] Static analysis shows no errors
- [ ] Module builds successfully
