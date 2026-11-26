const API = 'https://api.github.com/repos/acme/app'
const SHA = '8f3b6a1c2d4e5f60718293a4b5c6d7e8f9012345'
const LOCALES = 'packages/translations/i18n/locales'

export const GITHUB_RECORDING = {
  sha: SHA,
  exchanges: [
    {
      url: `${API}/git/ref/heads/release/main`,
      accept: 'application/vnd.github+json',
      status: 200,
      body: JSON.stringify({
        ref: 'refs/heads/release/main',
        object: { sha: SHA, type: 'commit', url: `${API}/git/commits/${SHA}` },
      }),
    },
    {
      url: `${API}/contents/${LOCALES}/fr.json?ref=${SHA}`,
      accept: 'application/vnd.github.raw+json',
      status: 200,
      body: '{ "actions": { "save": "Enregistrer", "delete": "Supprimer" } }\n',
    },
    {
      url: `${API}/contents/${LOCALES}/en.json?ref=${SHA}`,
      accept: 'application/vnd.github.raw+json',
      status: 200,
      body: '{ "actions": { "save": "Save" } }\n',
    },
    {
      url: `${API}/contents/.glot/reviews/en.jsonl?ref=${SHA}`,
      accept: 'application/vnd.github.raw+json',
      status: 404,
      body: JSON.stringify({ message: 'Not Found', status: '404' }),
    },
  ],
}
