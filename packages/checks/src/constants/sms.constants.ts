export const SMS_ALPHABETS = {
  GSM_7: 'GSM-7',
  UNICODE: 'Unicode',
} as const

export const SMS_LIMITS = {
  'GSM-7': { single: 160, part: 153 },
  Unicode: { single: 70, part: 67 },
} as const

export const GSM_7_BASIC =
  '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà'

export const GSM_7_EXTENSION = '^{}\\[~]|€\f'
