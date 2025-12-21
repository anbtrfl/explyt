# Task 07: Fix Tool Call Serialization Issue

## Goal
Investigate and fix the issue where tool calls are not being serialized properly in the chat history.

## Description

After the migration to the new `Message.AgentTurn` API, tool calls are not being serialized correctly. This means that when a chat is saved and reloaded, tool call information may be lost.

The issue likely stems from one of the following areas:
1. **Serialization logic** in `ChatSerializer.serializeMessageViewModels()` - may not be correctly capturing tool calls
2. **Deserialization logic** in `ChatSerializer.deserializeMessageViewModels()` - may not be correctly reconstructing tool call view models
3. **View model state** - tool call view models may not have their state properly set when created
4. **Message conversion** in `MessageListUtils.toAgentLibMessages()` - may not be correctly converting tool calls to the new format

## Investigation Steps

1. **Check serialization flow:**
   - Verify that `ToolCallViewModel2` instances are being collected in `serializeMessageViewModels()`
   - Verify that `SerializableMessage.AgentTurn.SerializableToolCall` objects are being created with correct data
   - Check if `toolResponse` field is being populated correctly (should contain the tool result)

2. **Check deserialization flow:**
   - Verify that `SerializableMessage.AgentTurn.toolCalls` are being processed
   - Verify that `ToolCallViewModel2` instances are being created from serialized tool calls
   - Check if tool results are being restored correctly in the view models

3. **Check view model state:**
   - Verify that `ToolCallViewModel2.toolResultStateFlow` is being set correctly during deserialization
   - Check if the tool call execution state is being preserved

4. **Test the round-trip:**
   - Create a chat with tool calls
   - Serialize it
   - Deserialize it
   - Verify all tool call data is preserved

## Caveats & Key Points

- Tool calls are now embedded within `AgentTurn` messages, not separate messages
- Each `ToolCallViewModel2` should be serialized as part of its parent `AssistantMessageViewModel`
- The serialization logic processes messages in reverse to collect tool calls before their parent
- Tool calls without responses (null) should still be serialized (they represent in-progress tool calls)
- Backward compatibility must be maintained for old chat formats

## Main Changes

**Files to investigate:**
1. `platform/ij-chat-v3/src/main/kotlin/com/explyt/chat/v4/serialization/ChatSerializer.kt`
2. `platform/ij-chat-v3/src/main/kotlin/com/explyt/chat/v4/serialization/SerializableMessage.kt`
3. `platform/ij-chat-v3/src/main/kotlin/com/explyt/chat/v4/presentation/vm/MessageListUtils.kt`
4. `platform/ij-chat-v3/src/main/kotlin/com/explyt/chat/v4/presentation/vm/ToolCallViewModel2.kt`

**Potential fixes:**
- Ensure tool calls are being added to the correct `AgentTurn` during serialization
- Ensure tool call view models are being created during deserialization
- Verify that tool results are being properly stored and restored
- Add logging to track serialization/deserialization flow

## Acceptance Criteria

- [ ] Tool calls are correctly serialized when saving a chat
- [ ] Tool calls are correctly deserialized when loading a chat
- [ ] Tool call results (responses) are preserved across save/load
- [ ] Tool call execution state is preserved
- [ ] Both completed and in-progress tool calls are handled correctly
- [ ] Backward compatibility with old chat formats is maintained
- [ ] Manual testing confirms tool calls appear correctly after reload
- [ ] No compilation errors
