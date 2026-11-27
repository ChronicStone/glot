export default defineI18nLocale((locale) =>
  $fetch(`/api/locales/${locale}`, { headers: { 'cache-control': 'no-store' } }),
)
