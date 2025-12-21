# Task 03: Update Serialization Layer

## Goal
Update the serialization layer to handle the new `Message.AgentTurn` model while maintaining backward compatibility with old saved chats.

## Description

The serialization layer needs to be updated to:
1. Replace `SerializableMessage.AssistantMessage` with a new structure that supports `AgentTurn`
2. Update `ChatSerializer` to convert between view models and the new serializable format
3. Maintain backward compatibility so old chats can still be loaded

The key challenge is that old chats have separate `AssistantMessage` and `ToolMessage` entries, but the new model combines them into `AgentTurn` with embedded tool calls.

## Caveats & Key Points

- **Backward Compatibility**: Old chats must still load correctly
- The new serializable format should represent `AgentTurn` with embedded tool calls
- Consider renaming `SerializableMessage.AssistantMessage` to `SerializableMessage.AgentTurn` or similar
- The `ToolMessage` type may need to be kept for backward compatibility or merged into the new structure
- Deserialization should handle both old and new formats
- The `ChatSerializer` converts between `MessageViewModel` and `SerializableMessage`

## Main Changes

**Files:**
- `platform/ij-chat-v3/src/main/kotlin/com/explyt/chat/v4/serialization/SerializableMessage.kt`
- `platform/ij-chat-v3/src/main/kotlin/com/explyt/chat/v4/serialization/ChatSerializer.kt`

### SerializableMessage.kt
1. Update or replace `AssistantMessage` to support `AgentTurn` structure
2. Consider adding a new `AgentTurn` type with embedded tool calls
3. Keep old types for backward compatibility if needed
4. Add proper serialization annotations

### ChatSerializer.kt
1. Update `toSerializableMessage()` to convert `AssistantMessageViewModel` to new format
2. Update `toSerializableMessage()` to handle `ToolCallViewModel2` correctly
3. Update `toMessageViewModel()` to convert from new format back to view models
4. Handle backward compatibility for old serialized chats
5. Ensure tool calls are properly grouped with their parent `AgentTurn`

## Acceptance Criteria

- [ ] New serializable format supports `AgentTurn` with embedded tool calls
- [ ] Old chats can still be loaded (backward compatibility)
- [ ] `ChatSerializer` correctly converts to/from new format
- [ ] Tool calls are properly grouped with their parent `AgentTurn`
- [ ] Files compile without errors
- [ ] Serialization/deserialization round-trip works correctly
