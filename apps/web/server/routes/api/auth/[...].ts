import { auth } from '../../../config/auth.config.ts'

export default defineEventHandler((event) => auth.handler(toWebRequest(event)))
