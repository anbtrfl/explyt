---
filePattern: "**/*"
---

# When writing in Kotlin

**It's very important**.

### Avoid too nested constructions, introduce new variables with appropriate names.

Example:

```kotlin
add(
    AiMessage.assistant(
        text = msg.content,
        images = emptyList(),
        toolCalls = toolCallsWithoutResponses
    )
)
```

Do like this:

```kotlin
val message = AiMessage.assistant(
    text = msg.content,
    images = emptyList(),
    toolCalls = toolCallsWithoutResponses
)
add(message)
```

### Try to keep methods and functions small

### Try to use sealed hierarchies with inside classes if appropriate

### Avoid using global variables, methods. Prefer objects with appropriate names

### Avoid very big files, split them semantically

### Create new entities close to associated entities


**THIS IS VERY IMPORTANT**
### Create common useful implementations close to interfaces, avoid splitting simple implementations into many files
