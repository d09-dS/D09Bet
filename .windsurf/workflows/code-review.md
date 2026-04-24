---
description: Perform a structured code review with checklist and actionable feedback
---

# Code Review Workflow

This workflow performs a systematic code review on the specified files or changes, producing structured, actionable feedback.

## Step 1: Identify Review Scope

Determine what to review:

- **Single file:** User specifies a file path
- **Multiple files:** User specifies a directory or glob pattern
- **Git diff:** Review uncommitted changes (`git diff`) or a PR branch diff
- **Module:** Review an entire module or feature

If the user provides a git branch or PR reference, diff against the target branch:

```bash
git diff main...HEAD --name-only
```

## Step 2: Read and Analyze Code

For each file in scope:

1. Read the full file content
2. Identify the language, framework, and purpose
3. Cross-reference with active rules in `.windsurf/rules/`

## Step 3: Apply Review Checklist

Evaluate each file against these categories, ordered by priority:

### CRITICAL (must fix before merge)

- [ ] **Security vulnerabilities** -- SQL injection, XSS, SSRF, IDOR, hardcoded secrets
- [ ] **Data loss risk** -- destructive operations without confirmation, missing transactions
- [ ] **Authentication/authorization bypass** -- missing auth checks, broken access control

### HIGH (should fix before merge)

- [ ] **Error handling** -- unhandled promise rejections, empty catch blocks, swallowed errors
- [ ] **Input validation** -- missing server-side validation, unvalidated user input
- [ ] **Race conditions** -- concurrent mutations without locking or optimistic concurrency
- [ ] **N+1 queries** -- database calls inside loops without batching
- [ ] **Resource leaks** -- unclosed connections, streams, file handles

### MEDIUM (improve in this PR or follow-up)

- [ ] **Naming clarity** -- variables, functions, classes follow conventions and are self-documenting
- [ ] **Single Responsibility** -- functions/classes do one thing, files are cohesive
- [ ] **Test coverage** -- new logic has corresponding tests, edge cases covered
- [ ] **API contract** -- response format matches `api-standards.md`, correct status codes
- [ ] **Accessibility** -- new UI elements have ARIA labels, keyboard navigation, contrast

### LOW (nice to have)

- [ ] **Code duplication** -- repeated logic that could be extracted
- [ ] **Performance** -- unnecessary re-renders, missing memoization, unoptimized queries
- [ ] **Documentation** -- complex logic has inline comments, public APIs are documented
- [ ] **Dead code** -- unused imports, unreachable branches, commented-out code

## Step 4: Generate Review Report

Structure findings as follows:

```markdown
# Code Review: [scope description]

## Summary

[1-2 sentence overview of findings]

## Findings

### CRITICAL

- **[filename:line]** -- [description of issue]
  - **Why:** [explanation of risk]
  - **Fix:** [specific code suggestion]

### HIGH

- **[filename:line]** -- [description of issue]
  - **Fix:** [specific code suggestion]

### MEDIUM

- **[filename:line]** -- [description of issue]
  - **Suggestion:** [improvement]

### LOW

- **[filename:line]** -- [description of issue]

## Positive Highlights

- [something done well -- acknowledge good patterns]

## Verdict

- [ ] Approved
- [ ] Approved with minor changes (no CRITICAL/HIGH issues)
- [ ] Changes requested (CRITICAL or HIGH issues found)
```

## Step 5: Provide Fix Suggestions

For every CRITICAL and HIGH finding, provide a concrete code fix:

```
// Finding: Missing authorization check in GET /orders/:id
// File: src/controllers/orders.controller.ts:42

// Before (vulnerable to IDOR)
const order = await orderRepo.findById(req.params.id);

// After (ownership verified)
const order = await orderRepo.findById(req.params.id);
if (!order || order.userId !== req.user.id) {
  throw new ForbiddenError("Access denied");
}
```

## Step 6: Cross-Reference with Rules

For each finding, reference the specific rule from `.windsurf/rules/` that applies:

- Security findings reference `security.md` rule priorities
- Code quality findings reference `code-quality.md`
- API findings reference `api-standards.md`
- Test findings reference `testing.md`

This connects the review to the project's established standards.

## Review Principles

- **Be specific** -- "Line 42 has an IDOR vulnerability" not "security could be improved"
- **Provide fixes** -- every finding above LOW should include a concrete suggestion
- **Prioritize** -- CRITICAL issues first, don't bury them under style nits
- **Acknowledge good work** -- highlight well-written code, good patterns, thorough tests
- **Stay objective** -- reference rules and standards, not personal preference
- **Consider context** -- a quick prototype has different standards than production code

## Gotchas

- **Reviewing only the diff, not the context** -- a change may look correct in isolation but break invariants elsewhere. Always read surrounding code.
- **Style nits drowning out real issues** -- if there are CRITICAL findings, don't spend half the review on formatting. Prioritize.
- **Suggesting rewrites for working code** -- unless it's a security/correctness issue, suggest improvements as follow-up tasks, not blockers.
- **Missing transitive effects** -- renaming a function or changing a type may break callers. Check usages before approving.

## Step 7: Output Summary

```
Code Review Complete

Scope: [files/module reviewed]
Files reviewed: [count]

Findings:
- CRITICAL: [count]
- HIGH: [count]
- MEDIUM: [count]
- LOW: [count]

Verdict: [Approved / Approved with minor changes / Changes requested]

Top action items:
1. [most important fix]
2. [second most important fix]
3. [third most important fix]
```

## Step 8: Save to Dashboard

Persist the review results for the dashboard:

1. Read `.windsurf/dashboard-data.json` (create with `{"projects":[],"runs":[],"globalStats":{}}` if missing)
2. Build a timestamp string: current ISO time with colons replaced by hyphens (e.g. `2026-04-10T09-15-00`)
3. Build a date string from the timestamp: `YYYY-MM-DD` (e.g. `2026-04-10`)
4. Create directory `.windsurf/dashboard/runs/code-review/[date]/[timestamp]/`
5. Write `findings.json` into that directory with the run data
6. Write `report.md` into that directory with the full review report
7. Append a new entry to `runs[]` in `dashboard-data.json`:

```json
{
  "workflow": "code-review",
  "timestamp": "[ISO timestamp]",
  "score": "[100 - 15*critical - 8*high - 3*medium - 1*low, min 0]",
  "maxScore": 100,
  "verdict": "[Approved / Approved with minor changes / Changes requested]",
  "findings": { "critical": 0, "high": 0, "medium": 0, "low": 0 },
  "highlights": ["[positive patterns found]"],
  "issues": ["[top 3 findings as short strings]"],
  "summary": "[1-2 sentence overview]",
  "reportPath": ".windsurf/dashboard/runs/code-review/[date]/[timestamp]/"
}
```

8. Write updated `dashboard-data.json` back to disk
