---
name: prd-creator
description: Guides creation of comprehensive Product Requirement Documents (PRDs) for software projects through structured questioning and validation, then generates implementation task lists in JSON format. Use when users want to document a software idea, create specifications for development, plan a new application feature/bug, or break down requirements into actionable tasks. Transforms ideas into implementation-ready documents with verifiable pass criteria.
license: MIT
metadata:
  author: pageai
  version: '1.0.1'
  tags: prd, product requirements, software development, documentation, task generation
  website: https://pageai.pro/blog/long-running-ai-coding-agents-ralph-loop#step-2-write-your-requirements
---

# PRD Creation Assistant

Transform software ideas into comprehensive PRDs and actionable implementation tasks through a two-part process.

## Overview

This skill helps beginner-level developers.

1. Receive an implementation description from the user
2. Create detailed PRD documents through structured questioning
3. Generate implementation task lists in JSON format for developers
4. Write an overall description of the project. An executive summary that gives a high level overview of the app and its main features.

### Part 1: Implementation Description

You will receive a lacking implementation description from the user.
The main goal is to comprehend the intent and think about the larger architecture and a robust way to implement it, filling in the gaps.

### Part 2: PRD Creation

**File**: [PRD.md](PRD.md)

You will need to ask clarifying questions to get a clear understanding of the implementation.

**When to use**: User wants to document a software idea or create feature specifications

**What it does**:
- Guides structured questioning to gather all requirements
- Creates executive summary for validation
- Researches competitive landscape
- Generates comprehensive PRD.md with:
  - App overview and objectives
  - Target audience
  - Success metrics and KPIs
  - Competitive analysis
  - Core features and user flows
  - Technical stack recommendations
  - Security considerations
  - Assumptions and dependencies

**Process**:
1. Ask clarifying questions using `AskUserQuestion` tool
2. Create executive summary for user approval
3. Research competition via WebSearch
4. Generate complete PRD
5. Iterate based on feedback

**Read [PRD.md](PRD.md) for complete instructions.**

---

### Part 3: Implementation Task Generation

**File**: [JSON.md](JSON.md)

You will need to analyze the completed PRD and generate a comprehensive task list in JSON format.

**When to use**: After PRD is complete and approved, or user requests task breakdown

**What it does**:
- Analyzes the completed PRD
- Generates a complete list of implementation tasks in JSON format, covering all features and requirements from the PRD
- Keeps the tasks small and manageable
- Categorizes tasks by type (functional, ui-ux, api-endpoint, security, etc.)
- Defines verification ('pass') steps for each task
- Creates developer-ready checklist

**IMPORTANT**:
- Each task should be simple enough to be completed in maximum 10 minutes.
- If a task is too complex, it should be split into smaller tasks.

**Read [JSON.md](JSON.md) for complete instructions.**

## Part 4: Overall Description

You will need to read the completed PRD and generate an overall description of the project in `PROJECT_ROOT/.agent/prd/SUMMARY.md`.

The description should be short, concise and contain:
- An overall description of the project
- The main features of the app
- Key user flows
- A short list of key requirements

## Quick Start

**If user wants to create a PRD:**
1. Read [PRD.md](PRD.md)
2. Follow the PRD creation workflow
3. If needed, update the overall description [SUMMARY.md](SUMMARY.md)
4. After PRD completion, ask: "Would you like me to generate implementation tasks? See Part 2."

**If user wants implementation tasks for an existing PRD:**
1. Read [JSON.md](JSON.md)
2. Read the PRD file
3. Generate comprehensive task list in JSON format
4. Save as `tasks.json`

**If user wants both:**
1. Complete PRD creation first [PRD.md](PRD.md)
2. Get user approval on PRD
3. If needed, update the overall description [SUMMARY.md](SUMMARY.md)
4. Proceed to generate implementation tasks [JSON.md](JSON.md)

**If a user want to update the PRD:**
1. Read [PRD.md](PRD.md)
2. Update the PRD
3. Save as `PRD.md`
4. If needed, update the overall description [SUMMARY.md](SUMMARY.md)
5. Ask user if they want to generate implementation tasks

**If a user want to update the implementation tasks:**
1. Read [JSON.md](JSON.md)
2. Update the implementation tasks
3. Save as `tasks.json`
4. Ask user if they want to update the PRD again

**If user wants to update both the PRD and the implementation tasks:**
1. Update the PRD first [PRD.md](PRD.md)
2. If needed, update the overall description [SUMMARY.md](SUMMARY.md)
3. Update the implementation tasks [JSON.md](JSON.md)
4. Save as `PRD.md` and `tasks.json`

## After completion

Ensure the required files are present:
- PROJECT_ROOT/.agent/prd/PRD.md
- PROJECT_ROOT/.agent/prd/SUMMARY.md
- PROJECT_ROOT/.agent/tasks.json

If they are not present, warn the user and ask if they would like to create any of them.

## Important Constraints

- Do not generate code - focus on documentation and task specification
- Use AskUserQuestion extensively in Part 1 to clarify requirements
- In Part 2, generate comprehensive task lists (50-200+ tasks for typical projects)
- Always initialize tasks with `"passes": false` - never mark tasks complete during generation
- Use available tools: AskUserQuestion, WebSearch, Sequential Thinking, Read
