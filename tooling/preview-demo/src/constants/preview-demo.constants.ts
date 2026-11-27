export const PREVIEW_DEMO_SOURCES = {
  COMMON: { name: 'emails-common', pathPattern: 'emails/_common/{locale}.json' },
  AGORASTORE: { name: 'emails-agorastore', pathPattern: 'emails/agorastore/{locale}.json' },
  IMMO: { name: 'emails-immo', pathPattern: 'emails/agorastore-immo/{locale}.json' },
} as const

export const PREVIEW_DEMO_BRANDS = {
  AGORASTORE: {
    id: 'agorastore',
    name: 'Agorastore',
    domain: 'agorastore.fr',
    color: '#3b5bdb',
    sources: [PREVIEW_DEMO_SOURCES.AGORASTORE.name, PREVIEW_DEMO_SOURCES.COMMON.name],
  },
  IMMO: {
    id: 'immo',
    name: 'Agorastore Immo',
    domain: 'immo.agorastore.fr',
    color: '#0c8599',
    sources: [
      PREVIEW_DEMO_SOURCES.IMMO.name,
      PREVIEW_DEMO_SOURCES.AGORASTORE.name,
      PREVIEW_DEMO_SOURCES.COMMON.name,
    ],
  },
} as const

export const PREVIEW_DEMO_KINDS = {
  EMAIL: 'email',
  DOCUMENT: 'document',
  SMS: 'sms',
} as const

export const PREVIEW_DEMO_TEMPLATES = {
  OUTBID: {
    id: 'outbid',
    name: 'Outbid',
    group: 'Bidding',
    kind: PREVIEW_DEMO_KINDS.EMAIL,
    subject: ['outbid', 'subject'],
    body: [
      ['outbid', 'greeting'],
      ['outbid', 'body'],
      ['outbid', 'ending'],
    ],
    action: ['outbid', 'cta'],
    footer: [
      ['footer', 'why'],
      ['footer', 'manage'],
    ],
  },
  WON: {
    id: 'lot-won',
    name: 'Lot won',
    group: 'Bidding',
    kind: PREVIEW_DEMO_KINDS.EMAIL,
    subject: ['won', 'subject'],
    body: [
      ['won', 'greeting'],
      ['won', 'body'],
      ['won', 'next'],
    ],
    action: ['won', 'cta'],
    footer: [
      ['footer', 'why'],
      ['footer', 'manage'],
    ],
  },
  INVOICE: {
    id: 'invoice',
    name: 'Invoice',
    group: 'Documents',
    kind: PREVIEW_DEMO_KINDS.DOCUMENT,
    subject: ['invoice', 'title'],
    body: [
      ['invoice', 'intro'],
      ['invoice', 'total'],
      ['invoice', 'thanks'],
    ],
    action: null,
    footer: [['footer', 'address']],
  },
  OUTBID_SMS: {
    id: 'outbid-sms',
    name: 'Outbid SMS',
    group: 'SMS',
    kind: PREVIEW_DEMO_KINDS.SMS,
    subject: null,
    body: [['sms', 'outbid']],
    action: null,
    footer: [],
  },
} as const

export const PREVIEW_DEMO_SAMPLE = {
  firstName: 'Camille',
  amount: '1 250 €',
  total: '1 437,50 €',
  lotName: 'Renault Kangoo 2017',
  lotNumber: '48213',
  city: 'Bordeaux',
  lotUrl: 'https://agorastore.fr/lot/48213',
  shortLink: 'agst.re/48213',
  invoiceNumber: 'F-2026-11-0412',
} as const

export const PREVIEW_DEMO_DATES = {
  fr: '28 novembre à 14 h',
  en: '28 November at 2 pm',
  de: '28. November um 14 Uhr',
  pl: '28 listopada o 14:00',
  nl: '28 november om 14.00 uur',
} as const

export const PREVIEW_DEMO_PATHS = {
  TEMPLATES: '/templates',
  RENDER: '/render',
  SEND_TEST: '/send-test',
} as const
