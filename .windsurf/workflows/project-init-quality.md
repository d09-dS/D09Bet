---
description: "Phase 4: Quality analysis + optimization + summary (called automatically by /project-init)"
---

# Phase 4: Quality Analysis + Optimization + Summary

This phase is called automatically after Phase 3 (enhancement). Do NOT run this manually -- use `/project-init` instead.

**Prerequisites:** `.windsurf/project-init-config.json` must exist with `_progress.phase3_enhancement: true`.

---

## 4.1 Validation Checklist Analysis

After all rules and workflows have been generated and enhanced, run the **binary validation checklist** from `.windsurf/workflows/_ref/validation-checklist.md`.

### Process

1. **Read** `_ref/validation-checklist.md` for the full checklist definition
2. **For each rule file** in `.windsurf/rules/`:
   - Run checks A1-A8 (Structure & Format)
   - Run checks B1-B10 (Content Depth & Relevance)
   - Run checks C1-C4 (Stack Alignment)
3. **For each workflow file** in `.windsurf/workflows/` that was extended:
   - Run checks D1-D6 (Workflow Quality)
4. **System-wide checks** E1-E12

### Analysis Output

Show results as a checklist with `[x]` (pass) or `[ ]` (fail) per criterion:

```
VALIDATION REPORT
=================

Rule: code-quality.md (8/8 structure, 10/10 content, 3/4 alignment)
  [x] A1 Frontmatter with description + trigger
  [x] A2 Valid trigger mode
  [x] A3 Globs match stack
  [x] A4 Under 12,000 chars
  [x] A5 Kebab-case filename
  [x] A6 H1 after frontmatter
  [x] A7 Context cost matches trigger
  [x] A8 Description quality (if model_decision)
  [x] B1 Rule Priorities table
  [x] B2 3+ Good/Bad code examples
  [x] B3 Stack-correct language
  [x] B4 Gotchas section (3+ entries)
  [x] B5 No generic filler
  [x] B6 Actionable rules
  [x] B7 Concrete library references
  [x] B8 Reasoning-based instructions
  [x] B9 Step-by-step procedures
  [x] B10 Defaults over menus
  [x] C1 Framework-specific patterns
  [ ] C2 No cross-stack contamination    <-- FAIL
  [x] C3 TypeScript examples
  [x] C4 Multi-stack coverage

Rule: security.md (...)
  ...

System-Wide:
  [x] E1 Config is valid JSON
  ...

PASS RATE: 35/38 = 92% (threshold: 90%)
STATUS: PASS
```

---

## 4.2 Automatic Optimization

If the **pass rate is below 90%**, automatically optimize by fixing **only the failing criteria**:

### Optimization Process

1. **List all failing criteria** with the affected file and criterion ID
2. **For each failure**, apply the targeted fix:

| Failing Criterion        | Fix Action                                                                                          |
| ------------------------ | --------------------------------------------------------------------------------------------------- |
| A4 (too long)            | Split rule into focused sections, remove redundant content                                          |
| B1 (no priorities)       | Add `## Rule Priorities` section with priority table                                                |
| B2 (few examples)        | Add code examples with `// Good` / `// Bad` contrast                                                |
| B3 (wrong language)      | Replace code examples with stack-correct language                                                   |
| B4 (no gotchas)          | Add `## Gotchas` section with 3+ framework-specific pitfalls                                        |
| B5 (generic filler)      | Replace generic phrases with concrete, actionable instructions                                      |
| B7 (no library refs)     | Add specific library/tool names from the detected stack                                             |
| C1 (missing patterns)    | Add framework-specific patterns from `_ref/enhancement-examples.md`                                 |
| C2 (cross-contamination) | Remove code/patterns from other frameworks                                                          |
| C4 (incomplete coverage) | Add examples for each configured stack                                                              |
| A7 (context cost)        | Move large `always_on` rules to `glob` or `model_decision` trigger, or split into focused sub-rules |
| A8 (weak description)    | Rewrite `description` to clearly explain when/why the rule applies                                  |
| B8 (no reasoning)        | Add "because"/"to prevent"/"otherwise" explanations to key instructions                             |
| B9 (no procedures)       | Convert declarative statements into numbered step-by-step procedures                                |
| B10 (option lists)       | Replace equal-weight option lists with clear default + escape hatch                                 |
| D6 (no error handling)   | Add "If X fails..." fallback steps to workflow                                                      |
| E11 (context budget)     | Reduce total `always_on` character count by converting rules to `glob` or `model_decision`          |
| E12 (duplicate content)  | Remove duplicated paragraphs/code blocks, reference the base rule instead                           |

3. **Re-validate** -- run the checklist again on modified files only
4. **Repeat** -- max 3 rounds

### Maximum Iterations

- **Max 3 optimization rounds** to prevent infinite loops
- If still below 90% after 3 rounds, show warning with remaining failures and proceed

---

## 4.3 Final Summary

After optimization, show the user the final overview:

```
SKILL PACKAGE GENERATION COMPLETE
==================================

DETECTED STACK
  Frontend: [framework] + [styling] + [uiLibrary]
    Bundler: [bundler] | Forms: [formLibrary]
    Data Fetching: [dataFetching] | State: [stateManagement]
  Backend: [framework] + [database] + [orm]
    Validation: [validation] | Caching: [caching]
    Queue: [messageQueue] | Realtime: [realtime]
  Architecture: TypeScript=[yes/no], i18n=[yes/no], Auth=[type]
    API Style: [apiStyle] | Monorepo: [monorepo]
    Pattern: [detected architecture pattern]
  DevOps: [packageManager] | CI/CD: [cicd] | Deploy: [deployment]

GENERATED RULES (8 base + N stack-specific)
  code-quality.md              [PASS 17/17]
  security.md                  [PASS 16/17]
  error-handling.md            [PASS 17/17]
  performance.md               [PASS 17/17]
  accessibility.md             [PASS 15/17]
  api-standards.md             [PASS 16/17]
  i18n.md                      [PASS 17/17]
  testing.md                   [PASS 17/17]
  [stack-specific rules...]    [PASS n/n]

ENHANCED BASE RULES
  [list of base rules that received stack-specific enhancements]

EXTENDED WORKFLOWS
  [list of enhanced workflows with stack context]

QUALITY METRICS
  Pass Rate: N/M = X% (threshold: 90%)
  Optimization Rounds: N
  Failing Criteria: [list or "none"]
  Status: VALIDATED
```

After displaying the summary, announce your stack-aware developer identity based on the detected stack, as defined in `global-agent.md`. Example:

```
I am now operating as a Senior Django / React Developer for this project.
All generated code, comments, and documentation will be in English.
```

---

## Phase Complete

After showing the summary:

1. Update `_progress.phase4_quality` to `true` in `.windsurf/project-init-config.json`
2. Update `_progress.phase4_completed_at` to the current ISO timestamp
3. The workflow is now fully complete

---

## Notes

- The UI is only for stack selection -- **no project scaffolding** is performed
- Rules are **dynamically generated** and validated against a **binary checklist** (38 criteria, A1-E12)
- Quality is measured by **pass rate** (>= 90% required), not subjective scores
- Optimization targets only **failing criteria** -- no unnecessary rewrites
- Base rules are **enhanced** with stack-specific depth when stack-specific rules are added
- Workflows are **extended** based on selected stack capabilities
- Rules in `.windsurf/rules/` are automatically applied to every AI response
- Detection maps are loaded from `.windsurf/tools/detection-maps.json` (single source of truth)
- The agent can analyze projects **without Node.js** by reading `detection-maps.json` directly
- Run `/validate-rules` independently to re-validate at any time
