---
name: semantic-analysis
description: Explain the intent and responsibilities of files/classes in the selected scope.
use-by:
  - analyzer
---

## Goal
Explain what the code *means*: responsibilities, contracts, and assumptions.

## Inputs
- Code scope selected by user
- Depth: Shallow or Deep

## Shallow mode (fast)

Goal: understand the main abstractions without reading everything.

1. For each file (or top 10-30 files if scope is large):
   - Use `file_structure` to list declarations.
   - Use `read_file` selectively:
     - headers/imports
     - public classes/functions
     - constructors / factory functions
     - key overridden methods
2. Summarize per file:
   - responsibility (1-2 sentences)
   - key public API (names only)
   - main collaborators (types referenced)
3. Build a mini-glossary:
   - domain terms from identifiers (enums/constants/class names)

## Deep mode (thorough)

Goal: produce a reliable per-entity understanding with invariants and side effects.

1. For each file in scope (or for the critical subset identified in Shallow):
   - Use `file_structure` first.
   - Use `read_file` to understand:
     - data flow: inputs → transformations → outputs
     - state: fields, caches, lifecycle
     - side effects: IO, UI, persistence, threading
     - error handling and fallbacks
2. Distinguish API surface vs internals:
   - what is called from outside the file/module
   - what is a helper/private detail
3. Record assumptions/invariants explicitly:
   - nullability expectations
   - required call order
   - “must be on EDT” / “must be under read action” style constraints (if IntelliJ code)

## Output

- Per-file (or per-entity) summary:
  - Responsibility
  - Key declarations
  - Inputs/Outputs/Side effects
  - Assumptions/Invariants
  - Important collaborators (with file paths when available)
- Glossary of terms (5-30 items depending on scope)
