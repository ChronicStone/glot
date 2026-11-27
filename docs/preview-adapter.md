# Preview adapter

Glot shows emails, documents and SMS as your product renders them. It does not hold your templates: a small HTTP service of yours, the preview adapter, renders them from the texts Glot sends. Set its address in a project's settings (`previewUrl`). `tooling/preview-demo` is a complete adapter to copy from.

The adapter answers JSON on three routes under its address. Glot waits 8 seconds for each answer.

## `GET /templates`

The brands and templates the adapter can render.

```json
{
  "brands": [
    { "id": "agorastore", "name": "Agorastore", "sources": ["emails-agorastore", "emails-common"] },
    {
      "id": "immo",
      "name": "Agorastore Immo",
      "sources": ["emails-immo", "emails-agorastore", "emails-common"]
    }
  ],
  "templates": [
    {
      "id": "outbid",
      "name": "Outbid",
      "group": "Bidding",
      "kind": "email",
      "texts": [
        ["outbid", "subject"],
        ["outbid", "greeting"],
        ["footer", "why"]
      ]
    }
  ],
  "sendTest": true
}
```

- `sources` names the project's text sources (kind `handlebars-html`) a brand reads, first to last. For each path a template uses, Glot takes the text from the first source that holds it: the brand, then its parent brand, then the texts every brand shares.
- `texts` lists the paths a template uses, in reading order; the subject comes first.
- `kind` is `email`, `document` or `sms`.
- `sendTest` says whether `POST /send-test` exists.

When this route stops answering, Glot keeps showing the last list it received and marks previews as unavailable.

## `POST /render`

```json
{
  "template": "outbid",
  "brand": "immo",
  "language": "fr",
  "texts": [
    {
      "id": "WyJlbWFpbHMtaW1tbyIsIm91dGJpZCIsImJvZHkiXQ",
      "path": ["outbid", "body"],
      "value": "Votre offre de {{amount}} sur le bien « {{lotName}} » a été dépassée."
    }
  ]
}
```

`texts` holds the value Glot wants shown for each path: the person's draft or what they are typing, else the current translation, else the source text. Render them with your own sample data.

```json
{
  "kind": "email",
  "subject": "Vous avez été surenchéri sur « Renault Kangoo 2017 »",
  "from": "Agorastore Immo <encheres@immo.agorastore.fr>",
  "html": "<!doctype html>…<span data-glot-text=\"WyJlbWFpbHMtaW1tbyIsIm91dGJpZCIsImJvZHkiXQ\">Votre offre de 1 250 € sur le bien « Renault Kangoo 2017 » a été dépassée.</span>…",
  "text": null
}
```

- Wrap each text you render into the HTML in an element with `data-glot-text` set to its `id`: a click on it opens that text in Glot. Texts inside attributes or the subject stay plain.
- An SMS returns its body in `text` and `html: null`.
- Glot shows `html` in a sandboxed frame without scripts.
- Answer 404 for an unknown template or brand.

## `POST /send-test`

The body of `/render` with `to`, the address of the person who asked. Render as `/render` does, send the result to `to` through your own mail setup (at Agorastore, UAT routes every mail to the team inbox), and answer `{ "sent": true }`.
