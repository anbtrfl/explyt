---
title: Multi-agent setup
tags: [meta]
---

# Multi-Agent Setup Workflow

**🤖 YOU ARE AN LLM AGENT EXECUTING THIS WORKFLOW**

This workflow instructs you to break down the user's complex work request into manageable, independent tasks for sequential execution by other coding agents in future sessions.

**Use Cases:**
- Code refactoring and implementation
- Project exploration and analysis
- Generating PR descriptions and documentation
- Reviewing PRs and code changes
- Requirements gathering and clarification
- Any multi-step work that benefits from structured task breakdown

## Overview

**YOUR ROLE:** You are the **Setup Agent**. Your job is to create a task management system that other agents will use.

**What you will do (Setup Phase - Steps 1-6):**
1. Gather requirements from the user
2. Create task breakdown
3. Present the overall plan to user and get approval
4. Create individual task files (`.md` files) with user approval for each
5. Create a shared CONTEXT.md file
6. Generate a PROMPT.md file with instructions for future agents

**What happens after you finish:**
- Other agents in separate sessions will read your PROMPT.md
- They will execute tasks one by one (Execution Phase - Steps 1-9)
- They will update your CONTEXT.md as they work
- You will NOT execute the tasks yourself

**Key Understanding:** The templates below are NOT examples to reference - they are OUTPUTS you must generate and customize for the user's specific request.

---

# Setup Phase

**📝 INSTRUCTIONS FOR YOU (Setup Agent)**

Follow these 6 steps to create the task management system. After completing Step 6, your job is done - inform the user that the PROMPT.md is ready for other agents.

---

## Step 1: Gather User Requirements

**Objective:** Understand the user's work request.

**What YOU must do:**
- Ask the user to describe their request (refactoring, implementation, exploration, documentation, PR review, etc.)
- Clarify any ambiguous requirements
- Identify the scope and boundaries of the work
- Determine the type of work: code changes, analysis, documentation, or a combination

**Guidelines:**
- Use the `ask_user_with_options` tool when asking questions to provide structured choices
- Gather enough information to create well-defined, actionable tasks

---

## Step 2: Create Task Breakdown

**Objective:** Generate a comprehensive task list based on the user's request.

**Task types:**
- **Code Modification** - Implementing features, refactoring, fixing bugs
- **Exploration** - Analyzing codebase, documenting patterns, understanding architecture
- **Requirements Gathering** - Clarifying requirements with the user, resolving ambiguities
- **Context Management** - Refactoring or reorganizing CONTEXT.md for clarity
- **Verification** - Testing changes, validating behavior, checking compilation

**What YOU must do:**
1. Analyze the user's request and identify logical groupings of work
2. Prepare a structured plan showing all tasks

**Task Design Principles:**
- **Granular** - Each task should be completable in a single agent session
- **Sequential Execution** - Tasks are executed in order by different agents
- **Minimal Dependencies** - Each task should depend on as few previous tasks as possible
- **Self-Contained** - Each task should include all information needed to complete it
- **Scoped** - All tasks should relate to the same overall objective
- **Diverse Goals** - Tasks can have different objectives (code changes, analysis, documentation, verification)

**DO NOT create files yet** - you will present the plan to the user first in Step 3.

**Guidelines:** See Setup Agent Guidelines section below.

---

## Step 3: Present Plan and Get Approval

**Objective:** Present the complete task breakdown to the user and get approval before creating any files.

**What YOU must do:**
1. Present the overall structure:
    - Total number of tasks
    - Goal of each task
    - Estimated sequence and dependencies

2. Format your presentation clearly:
```
## Proposed Task Breakdown

- Task 01: [Task name] - [Brief description]
- Task 02: [Task name] - [Brief description]
- Task 03: [Task name] - [Brief description]
- Task 04: [Task name] - [Brief description]

[etc.]
```

3. Use `ask_user_with_options` to get approval:
    - "Approve and proceed with task creation"
    - "Request modifications to the plan"
    - "Start over with different approach"

4. If modifications requested, iterate on the plan until approved

**Guidelines:**
- Explain the rationale for task grouping
- Highlight any critical dependencies
- Be open to user feedback and adjustments

---

## Step 4: Create Task Files with Approval

**Objective:** Create individual task files, presenting each task to the user for approval before writing it.

**What YOU must do:**
1. Create the task directory in `.tasks/`
    - Use a descriptive, kebab-case name (e.g., `tool_response_refactor_tasks`, `api_migration_tasks`)
    - The name should clearly indicate what the overall work is about

2. For EACH task in sequence:
   a. Present the detailed task specification to the user
   b. Use `ask_user_with_options` to get approval:
    - "Approve and create this task file"
    - "Request modifications to this task"
    - "Skip this task"
      c. If approved, create the task file using the template below
      d. If modifications requested, adjust and present again
      e. Move to the next task

3. Name files descriptively (e.g., `task-01-refactor-service-layer.md`)

**Task Presentation Format:**
```
## Task [XX]: [Task Name]
**Type:** [Type]

**Goal:** [Clear objective]

**What to Do:**
- [Action items]

**Files/Areas:**
- [Files to modify]

**Key Points:**
- [Critical considerations]

**Done When:**
- [Acceptance criteria]
```

**IMPORTANT:** The template below is what you will WRITE into each task file, not just reference.

**Task File Template (YOU MUST CREATE FILES WITH THIS STRUCTURE):**

```markdown
# Task [XX]: [Task Name]

**Type:** [Code Modification / Exploration / Requirements Gathering / Context Management / Verification]

## Goal

[Clear, concise objective in 1-2 sentences]

## What to Do

- [Action item 1]
- [Action item 2]
- [Action item 3]

## Files/Areas

- `[path/to/file1.ext]` - [What to change]
- `[path/to/file2.ext]` - [What to change]

## Key Points

- ⚠️ [Critical consideration]
- 💡 [Helpful tip]

## Done When

- [ ] [Criterion 1]
- [ ] [Criterion 2]

```

**Guidelines:**
- Present tasks one at a time in order
- Wait for approval before creating each file
- Be patient with user feedback and iterations
- Keep the user informed of progress (e.g., "Task 3 of 12 created")

---

## Step 5: Setup Context File

**Objective:** Create a shared knowledge base for agent collaboration.

**What YOU must do:**
1. Create a `CONTEXT.md` file in the task directory
2. Use the template below as a starting point
3. Customize sections based on the specific work
4. Fill in the initial project context (other agents will add to it later)

**Purpose:**

The `CONTEXT.md` file serves as:
- A **shared memory** for agents working on sequential tasks
- A **progress tracker** showing completed tasks with links to corresponding MD files and outcomes
- A **knowledge repository** for key facts, decisions, and learnings

**Guidelines:**
- **Be brief** - Use bullet points, not paragraphs
- **Avoid duplication** - Don't repeat what's already in task files
- **Focus on essentials** - Only critical decisions, blockers, and learnings
- **Link, don't copy** - Reference task files instead of duplicating content
- **Prune regularly** - Remove outdated or obvious information
- **One-liners preferred** - Each entry should be scannable in seconds

**Context File Template (YOU MUST CREATE THIS FILE):**

```markdown
# [Task Name] - Context

## Overview

[Brief description of the overall objective - what work is being performed: refactoring, implementation, exploration, documentation, PR review, etc.]

---

## Task Progress

- [x] [task-XX-name.md]: [Task Name]
    - [1-2 sentence summary of outcomes]
    - [Critical decision if any]
- [ ] [task-XX-name.md]: [Task Name]
- [ ] [task-XX-name.md]: [Task Name]

---

## Shared Knowledge

Coding agents should maintain these sections during their execution.

### Project Context

- [Key file/component 1] - [Brief description]
- [Key file/component 2] - [Brief description]

### Key Decisions
  
- [Key architectural decision or constraint]
- [Link to relevant documentation]

### Caveats & Problems

- [Problem 1] - [Brief description]
- [Caveat 1] - [Brief description]

---

```

**Guidelines:**
- **Enforce brevity** - Every entry must be scannable in 5 seconds
- **Link over duplicate** - Reference task files instead of copying content
- **Never put code fragments** - Keep context focused on decisions and outcomes, not implementation details
- Use the `ask_user_with_options` tool if additional context is needed
- Maintain the mandatory sections (Overview, Task Progress, Project Context)

---

## Step 6: Generate Execution Prompt

**Objective:** Create a single, reusable prompt file that all agents will use.

**What YOU must do:**

1. Create `PROMPT.md` in the task directory
2. Customize the prompt template below for the specific work
3. Present the final prompt file path to the user
4. **YOUR JOB IS DONE** - inform the user that other agents can now use PROMPT.md to execute tasks

**Prompt Template (YOU MUST CREATE THIS FILE - it will be given to other agents):**

The PROMPT.md file you create should be **specific to the user's request** but follow this structure:

```markdown
# [Task Name] - Task Execution Instructions

## Your Mission

[Brief description of the overall objective - what work is being performed: refactoring, implementation, exploration, documentation, PR review, etc.]

**Context File:** [Actual path]
**Tasks Directory:** [Actual path]

## Execution Steps

### 1. Read Context
Review the context file for:
- The next incomplete task to work on
- [Specific context items relevant to this work]
- Information from previous agents
- Key decisions and learnings

### 2. Understand Your Task
Read your task file: [task directory]/task-XX-[name].md
- **Goal** - What you're trying to achieve
- **Description** - Detailed explanation
- **Caveats & Key Points** - Important considerations
- **Main Changes** - Specific files to modify
- **Acceptance Criteria** - How to know you're done

### 3. Execute the Task
- Make necessary code changes
- [Any specific execution guidance]
- Ensure code compiles without errors
- Verify all acceptance criteria are met

### 4. Update Context
Update the context file **concisely**:
- Mark task as completed (1-2 sentence summary)
- Document **only critical** decisions that affect future tasks
- Note **only significant** issues or discoveries
- **Keep it brief** - use bullet points, not paragraphs
- **Avoid duplication** - don't repeat what's in task files

### 5. Await Approval (MANDATORY)
**This step is REQUIRED - do not skip it.**
Wait for user confirmation before proceeding.

### 6. Review Task List (MANDATORY)
**This step is REQUIRED - do not skip it.**

Carefully analyze the task list based on your experience:

**Review Checklist:**
- ✅ Did you encounter unexpected complexity or issues?
- ✅ Are remaining tasks still accurate given what you learned?
- ✅ Should any tasks be split into smaller pieces?
- ✅ Should any tasks be merged or removed?
- ✅ Do tasks need reordering based on new dependencies?
- ✅ Are there missing tasks that should be added?

**Your Responsibility:**
- Actively maintain the task list quality
- Think critically about the remaining work
- Propose improvements even if small
- It's OK to say "no changes needed" but you MUST review first

### 7. Present Task List Review (MANDATORY)
**Always present your review findings to the user.**

Provide one of these responses:

**Option A - Changes Recommended:**

    Task List Review:
    - [Specific change 1 with rationale]
    - [Specific change 2 with rationale]
    - [etc.]
    
    Should I proceed with these updates?

**Option B - No Changes Needed:**

    Task List Review:
    I reviewed all remaining tasks against my experience with this task.
    No changes needed - the task list remains accurate and well-structured.

**Always await user approval before proceeding.**

### 8. Update Task Files (if approved)
- Modify/create task files as needed
- Update task numbering if reordered
- Update CONTEXT.md with task list changes
- Document rationale for changes in CONTEXT.md

### 9. Commit Changes
Commit with descriptive message following this pattern:
- `feat [task-XX]: brief description of changes`
- `fix [task-XX]: brief description of fix` 
- `docs [task-XX]: brief description of documentation`

## Execution Guidelines

**Code Quality:**
- Keep summary brief and focused
- Focus on compilation errors first
- Ensure code compiles without errors before marking task complete
- Follow project coding standards and conventions

**Communication:**
- Ask for guidance if stuck or blocked
- Document blockers clearly in CONTEXT.md
- Mark tasks as "BLOCKED" when cannot proceed

**Task Management:**
- **NEVER skip Steps 6-7** - task list review is mandatory
- Always present your review findings, even if no changes needed
- Task list maintenance is part of your responsibility
- Think critically about remaining work based on your experience

**Context Updates:**
- Update CONTEXT.md concisely after each task
- Document only critical decisions that affect future tasks
- Use bullet points, not paragraphs
- Keep entries scannable in 5 seconds

**Error Handling:**
- If a task cannot be completed, document the blocker in CONTEXT.md
- Mark task as "BLOCKED" and await user guidance
- Never skip to the next task without resolving blockers

**Specific Notes:**
- [Specific notes relevant to this work - to be customized by Setup Agent]

```

**Guidelines:** See Setup Agent Guidelines section below.
- CONTEXT.md tracks which tasks are complete and iteration status

---

## Setup Agent Guidelines

**General Approach:**
- Always use `ask_user_with_options` for questions to provide structured choices
- If requirements are unclear, use `ask_user_with_options` to clarify
- If task breakdown seems too complex, suggest splitting the work
- Your job ends after creating PROMPT.md - inform user it's ready for execution agents

**Iteration Planning (Step 2):**
- Aim for 2-5 iterations depending on complexity
- Each iteration should have 2-5 tasks
- Group related tasks into the same iteration
- Ensure iterations have clear deliverables
- Consider natural breakpoints for user review

**Plan Presentation (Step 3):**
- Present the complete plan before creating any files
- Use clear formatting to show iteration structure
- Explain the rationale for grouping decisions
- Be prepared to iterate on the plan based on feedback
- Use `ask_user_with_options` for approval

**Task Creation (Step 4):**
- Present each task individually for approval
- Create files only after user approval
- Maintain consistency in file naming and structure
- Keep the user informed of progress
- Be patient with feedback and modifications

**Task Validation Checklist:**
- [ ] All tasks have clear acceptance criteria
- [ ] Dependencies are minimal and well-defined
- [ ] Each task is completable in one session
- [ ] Task sequence makes logical sense
- [ ] No critical steps are missing
- [ ] Iterations have clear goals and deliverables

**Context File Creation (Step 5):**
- **Enforce brevity** - Every entry must be scannable in 5 seconds
- **Link over duplicate** - Reference task files instead of copying content
- **Never put code fragments** - Keep context focused on decisions and outcomes, not implementation details
- Maintain the mandatory sections (Overview, Iterations, Task Progress, Project Context)

**Prompt Creation (Step 6):**
- Use actual file paths throughout
- Customize mission, execution guidance, and notes
- Include concrete commit message examples
- Same PROMPT reused by all agents
- Embed the execution guidelines directly in the PROMPT template
- Include iteration structure in the prompt

---

# Execution Phase

**🛑 NOT FOR YOU (Setup Agent) - This section explains what happens AFTER you finish**

**Note:** This phase is performed by **different agents** in separate sessions. You (the Setup Agent) will NOT execute these steps.

Each agent:
1. Receives the PROMPT.md file as their instruction
2. Reads CONTEXT.md to identify the current iteration and next incomplete task
3. Follows the 9-step workflow defined in the PROMPT file (see Step 6 above)
4. Updates CONTEXT.md with their progress and iteration status
5. **MUST perform task list review (Steps 6-7)** - this is not optional
6. Presents review findings and awaits user approval
7. Passes the work to the next agent (or user)

## Workflow Completion

The overall workflow is complete when:
- All iterations are marked as complete in `CONTEXT.md`
- All task files are marked as completed in `CONTEXT.md`
- All acceptance criteria have been met
- The user confirms the work is satisfactory

**Important:** The agent who performs the Setup Phase should **not** execute tasks. They should inform the user that the PROMPT.md file is ready to be used by other agents for task execution.

## Execution Agent Guidelines

**Code Quality:**
- Keep summary brief and focused
- Focus on compilation errors first
- Ensure code compiles without errors before marking task complete
- Follow project coding standards and conventions

**Communication:**
- Ask for guidance if stuck or blocked
- Document blockers clearly in CONTEXT.md
- Mark tasks as "BLOCKED" when cannot proceed

**Task Management:**
- **NEVER skip Steps 6-7** - task list review is mandatory
- Always present your review findings, even if no changes needed
- Task list maintenance is part of your responsibility
- Think critically about remaining work based on your experience

**Context Updates:**
- Update CONTEXT.md concisely after each task
- Document only critical decisions that affect future tasks
- Use bullet points, not paragraphs
- Keep entries scannable in 5 seconds

**Error Handling:**
- If a task cannot be completed, document the blocker in CONTEXT.md
- Mark task as "BLOCKED" and await user guidance
- Never skip to the next task without resolving blockers

---

## File Naming Standards

- Main prompt file: `PROMPT.md`
- Context file: `CONTEXT.md`
- Task files: `task-01-descriptive-name.md`, `task-02-descriptive-name.md`, etc.
- Directory: `.tasks/[project-name]-tasks/`
