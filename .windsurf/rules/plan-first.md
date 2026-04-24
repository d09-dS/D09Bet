---
description: Require a structured change plan before multi-file edits -- use when the user requests features, refactors, or tasks affecting multiple files
trigger: model_decision
---

# Plan-First Execution

**Every multi-file code change MUST follow this pattern:**

## 1. Generate a Change Plan

Before writing, editing, or deleting any file, present a structured change plan:

```
## Change Plan

| #  | File                          | Action         | What Changes                          |
|----|-------------------------------|----------------|---------------------------------------|
| 1  | src/auth/auth.service.ts      | EDIT           | Add JWT refresh token logic           |
| 2  | src/auth/auth.module.ts       | EDIT           | Register new JwtRefreshGuard provider |
| 3  | src/guards/jwt-refresh.guard.ts | CREATE       | New guard for refresh token endpoint  |
```

The plan must include:

- **File path** (relative to project root)
- **Action** (`CREATE`, `EDIT`, `DELETE`, `RENAME`)
- **What changes** (one-line summary of the modification)

## 2. Wait for Confirmation

- After presenting the plan, ask: **"Proceed with these changes? (yes/no)"**
- **Do NOT start editing files until the user explicitly confirms**
- If the user says no or requests modifications, update the plan and present it again

## 3. Execute

- Only after confirmation: apply changes in the order listed in the plan
- If an unexpected issue arises during execution, stop and inform the user

## Exceptions

- **Read-only operations** (analysis, code review, architecture review) do not require a change plan
- **Single-line fixes** explicitly requested by the user (e.g., "fix the typo on line 42") can be applied directly
- **Workflow execution** -- workflows triggered via slash commands (e.g., `/project-init`) define their own step sequence and skip the change plan entirely. Execute steps directly without generating a plan or waiting for confirmation. The workflow's final summary serves as the review.
- The user can opt out by saying "skip plan" or "just do it" for a specific task
