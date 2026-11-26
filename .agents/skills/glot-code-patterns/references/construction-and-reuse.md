# Construction and reuse

Use this decision sequence before extracting a declaration:

1. Identify the operation that owns the behavior and keep the first implementation there.
2. Check whether a native library or existing module already owns the capability.
3. Name the concrete second caller, variant, or independently changing lifecycle.
4. Choose the smallest interface that hides the shared complexity.
5. Apply the deletion test: the module is useful only when removing it spreads meaningful complexity back across callers.

Keep a one-use expression or sequence local. Extract a utility only when a cohesive pure operation has actual or reasonably expected reuse. Database writes, queries, IO and orchestration belong to service operations, not utilities. A private service method may own a cohesive step; it must not become a wrapper that only forwards one call.

Group related necessary declarations in cohesive files of one role. Do not create a file for each type or helper, a class per table, or split one transaction across pass-through services. Small incidental duplication is acceptable; a shared business rule has one owner.

When several variants share orchestration, define variants as typed configuration and keep execution in one deep runtime.

For an owned or chosen library such as better-drizzle, oRPC or ui-sdk, fix a missing capability upstream and consume the published version rather than inventing a competing protocol or patching installed packages.
