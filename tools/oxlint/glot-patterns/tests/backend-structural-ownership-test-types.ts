export interface BackendStructuralDiagnostic {
  code?: string
  filename: string
  message: string
}

export interface BackendStructuralLintResult {
  diagnostics: BackendStructuralDiagnostic[]
}
