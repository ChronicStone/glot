export const DEMO_APP_TEXTS: Array<{
  path: string[]
  values: Record<string, string>
  reviewed: string[]
}> = [
  {
    path: ['nav', 'auctions'],
    values: { fr: 'Enchères', en: 'Auctions', de: 'Auktionen', pl: 'Aukcje', nl: 'Veilingen' },
    reviewed: ['en', 'de', 'pl', 'nl'],
  },
  {
    path: ['nav', 'categories'],
    values: {
      fr: 'Catégories',
      en: 'Categories',
      de: 'Kategorien',
      pl: 'Kategorie',
      nl: 'Categorieën',
    },
    reviewed: ['en', 'de', 'pl', 'nl'],
  },
  {
    path: ['nav', 'howItWorks'],
    values: {
      fr: 'Comment ça marche',
      en: 'How it works',
      de: 'So funktioniert es',
      pl: 'Jak to działa',
      nl: 'Hoe het werkt',
    },
    reviewed: ['en', 'de', 'pl', 'nl'],
  },
  {
    path: ['marketplace', 'list', 'title'],
    values: {
      fr: 'Lots en vente',
      en: 'Lots for sale',
      de: 'Lose im Verkauf',
      pl: 'Partie na sprzedaż',
      nl: 'Kavels te koop',
    },
    reviewed: ['en', 'de', 'nl'],
  },
  {
    path: ['marketplace', 'list', 'count'],
    values: {
      fr: '{count} lot | {count} lots',
      en: '{count} lot | {count} lots',
      de: '{count} Los | {count} Lose',
      pl: '{count} partia | {count} partie | {count} partii',
      nl: '{count} kavel | {count} kavels',
    },
    reviewed: ['en', 'de', 'nl'],
  },
  {
    path: ['marketplace', 'list', 'endsIn'],
    values: {
      fr: 'Fin dans {time}',
      en: 'Ends in {time}',
      de: 'Endet in {time}',
      pl: 'Koniec za {time}',
      nl: 'Eindigt over {time}',
    },
    reviewed: ['en', 'de', 'pl', 'nl'],
  },
  {
    path: ['marketplace', 'lot', 'vehicles'],
    values: { fr: 'Véhicules', en: 'Vehicles', de: 'Fahrzeuge', pl: 'Pojazdy', nl: 'Voertuigen' },
    reviewed: ['en', 'de', 'pl', 'nl'],
  },
  {
    path: ['marketplace', 'lot', 'vans'],
    values: {
      fr: 'Utilitaires',
      en: 'Vans',
      de: 'Transporter',
      pl: 'Samochody dostawcze',
      nl: 'Bestelwagens',
    },
    reviewed: ['en', 'de', 'pl', 'nl'],
  },
  {
    path: ['marketplace', 'lot', 'startingPrice'],
    values: {
      fr: 'Mise à prix',
      en: 'Starting price',
      de: 'Startpreis',
      pl: 'Cena wywoławcza',
      nl: 'Startprijs',
    },
    reviewed: ['en', 'de', 'nl'],
  },
  {
    path: ['marketplace', 'lot', 'highestBid'],
    values: {
      fr: 'Meilleure offre',
      en: 'Highest bid',
      de: 'Höchstgebot',
      pl: 'Najwyższa oferta',
      nl: 'Hoogste bod',
    },
    reviewed: ['en', 'de', 'nl'],
  },
  {
    path: ['marketplace', 'lot', 'endsAt'],
    values: {
      fr: 'Fin le {date} à {time}',
      en: 'Ends {date} at {time}',
      de: 'Endet am {date} um {time}',
      pl: 'Koniec {date} o {time}',
      nl: 'Eindigt {date} om {time}',
    },
    reviewed: ['en', 'de', 'pl', 'nl'],
  },
  {
    path: ['marketplace', 'lot', 'requestViewing'],
    values: {
      fr: 'Demander une visite',
      en: 'Request a viewing',
      de: 'Besichtigung anfragen',
      pl: 'Poproś o oględziny',
      nl: 'Bezichtiging aanvragen',
    },
    reviewed: ['en', 'de', 'nl'],
  },
  {
    path: ['marketplace', 'bid', 'nextMinimum'],
    values: {
      fr: 'Prochaine enchère minimale : {amount}',
      en: 'Next minimum bid: {amount}',
      de: 'Nächstes Mindestgebot: {amount}',
      pl: 'Następna minimalna działka: {amount}',
      nl: 'Volgend minimumbod: {amount}',
    },
    reviewed: ['en', 'de', 'nl'],
  },
  {
    path: ['marketplace', 'bid', 'yourBid'],
    values: {
      fr: 'Votre enchère',
      en: 'Your bid',
      de: 'Ihr Gebot',
      pl: 'Twoja oferta',
      nl: 'Uw bod',
    },
    reviewed: ['en', 'de', 'pl', 'nl'],
  },
  {
    path: ['marketplace', 'bid', 'placeBid'],
    values: {
      fr: 'Enchérir',
      en: 'Place a bid',
      de: 'Gebot abgeben',
      pl: 'Złóż ofertę',
      nl: 'Bod plaatsen',
    },
    reviewed: ['en', 'de', 'nl'],
  },
  {
    path: ['marketplace', 'bid', 'fees'],
    values: {
      fr: '+ {amount} de frais, HT',
      en: '+ {amount} in fees, excl. VAT',
      de: '+ {amount} Gebühren, zzgl. MwSt.',
      pl: '+ {amount} opłat, bez VAT',
      nl: '+ {amount} kosten, excl. btw',
    },
    reviewed: ['en', 'de', 'pl', 'nl'],
  },
  {
    path: ['seo', 'lotTitle'],
    values: {
      fr: '{title} – enchères | Agorastore',
      en: '{title} – auction | Agorastore',
      de: '{title} – Auktion | Agorastore',
      pl: '{title} – licytacja | Agorastore',
      nl: '{title} – veiling | Agorastore',
    },
    reviewed: ['en', 'de', 'pl', 'nl'],
  },
]
