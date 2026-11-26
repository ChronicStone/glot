import { eslintCompatPlugin } from '@oxlint/plugins'

import { authoredFunctionParametersRule } from './rules/authored-function-parameters.ts'
import { backendStructuralOwnershipRule } from './rules/backend-structural-ownership.ts'
import { logicalCodeSpacingRule } from './rules/logical-code-spacing.ts'
import { entityRolePlacementRule } from './rules/entity-role-placement.ts'
import { noAmbientOwnerParametersRule } from './rules/no-ambient-owner-parameters.ts'
import { noManualRuntimeImportsRule } from './rules/no-manual-runtime-imports.ts'
import { noNuxtTestMockingRule } from './rules/no-nuxt-test-mocking.ts'
import { noRightAlignedCellsRule } from './rules/no-right-aligned-cells.ts'
import { noTypeAssertionsInApplicationRuntimeRule } from './rules/no-type-assertions-in-application-runtime.ts'
import { requireExplicitRefTypeRule } from './rules/require-explicit-ref-type.ts'

const glotPatternsPlugin = eslintCompatPlugin({
  meta: { name: 'glot-patterns' },
  rules: {
    'logical-code-spacing': logicalCodeSpacingRule,
    'authored-function-parameters': authoredFunctionParametersRule,
    'backend-structural-ownership': backendStructuralOwnershipRule,
    'entity-role-placement': entityRolePlacementRule,
    'no-ambient-owner-parameters': noAmbientOwnerParametersRule,
    'no-manual-runtime-imports': noManualRuntimeImportsRule,
    'no-nuxt-test-mocking': noNuxtTestMockingRule,
    'no-right-aligned-cells': noRightAlignedCellsRule,
    'no-type-assertions-in-application-runtime': noTypeAssertionsInApplicationRuntimeRule,
    'require-explicit-ref-type': requireExplicitRefTypeRule,
  },
})

export default glotPatternsPlugin
