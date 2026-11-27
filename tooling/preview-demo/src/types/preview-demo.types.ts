import type {
  PREVIEW_DEMO_BRANDS,
  PREVIEW_DEMO_TEMPLATES,
} from '../constants/preview-demo.constants.ts'

export type DemoBrand = (typeof PREVIEW_DEMO_BRANDS)[keyof typeof PREVIEW_DEMO_BRANDS]

export type DemoTemplate = (typeof PREVIEW_DEMO_TEMPLATES)[keyof typeof PREVIEW_DEMO_TEMPLATES]
