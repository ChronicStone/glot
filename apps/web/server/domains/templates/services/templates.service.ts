import { ACTOR_KINDS } from '@glot/auth'
import type {
  PreviewAdapterBrand,
  PreviewAdapterTemplate,
  TemplateList,
  TemplateListInput,
  TemplatePreviewInput,
  TemplateRefInput,
  TemplateSendTestInput,
  Text,
} from '@glot/contract'
import { ORPCError } from '@orpc/server'
import type { RequestContext } from '../../../types/context.types.ts'
import { ProjectsService } from '../../projects/services/projects.service.ts'
import { TextsService } from '../../texts/services/texts.service.ts'
import { templateTexts, valueIn, worstState } from '../utils/template-texts.utils.ts'

export class TemplatesService {
  readonly #context: RequestContext

  constructor(context: RequestContext) {
    this.#context = context
  }

  async list(input: TemplateListInput): Promise<TemplateList> {
    const { project, url } = await this.#project(input.projectId)
    const { catalog, available } = await this.#context.previews.catalog(url)
    const texts = await new TextsService(this.#context).all(project.id)
    const [first] = catalog.brands

    return {
      available,
      brands: catalog.brands.map(({ id, name }) => ({ id, name })),
      sendTest: catalog.sendTest,
      templates: catalog.templates.map((template) => {
        const used = first ? templateTexts({ template, brand: first, texts }) : []

        return {
          id: template.id,
          name: template.name,
          group: template.group,
          kind: template.kind,
          texts: used.length,
          state: worstState(used),
        }
      }),
    }
  }

  async texts(input: TemplateRefInput) {
    const { template, brand, texts } = await this.#resolve(input)

    return { items: templateTexts({ template, brand, texts }) }
  }

  async preview(input: TemplatePreviewInput) {
    const resolved = await this.#resolve(input)

    return this.#context.previews.render({
      url: resolved.url,
      request: this.#request({ ...resolved, language: input.language, overrides: input.overrides }),
    })
  }

  async sendTest(input: TemplateSendTestInput) {
    const { actor } = this.#context

    if (actor.kind !== ACTOR_KINDS.PERSON) {
      throw new ORPCError('PEOPLE_ONLY')
    }

    const resolved = await this.#resolve(input)

    await this.#context.previews.sendTest({
      url: resolved.url,
      request: {
        ...this.#request({ ...resolved, language: input.language, overrides: [] }),
        to: actor.user.email,
      },
    })

    return { to: actor.user.email }
  }

  #request(options: {
    template: PreviewAdapterTemplate
    brand: PreviewAdapterBrand
    texts: Text[]
    languages: string[]
    language: string
    overrides: Array<{ textId: string; value: string }>
  }) {
    if (!options.languages.includes(options.language)) {
      throw new ORPCError('NOT_FOUND')
    }

    const overrides = new Map(options.overrides.map(({ textId, value }) => [textId, value]))

    return {
      template: options.template.id,
      brand: options.brand.id,
      language: options.language,
      texts: templateTexts(options).map((text) => ({
        id: text.id,
        path: text.key.path,
        value: overrides.get(text.id) ?? valueIn({ text, language: options.language }),
      })),
    }
  }

  async #project(projectId: string) {
    const project = await new ProjectsService(this.#context).findAccessible(projectId)

    if (!project.previewUrl) {
      throw new ORPCError('CONFLICT')
    }

    return { project, url: project.previewUrl }
  }

  async #resolve(input: TemplateRefInput) {
    const { project, url } = await this.#project(input.projectId)
    const { catalog } = await this.#context.previews.catalog(url)
    const template = catalog.templates.find(({ id }) => id === input.templateId)
    const brand = catalog.brands.find(({ id }) => id === input.brand)

    if (!template || !brand) {
      throw new ORPCError('NOT_FOUND')
    }

    return {
      url,
      template,
      brand,
      languages: project.languages,
      texts: await new TextsService(this.#context).all(project.id),
    }
  }
}
