import {
  GSM_7_BASIC,
  GSM_7_EXTENSION,
  SMS_ALPHABETS,
  SMS_LIMITS,
} from '../constants/sms.constants.ts'

export function smsLength(text: string) {
  const characters = Array.from(text)

  const unicode = [
    ...new Set(
      characters.filter(
        (character) => !GSM_7_BASIC.includes(character) && !GSM_7_EXTENSION.includes(character),
      ),
    ),
  ]

  const alphabet = unicode.length > 0 ? SMS_ALPHABETS.UNICODE : SMS_ALPHABETS.GSM_7

  const length =
    alphabet === SMS_ALPHABETS.UNICODE
      ? text.length
      : characters.reduce(
          (total, character) => total + (GSM_7_EXTENSION.includes(character) ? 2 : 1),
          0,
        )

  const limits = SMS_LIMITS[alphabet]

  return {
    alphabet,
    length,
    perMessage: length <= limits.single ? limits.single : limits.part,
    messages: length <= limits.single ? 1 : Math.ceil(length / limits.part),
    unicodeCharacters: unicode,
  }
}
