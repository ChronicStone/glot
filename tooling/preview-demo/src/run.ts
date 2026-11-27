import { startPreviewDemo } from './preview-demo.ts'

const port = Number(process.env.PREVIEW_DEMO_PORT ?? 3300)

const { url } = await startPreviewDemo({
  port,
  onTest: (line) => process.stdout.write(`${line}\n`),
})

process.stdout.write(`Preview adapter on ${url}\n`)
