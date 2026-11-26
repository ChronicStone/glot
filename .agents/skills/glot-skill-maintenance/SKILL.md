---
name: glot-skill-maintenance
description: Reviews and updates Glot agent rules, skills, routing, and context documents. Use when changing repository guidance, enforcement, or the agent-context checker. Do not use for application code that leaves guidance untouched.
---

# Maintain Glot guidance

Keep decisions that agents cannot reliably recover from code: ownership, rejected approaches, user constraints, and routing. Omit dependency tutorials, inventories of current files, generic advice, and speculative future skills.

## Apply

1. Find the current authoritative owner for the rule and every surface that routes to it.
2. Edit that owner, remove conflicting copies, and keep supporting detail behind one direct reference.
3. Run `bun run check:agent-context`.
4. Inspect each finding against repository intent. Fix demonstrated routing or clarity failures, then rerun the check once.

`glot-code-patterns` is the entrypoint. Keep `AGENTS.md` as the mandatory router, `CONTEXT.md` as vocabulary only, `docs/architecture.md` as system explanation, ADRs as hard-to-reverse rationale, and skills as change procedures. Put each rule in one owner and link to it from the other surfaces.

Lint handles deterministic syntax and placement (`tools/oxlint/glot-patterns`, with its own tests). Skills and review handle coherent ownership, useful reuse, and simplicity. When a rule can be checked mechanically, add or extend a lint rule with a fixture test instead of more prose.
