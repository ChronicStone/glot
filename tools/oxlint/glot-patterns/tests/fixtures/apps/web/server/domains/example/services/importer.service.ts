interface ImporterOptions {
  id: string
}

export default class ImporterService {
  run(options: ImporterOptions) {
    return options.id
  }
}
