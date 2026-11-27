# @glot/nuxt

Edit an app's texts where they show, in the running app. Visitors never get the widget: only members of the project's workspace who sign in, each for the languages they write or review.

## Set up

Add the module beside `@nuxtjs/i18n`:

```ts
export default defineNuxtConfig({
  modules: ['@nuxtjs/i18n', '@glot/nuxt'],
  glot: {
    enabled: true,
    url: 'https://glot.example.com',
    project: 'acme/storefront',
  },
})
```

| Option    | Meaning                                                  |
| --------- | -------------------------------------------------------- |
| `enabled` | Adds the widget to the build. Off by default.            |
| `url`     | Address of your Glot server.                             |
| `project` | The project's repository as Glot knows it, `owner/name`. |

On the Glot server, list the app's address in `WIDGET_ORIGINS`, for example `https://uat.acme.com,https://acme.com`. Addresses also listed in `WIDGET_PRODUCTION_ORIGINS` refuse members whose access has an end date.

## Use

Open any page with `?glot` in its address and choose the Glot pill to sign in. After the first sign-in the pill stays on that browser without `?glot`. The widget lists the page's texts by key, outlines them by state, and edits them with the same checks as Glot.

## Plural forms

Glot writes plural forms in the order of the language's plural categories for whole numbers: Polish takes 3 forms, one, few and many. vue-i18n follows that order only through a `pluralRules` entry for the language; without one, its default picks zero, one, then other, and the widget labels the forms that way. Give each such language its rule in `i18n.config.ts`:

```ts
const POLISH_FORMS: Record<Intl.LDMLPluralRule, number> = {
  zero: 2,
  one: 0,
  two: 2,
  few: 1,
  many: 2,
  other: 2,
}

const polish = new Intl.PluralRules('pl')

export default defineI18nConfig(() => ({
  pluralRules: {
    pl: (choice: number, choicesLength: number) =>
      Math.min(POLISH_FORMS[polish.select(Math.abs(choice))], choicesLength - 1),
  },
}))
```

The demo app in `apps/demo` runs this setup.
