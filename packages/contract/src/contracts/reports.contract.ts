import { oc } from '@orpc/contract'
import { openapi } from '@orpc/openapi'
import { ADMIN_ONLY_ERRORS, NOT_FOUND_ERRORS } from '../constants/contract.constants.ts'
import { monthlyReportInputSchema, monthlyReportSchema } from '../validators/reports.validator.ts'

export const reportsContract = {
  monthly: oc
    .meta(
      openapi({
        method: 'GET',
        path: '/workspaces/{workspaceId}/reports/{month}',
        operationId: 'getMonthlyReport',
        summary: 'Words written and reviewed per person in a month',
        description:
          'For each person, the words of the texts they wrote and sent for review and the words of the texts they approved during a calendar month (UTC), in total and per language. Owners and admins only.',
        tags: ['reports'],
      }),
    )
    .input(monthlyReportInputSchema)
    .output(monthlyReportSchema)
    .errors({ ...NOT_FOUND_ERRORS, ...ADMIN_ONLY_ERRORS }),
}
