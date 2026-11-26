interface LegacyPolicyContext {
  id: string
}

function policyHelper() {
  return true
}

export default class LegacyPolicy {
  authorize(context: LegacyPolicyContext) {
    return policyHelper() && context.id.length > 0
  }
}
