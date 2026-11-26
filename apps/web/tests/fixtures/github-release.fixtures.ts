const API = 'https://api.github.com/repos/acme/app'
const BASE = '8f3b6a1c2d4e5f60718293a4b5c6d7e8f9012345'
const COMMIT = '0a1b2c3d4e5f60718293a4b5c6d7e8f901234567'
const PULL_URL = 'https://github.com/acme/app/pull/42'
const MESSAGE = 'Release translations\n\n1 text, 0 approvals.\npl: 1'

export const GITHUB_RELEASE = {
  base: BASE,
  commit: COMMIT,
  pullRequestUrl: PULL_URL,
  message: MESSAGE,
  files: new Map([['locales/pl.json', '{ "save": "Zapisz" }\n']]),
  pullRequest: { title: 'Release translations', body: '1 text, 0 approvals.\npl: 1' },
  firstRelease: [
    {
      method: 'GET',
      url: `${API}/git/commits/${BASE}`,
      status: 200,
      response: { sha: BASE, tree: { sha: 'tree-base' } },
    },
    {
      method: 'POST',
      url: `${API}/git/trees`,
      body: {
        base_tree: 'tree-base',
        tree: [
          {
            path: 'locales/pl.json',
            mode: '100644',
            type: 'blob',
            content: '{ "save": "Zapisz" }\n',
          },
        ],
      },
      status: 201,
      response: { sha: 'tree-new' },
    },
    {
      method: 'POST',
      url: `${API}/git/commits`,
      body: { message: MESSAGE, tree: 'tree-new', parents: [BASE] },
      status: 201,
      response: { sha: COMMIT },
    },
    {
      method: 'GET',
      url: `${API}/git/ref/heads/glot/release`,
      status: 404,
      response: { message: 'Not Found', status: '404' },
    },
    {
      method: 'POST',
      url: `${API}/git/refs`,
      body: { ref: 'refs/heads/glot/release', sha: COMMIT },
      status: 201,
      response: { ref: 'refs/heads/glot/release', object: { sha: COMMIT } },
    },
    {
      method: 'GET',
      url: `${API}/pulls?state=open&head=acme%3Aglot%2Frelease`,
      status: 200,
      response: [],
    },
    {
      method: 'POST',
      url: `${API}/pulls`,
      body: {
        title: 'Release translations',
        body: '1 text, 0 approvals.\npl: 1',
        head: 'glot/release',
        base: 'main',
      },
      status: 201,
      response: { number: 42, html_url: PULL_URL },
    },
  ],
  nextRelease: [
    {
      method: 'GET',
      url: `${API}/git/commits/${BASE}`,
      status: 200,
      response: { sha: BASE, tree: { sha: 'tree-base' } },
    },
    {
      method: 'POST',
      url: `${API}/git/trees`,
      body: {
        base_tree: 'tree-base',
        tree: [
          {
            path: 'locales/pl.json',
            mode: '100644',
            type: 'blob',
            content: '{ "save": "Zapisz" }\n',
          },
        ],
      },
      status: 201,
      response: { sha: 'tree-new' },
    },
    {
      method: 'POST',
      url: `${API}/git/commits`,
      body: { message: MESSAGE, tree: 'tree-new', parents: [BASE] },
      status: 201,
      response: { sha: COMMIT },
    },
    {
      method: 'GET',
      url: `${API}/git/ref/heads/glot/release`,
      status: 200,
      response: { ref: 'refs/heads/glot/release', object: { sha: 'older' } },
    },
    {
      method: 'PATCH',
      url: `${API}/git/refs/heads/glot/release`,
      body: { sha: COMMIT, force: true },
      status: 200,
      response: { ref: 'refs/heads/glot/release', object: { sha: COMMIT } },
    },
    {
      method: 'GET',
      url: `${API}/pulls?state=open&head=acme%3Aglot%2Frelease`,
      status: 200,
      response: [{ number: 42 }],
    },
    {
      method: 'PATCH',
      url: `${API}/pulls/42`,
      body: { title: 'Release translations', body: '1 text, 0 approvals.\npl: 1' },
      status: 200,
      response: { number: 42, html_url: PULL_URL },
    },
  ],
}
