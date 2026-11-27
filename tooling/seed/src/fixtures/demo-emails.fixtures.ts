import { PREVIEW_DEMO_SOURCES } from '@glot/preview-demo/constants'

const COMMON = PREVIEW_DEMO_SOURCES.COMMON.name
const AGORASTORE = PREVIEW_DEMO_SOURCES.AGORASTORE.name
const IMMO = PREVIEW_DEMO_SOURCES.IMMO.name

export const DEMO_EMAIL_TEXTS: Array<{
  source: string
  path: string[]
  values: Record<string, string>
  reviewed: string[]
}> = [
  {
    source: COMMON,
    path: ['footer', 'why'],
    values: {
      fr: 'Vous recevez cet e-mail car vous avez enchéri sur {{brandName}}.',
      en: 'You get this email because you bid on {{brandName}}.',
      de: 'Sie erhalten diese E-Mail, weil Sie auf {{brandName}} geboten haben.',
      pl: 'Otrzymujesz tę wiadomość, ponieważ licytujesz w {{brandName}}.',
      nl: 'U ontvangt deze e-mail omdat u op {{brandName}} hebt geboden.',
    },
    reviewed: ['en', 'de', 'nl'],
  },
  {
    source: COMMON,
    path: ['footer', 'manage'],
    values: {
      fr: 'Gérer mes <a href="https://agorastore.fr/compte/notifications">notifications</a>',
      en: 'Manage my <a href="https://agorastore.fr/compte/notifications">notifications</a>',
      de: 'Meine <a href="http://agorastore.de/benachrichtigungen">Benachrichtigungen</a> verwalten',
      nl: 'Mijn <a href="https://agorastore.fr/compte/notifications">meldingen</a> beheren',
    },
    reviewed: ['en', 'nl'],
  },
  {
    source: COMMON,
    path: ['footer', 'address'],
    values: {
      fr: 'Agorastore SAS · 33 rue Lafayette, 75009 Paris · RCS Paris 123 456 789',
      en: 'Agorastore SAS · 33 rue Lafayette, 75009 Paris, France · Paris trade register 123 456 789',
      de: 'Agorastore SAS · 33 rue Lafayette, 75009 Paris, Frankreich · Handelsregister Paris 123 456 789',
      nl: 'Agorastore SAS · 33 rue Lafayette, 75009 Parijs, Frankrijk · Handelsregister Parijs 123 456 789',
    },
    reviewed: ['en'],
  },
  {
    source: AGORASTORE,
    path: ['outbid', 'subject'],
    values: {
      fr: 'Vous avez été surenchéri sur « {{lotName}} »',
      en: 'You have been outbid on “{{lotName}}”',
      de: 'Sie wurden bei „{{lotName}}“ überboten',
      pl: 'Twoja oferta na „{{lotName}}” została przebita',
      nl: 'U bent overboden op „{{lotName}}”',
    },
    reviewed: ['en', 'de', 'nl'],
  },
  {
    source: AGORASTORE,
    path: ['outbid', 'greeting'],
    values: {
      fr: 'Bonjour {{firstName}},',
      en: 'Hello {{firstName}},',
      de: 'Hallo {{firstName}},',
      pl: 'Dzień dobry {{firstName}},',
      nl: 'Beste {{firstName}},',
    },
    reviewed: ['en', 'de', 'pl', 'nl'],
  },
  {
    source: AGORASTORE,
    path: ['outbid', 'body'],
    values: {
      fr: 'Votre offre de {{amount}} sur le lot « {{lotName}} » a été dépassée.',
      en: 'Your bid of {{amount}} on lot “{{lotName}}” has been outbid.',
      de: 'Ihr Gebot von {{amount}} für das Los „{{lotName}}“ wurde überboten.',
      pl: 'Twoja oferta {{amount}} na przedmiot „{{lotName}}” została przebita.',
      nl: 'Uw bod van {{amount}} op kavel „{{lotName}}” is overboden.',
    },
    reviewed: ['en', 'nl'],
  },
  {
    source: AGORASTORE,
    path: ['outbid', 'ending'],
    values: {
      fr: 'La vente se termine le {{date}}. Vous pouvez encore enchérir.',
      en: 'The sale ends on {{date}}. You can still bid.',
      de: 'Die Auktion endet am {{date}}. Sie können noch bieten.',
      nl: 'De veiling eindigt op {{date}}. U kunt nog bieden.',
    },
    reviewed: ['en', 'de'],
  },
  {
    source: AGORASTORE,
    path: ['outbid', 'cta'],
    values: {
      fr: 'Enchérir à nouveau',
      en: 'Bid again',
      de: 'Erneut bieten',
      pl: 'Licytuj ponownie',
      nl: 'Opnieuw bieden',
    },
    reviewed: ['en', 'de', 'pl', 'nl'],
  },
  {
    source: AGORASTORE,
    path: ['won', 'subject'],
    values: {
      fr: 'Vous avez remporté « {{lotName}} »',
      en: 'You won “{{lotName}}”',
      de: 'Sie haben „{{lotName}}“ gewonnen',
      nl: 'U hebt „{{lotName}}” gewonnen',
    },
    reviewed: ['en'],
  },
  {
    source: AGORASTORE,
    path: ['won', 'greeting'],
    values: {
      fr: 'Félicitations {{firstName}} !',
      en: 'Congratulations {{firstName}}!',
      de: 'Herzlichen Glückwunsch, {{firstName}}!',
      pl: 'Gratulacje, {{firstName}}!',
      nl: 'Gefeliciteerd, {{firstName}}!',
    },
    reviewed: ['en', 'de'],
  },
  {
    source: AGORASTORE,
    path: ['won', 'body'],
    values: {
      fr: 'Votre offre de {{amount}} a remporté le lot « {{lotName}} ».',
      en: 'Your bid of {{amount}} won lot “{{lotName}}”.',
      de: 'Ihr Gebot von {{amount}} hat das Los „{{lotName}}“ gewonnen.',
      nl: 'Uw bod van {{amount}} heeft kavel „{{lotName}}” gewonnen.',
    },
    reviewed: ['en'],
  },
  {
    source: AGORASTORE,
    path: ['won', 'next'],
    values: {
      fr: 'Réglez votre facture sous 5 jours pour organiser le retrait à {{city}}.',
      en: 'Pay your invoice within 5 days to arrange the pickup in {{city}}.',
      nl: 'Betaal uw factuur binnen 5 dagen om het ophalen in {{city}} te regelen.',
    },
    reviewed: [],
  },
  {
    source: AGORASTORE,
    path: ['won', 'cta'],
    values: {
      fr: 'Voir ma facture',
      en: 'See my invoice',
      de: 'Rechnung ansehen',
      pl: 'Zobacz fakturę',
      nl: 'Mijn factuur bekijken',
    },
    reviewed: ['en', 'de'],
  },
  {
    source: AGORASTORE,
    path: ['invoice', 'title'],
    values: {
      fr: 'Facture {{invoiceNumber}}',
      en: 'Invoice {{invoiceNumber}}',
      de: 'Rechnung {{invoiceNumber}}',
      pl: 'Faktura {{invoiceNumber}}',
      nl: 'Factuur {{invoiceNumber}}',
    },
    reviewed: ['en', 'de', 'pl', 'nl'],
  },
  {
    source: AGORASTORE,
    path: ['invoice', 'intro'],
    values: {
      fr: 'Facture pour l’adjudication du lot « {{lotName}} » (lot {{lotNumber}}).',
      en: 'Invoice for the award of lot “{{lotName}}” (lot {{lotNumber}}).',
      de: 'Rechnung für den Zuschlag des Loses „{{lotName}}“ (Los {{lotNumber}}).',
      nl: 'Factuur voor de gunning van kavel „{{lotName}}” (kavel {{lotNumber}}).',
    },
    reviewed: ['en'],
  },
  {
    source: AGORASTORE,
    path: ['invoice', 'total'],
    values: {
      fr: 'Total à payer, frais acheteur inclus : <b>{{total}}</b>',
      en: 'Total to pay, buyer’s fee included: <b>{{total}}</b>',
      de: 'Zu zahlender Betrag inklusive Käuferprovision: <b>{{total}}</b>',
      pl: 'Do zapłaty z prowizją kupującego: <b>{{total}}</b>',
      nl: 'Te betalen, inclusief kopersprovisie: <b>{{total}}</b>',
    },
    reviewed: ['en', 'nl'],
  },
  {
    source: AGORASTORE,
    path: ['invoice', 'thanks'],
    values: {
      fr: 'Merci de votre confiance.',
      en: 'Thank you for your trust.',
      de: 'Vielen Dank für Ihr Vertrauen.',
      pl: 'Dziękujemy za zaufanie.',
      nl: 'Bedankt voor uw vertrouwen.',
    },
    reviewed: ['en', 'de', 'pl', 'nl'],
  },
  {
    source: AGORASTORE,
    path: ['sms', 'outbid'],
    values: {
      fr: 'Agorastore : votre offre sur « {{lotName}} » a été dépassée. L’enchère se termine le {{date}}. Enchérir : {{shortLink}}',
      en: 'Agorastore: your bid on {{lotName}} was outbid. The sale ends on {{date}}. Bid again: {{shortLink}}',
      de: 'Agorastore: Ihr Gebot für {{lotName}} wurde überboten. Ende am {{date}}. Bieten: {{shortLink}}',
      nl: 'Agorastore: uw bod op {{lotName}} is overboden. Einde op {{date}}. Bied opnieuw: {{shortLink}}',
    },
    reviewed: ['en'],
  },
  {
    source: IMMO,
    path: ['outbid', 'body'],
    values: {
      fr: 'Votre offre de {{amount}} sur le bien « {{lotName}} » a été dépassée.',
      en: 'Your offer of {{amount}} on the property “{{lotName}}” has been outbid.',
      nl: 'Uw bod van {{amount}} op het pand „{{lotName}}” is overboden.',
    },
    reviewed: ['en'],
  },
  {
    source: IMMO,
    path: ['won', 'next'],
    values: {
      fr: 'Votre notaire vous contactera sous 48 heures pour la signature.',
      en: 'Your notary will contact you within 48 hours for the signature.',
    },
    reviewed: [],
  },
]
