---
title: Multi-agent iteration setup
tags: [meta]
---

# Multi-Agent Iteration Setup Workflow

**🤖 YOU ARE AN LLM AGENT EXECUTING THIS WORKFLOW**

This workflow breaks down complex work into iterations following: **Analysis → Design → Coding → Planning**.

**Use Cases:**
- Feature implementation with iterative refinement
- Code refactoring with progressive improvements
- Project exploration and incremental documentation
- Any multi-step work requiring feedback loops and adaptation

## Overview

**YOUR ROLE:** You are the **Setup Agent**. You create the iteration management system.

**Setup Phase:**
1. Gather requirements from the user
2. Create iteration breakdown
3. Present the plan and get approval
4. Create iteration files (one file per iteration)
5. Create shared CONTEXT.md
6. Generate PROMPT.md for execution agents
7. Commit setup files

**What happens after:**
- Execution agents work through iterations one by one
- Each iteration: Analysis → Design → Coding → Planning
- Planning phase adapts the roadmap based on learnings
- You will NOT execute the iterations yourself

---

# Setup Phase

## Step 1: Gather Requirements

Understand the user's work request and global goal.

**Actions:**
- Ask about the overall objective (what's the end goal?)
- Clarify scope and boundaries
- Identify key features/components to implement
- Understand constraints and priorities

**Guidelines:**
- Use `ask_user_with_options` for structured questions
- Focus on the big picture, not implementation details
- Identify natural feature boundaries for iterations

---

## Step 2: Create Iteration Breakdown

Plan iterations that deliver incremental value.

**Actions:**
1. Identify 2-5 major features/components
2. Order them by dependency and priority
3. Plan one iteration per feature
4. For each iteration, outline:
   - Feature/component to deliver
   - Analysis scope (what to explore)
   - Design scope (what APIs/changes needed)
   - Coding scope (what to implement)

**Iteration Design Principles:**
- **Incremental** - Each iteration builds on previous ones
- **Deliverable** - Each iteration produces working code
- **Focused** - One feature/component per iteration
- **Adaptive** - Planning phase allows course correction
- **Testable** - Each iteration can be verified

**DO NOT create files yet** - present the plan first in Step 3.

---

## Step 3: Present Plan and Get Approval

Get user approval before creating files.

**Actions:**
1. Present the iteration roadmap:
```
## Proposed Iteration Roadmap

**Global Goal:** [Overall objective]

### Iteration 00: [Feature Name]
- **Analysis:** [What to explore]
- **Design:** [What APIs to design]
- **Coding:** [What to implement]
- **Planning:** Review and plan Iteration 01

### Iteration 01: [Feature Name]
- **Analysis:** [What to explore]
- **Design:** [What APIs to design]
- **Coding:** [What to implement]
- **Planning:** Review and plan Iteration 02

[etc.]
```

2. Use `ask_user_with_options`:
   - "Approve and proceed"
   - "Request modifications"
   - "Start over"

3. Iterate until approved

---

## Step 4: Create Iteration Files

Create one markdown file per iteration.

**Actions:**
1. Create directory: `.tasks/[project-name]-iterations/`
2. For EACH iteration, create file: `iteration-00-[name].md`, `iteration-01-[name].md`, etc.
3. Use the template below

**Iteration File Template:**

```markdown
# Iteration NN: [Feature Name]

## Status Tracking

**Current Phase:** ⏳ Not Started
**Last Updated:** [To be filled by execution agent]
**Blockers:** None

### Phase Completion
- [ ] Analysis Phase - Status: ⏳ Pending
- [ ] Design Phase - Status: ⏳ Pending
- [ ] Coding Phase - Status: ⏳ Pending
- [ ] Planning Phase - Status: ⏳ Pending

---

## Overview

**Goal:** [What this iteration delivers - 1-2 sentences]

**Dependencies:** [Previous iteration dependencies (conceptual and technical), or "None" for iteration 00]

**Scope Boundaries:**
- In scope: [What this iteration covers]
- Out of scope: [What to defer to future iterations]

---

## Analysis Phase

### Review Previous Iterations

- Read CONTEXT.md for global goal and cross-cutting decisions
- Read all completed iteration files (iteration-00 through iteration-[N-1])
- Focus on "Iteration Summary" sections for quick overview
- Note key decisions, learnings, and patterns from previous work
- Identify dependencies and integration points

**Done When:**
- [ ] CONTEXT.md and previous iterations reviewed
- [ ] Key learnings and dependencies identified

### Gather Requirements

- Ask user specific questions about [feature]
- Clarify edge cases and constraints
- If new requirements discovered: note for future iterations, don't expand current scope

**Questions to Ask:**
- [Question 1]
- [Question 2]

**Done When:**
- [ ] All questions answered and documented

### Explore Codebase

- Analyze relevant code areas: [list areas]
- Review previous iteration's code (if applicable)
- Identify integration points

**Files/Areas:**
- `[path/to/file1]` - [What to understand]
- `[path/to/file2]` - [What to understand]

**Done When:**
- [ ] Code structure understood and integration points identified

---

## Design Phase

### Propose API Design

- Design APIs/interfaces for [feature]
- Present design to user (code snippets or descriptions)
- **ALWAYS use `ask_user_with_options` for approval**
- Iterate until user approves
- **After approval:** Document design in iteration file

**Design Considerations:**
- [Consideration 1]
- [Consideration 2]

**If Design Rejected:**
- "Wrong approach" or "missing requirements" → Return to Analysis phase
- "Try different API" → Propose alternative design
- "Fundamental blocker" → Mark iteration as BLOCKED, await user guidance

**Done When:**
- [ ] User approved design
- [ ] Design documented in iteration file (after approval)
- [ ] Changes committed: `docs [iteration-N]: design [feature-name]`

---

## Coding Phase

### Plan Testing

- Ask user if tests are needed for this feature
- If yes, plan test cases

**Done When:**
- [ ] User decision on testing documented

### Write Tests (if applicable)

- Write tests for [feature]
- Run tests and ensure they FAIL

**Done When:**
- [ ] Tests written and run (fail as expected)

### Implement Feature

- Implement the designed APIs
- Ensure code compiles without errors
- Run tests (if written) and ensure they PASS
- Present implementation to user for review
- **ALWAYS use `ask_user_with_options` for approval**
- Iterate until user approves
- **After approval:** Document implementation in iteration file

**Files to Modify:**
- `[path/to/file1]` - [What to implement]
- `[path/to/file2]` - [What to implement]

**If Implementation Rejected:**
- "Wrong implementation" → Fix implementation
- "Design needs changes" → Return to Design phase
- "Fundamental issue" → Mark iteration as BLOCKED, await user guidance

**Done When:**
- [ ] Implementation complete and compiles
- [ ] Tests pass (if applicable)
- [ ] User approved implementation
- [ ] Implementation documented in iteration file (after approval)
- [ ] Changes committed: `feat [iteration-N]: implement [feature-name]`

---

## Planning Phase

### Reflect & Plan Next Iteration

1. **Review Current Iteration:**
   - What was delivered?
   - What worked well?
   - What challenges were encountered?

2. **Assess Global Goal:**
   - Progress toward overall objective?
   - What's still missing?
   - Is global goal already achieved? (early exit check)

3. **Review Remaining Iterations:**
   - **Light Review (default):** Verify remaining iterations are still relevant
   - **Deep Review (only if needed):** Modify/merge/remove iterations if major blockers or new requirements emerged

4. **Present to User:**
   Use `ask_user_with_options`:
   - "Proceed with next iteration as planned"
   - "Modify next iteration"
   - "Add new iteration"
   - "Work is complete"

**If "Modify next iteration" selected:**
- Discuss changes with user (scope, design considerations, tasks)
- Edit next iteration file
- Update CONTEXT.md if dependencies changed
- Commit: `docs [iteration-N]: modify iteration-X scope`

**If "Add new iteration" selected:**
- Discuss feature/component and insertion point with user
- Create new iteration file (use next available number)
- Update CONTEXT.md with new iteration
- Commit: `docs [iteration-N]: add iteration-X for [feature-name]`

**Done When:**
- [ ] User approved the plan
- [ ] Iteration Summary section filled
- [ ] CONTEXT.md Iteration Progress updated (mandatory)
- [ ] Changes committed: `docs [iteration-N]: complete planning for [feature-name]`

---

## Iteration Summary

[To be filled by execution agent after completion]

**Delivered:**
- [What was implemented]

**Key Decisions:**
- [Important design/implementation decisions]

**Learnings:**
- [Insights for future iterations]

```

---

## Step 5: Setup Context File

Create lightweight dashboard and shared knowledge base.

**Actions:**
1. Create `CONTEXT.md` in the iterations directory
2. Fill in global goal and iteration list
3. Add initial project structure notes

**Context File Template:**

```markdown
# [Project Name] - Context

## Global Goal

[Overall objective - what are we trying to achieve?]

---

## Iteration Progress

- [ ] **iteration-00-[name].md** - [Feature Name] - Status: ⏳ Pending
- [ ] **iteration-01-[name].md** - [Feature Name] - Status: ⏳ Pending
- [ ] **iteration-02-[name].md** - [Feature Name] - Status: ⏳ Pending

**Status Values:** ⏳ Pending | 🔄 In Progress (Phase Name) | ✅ Complete | ❌ Blocked

---

## Shared Knowledge

### Project Structure
- [Key directory/package 1] - [Brief description]
- [Key directory/package 2] - [Brief description]

### Cross-Cutting Decisions
- [Decision affecting multiple iterations] - [Rationale]

### Integration Points
- [How iterations connect] - [Brief description]

### Global Blockers
- None

---

```

**Guidelines:**
- CONTEXT.md is a lightweight dashboard, NOT a detailed log
- Iteration files are the source of truth for iteration-specific content
- Only document cross-iteration concerns here
- Keep it scannable (30 seconds max to read entire file)

---

## Step 6: Generate Execution Prompt

Create PROMPT.md for execution agents.

**Actions:**
1. Create `PROMPT.md` in the iterations directory
2. Customize for the specific work
3. Inform user that setup is complete

**Prompt Template:**

```markdown
# [Project Name] - Execution Instructions

## Your Mission

[Brief description of the global goal]

**Context File:** `.tasks/[project-name]-iterations/CONTEXT.md`
**Iterations Directory:** `.tasks/[project-name]-iterations/`

---

## Execution Workflow

### 1. Read Context

Review `CONTEXT.md`:
- Current iteration and phase
- Previous iteration summaries
- Key decisions and learnings
- Project structure

### 2. Read Your Iteration File

Open the current iteration file (e.g., `iteration-00-[name].md`)
- Understand the iteration goal
- Identify current phase (Analysis/Design/Coding/Planning)
- Review phase tasks and acceptance criteria

### 3. Execute Current Phase

**Analysis Phase:**
- **FIRST:** Read CONTEXT.md for global goal and cross-cutting decisions
- **THEN:** Read all completed iteration files (focus on "Iteration Summary" sections)
- Ask user questions listed in the iteration file
- Explore specified code areas
- Document findings in iteration file
- Update CONTEXT.md ONLY if cross-cutting decisions, new key components, or global blockers discovered
- Update iteration file Status Tracking: ⏳ → 🔄 → ✅
- **No commit required**

**Design Phase:**
- Propose API designs (code snippets or descriptions)
- Present alternatives if applicable
- **ALWAYS use `ask_user_with_options` for approval**
- If rejected: "Wrong approach" → return to Analysis; "Try different API" → propose alternative; "Fundamental blocker" → mark BLOCKED
- Iterate on design until user approves
- **After approval:** Document approved design in iteration file
- **After approval:** Update CONTEXT.md ONLY if design introduces cross-cutting patterns
- **After approval:** Update iteration file Status Tracking
- **Commit:** `docs [iteration-N]: design [feature-name]`

**Coding Phase:**
- Ask user if tests are needed
- If yes: write tests → run tests → ensure they fail
- Implement the feature/APIs
- Run tests again → ensure they pass
- Verify code compiles without errors
- Present implementation to user for review
- **ALWAYS use `ask_user_with_options` for approval**
- If rejected: "Wrong implementation" → fix it; "Design needs changes" → return to Design; "Fundamental issue" → mark BLOCKED
- Iterate on implementation until user approves
- **After approval:** Document implementation in iteration file
- **After approval:** Update CONTEXT.md ONLY if global blockers or integration issues discovered
- **After approval:** Update iteration file Status Tracking
- **Commit:** `feat [iteration-N]: implement [feature-name]`

**Planning Phase:**
- Review what was delivered in current iteration
- Assess progress toward global goal
- Propose next iteration plan or declare completion
- **ALWAYS use `ask_user_with_options` to present options:**
  - "Proceed with next iteration as planned"
  - "Modify next iteration"
  - "Add new iteration"
  - "Work is complete"
- If "Modify next iteration": discuss changes, edit iteration file, update CONTEXT.md if dependencies changed, commit with `docs [iteration-N]: modify iteration-X scope`
- If "Add new iteration": discuss feature, create new iteration file, update CONTEXT.md with new iteration, commit with `docs [iteration-N]: add iteration-X for [feature-name]`
- After user approves:
  - Fill "Iteration Summary" section in iteration file
  - Update iteration file status to Complete
  - **MANDATORY: Update CONTEXT.md Iteration Progress**
  - Update iteration file Status Tracking
- **Commit:** `docs [iteration-N]: complete planning for [feature-name]`

### 4. Phase Transition Rules

- **Analysis → Design:** All analysis tasks complete, CONTEXT.md updated if cross-cutting concerns found (no commit)
- **Design → Coding:** User approved design, CONTEXT.md updated if cross-cutting patterns found, changes committed
- **Coding → Planning:** Implementation complete, tests pass, user approved, CONTEXT.md updated if global blockers found, changes committed
- **Planning → Next Iteration:** User approved next steps, CONTEXT.md Iteration Progress updated (mandatory), changes committed

### 5. Handling Rejections

**If Design Rejected:**
- "Wrong approach" or "missing requirements" → Return to Analysis phase
- "Try different API" → Propose alternative design
- "Fundamental blocker" → Mark iteration as BLOCKED, await user guidance

**If Implementation Rejected:**
- "Wrong implementation" → Fix implementation
- "Design needs changes" → Return to Design phase
- "Fundamental issue" → Mark iteration as BLOCKED, await user guidance

**If Current Iteration Failed/Blocked:**
- Document what went wrong in CONTEXT.md
- Do NOT proceed to next iteration with broken foundation
- Options: retry iteration, skip and revisit later, or redesign approach

**Note:** Do NOT proceed to Coding with rejected design, or to Planning with rejected implementation

### 6. Commit Guidelines

**Minimum 3 commits per iteration:**
1. **Design Phase:** After user approval
   - Updated iteration file (design details in appropriate section)
   - Updated CONTEXT.md (ONLY if cross-cutting decisions)
   - Message: `docs [iteration-N]: design [feature-name]`

2. **Coding Phase:** After user approval
   - All code changes
   - Test files (if applicable)
   - Updated iteration file (implementation notes)
   - Updated CONTEXT.md (ONLY if global blockers/integration issues)
   - Message: `feat [iteration-N]: implement [feature-name]`

3. **Planning Phase:** After user approval
   - Updated iteration file (Iteration Summary filled, status Complete)
   - Updated CONTEXT.md (Iteration Progress updated - mandatory)
   - Message: `docs [iteration-N]: complete planning for [feature-name]`
   - Additional commits if modifying/adding iterations

**Analysis phase does NOT require a commit**

---

## Guidelines

**Code Quality:**
- Ensure code compiles before marking phase complete
- Follow project conventions
- Write clean, maintainable code

**Communication:**
- Ask for guidance if blocked
- Use `ask_user_with_options` for decisions

**Context Updates:**
- **Iteration files = source of truth** for detailed findings, designs, implementations
- **CONTEXT.md = lightweight dashboard** for global goal, iteration progress, cross-cutting concerns
- **Mandatory CONTEXT.md updates:**
  - Iteration Progress (after Planning phase)
- **Conditional CONTEXT.md updates (ONLY if found):**
  - Cross-cutting decisions affecting multiple iterations
  - New key project structure components
  - Global blockers
- Keep CONTEXT.md scannable (30 seconds max)
- Use file/line references (e.g., 'See FooService.kt:45-67 for new API')

**Iteration File Updates:**
- Always update Status Tracking section after each phase:
  - Current Phase: Analysis | Design | Coding | Planning | Complete
  - Last Updated: Current date
  - Phase Completion: Mark checkboxes and update status (⏳ → 🔄 → ✅)
- Fill appropriate sections with detailed findings/designs/implementations
- Fill Iteration Summary during Planning phase

**Previous Iterations Review (MANDATORY at start of Analysis):**
1. Read CONTEXT.md first (global goal, cross-cutting decisions, project structure)
2. Read all completed iteration files (focus on "Iteration Summary" sections)
3. Note key decisions, learnings, patterns, and integration points
4. Update CONTEXT.md ONLY if new cross-cutting concerns discovered

**Error Handling:**
- If blocked: update iteration file Status Tracking with blocker details
- If global blocker: also document in CONTEXT.md Global Blockers section
- Await user guidance before proceeding
- Never skip phases or iterations

**Specific Notes:**
[Customized by Setup Agent for this specific work]

---

## Completion

Work is complete when:
- All iterations are marked complete in CONTEXT.md
- Global goal is achieved
- User confirms satisfaction

```

---

## Step 7: Commit Setup

Commit all iteration setup files.

**Actions:**
1. Stage all created files:
   - All iteration files (`iteration-*.md`)
   - `CONTEXT.md`
   - `PROMPT.md`
2. Commit with message: `docs [iterations]: setup [project-name] iteration workflow`

---

**YOUR JOB IS DONE** - inform the user that PROMPT.md is ready for execution agents.

---

## File Naming Standards

- Prompt file: `PROMPT.md`
- Context file: `CONTEXT.md`
- Iteration files: `iteration-00-[name].md`, `iteration-01-[name].md`, etc.
- Directory: `.tasks/[project-name]-iterations/`
