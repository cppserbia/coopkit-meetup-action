# Create Meetup Draft Event

> Create a [Meetup.com](https://www.meetup.com) Draft event from a GitHub Actions workflow. Best paired with `workflow_dispatch` so maintainers can fill in a form in the Actions tab and click Run.

This is the GitHub-Marketplace-published counterpart of the [coopkit](https://github.com/cppserbia/coopkit) toolkit's manual-trigger reusable workflow. It wraps the [`@coopkit/meetup`](https://www.npmjs.com/package/@coopkit/meetup) npm package as a composite action.

## When to use this

- You run a Meetup group and want **on-demand event creation** from inside GitHub.
- You don't store events in a structured place (no `events/*.md`, no CMS) — you just want to type the fields in.
- You want to **gate Meetup event creation** behind your repo's permissions model (whoever can trigger Actions can create drafts).

If your events live as Markdown files (one per event) and you want PR-driven automation, use the [coopkit reusable workflow](https://github.com/cppserbia/coopkit/blob/main/.github/workflows/_meetup-event-draft.yml) instead.

## Quick start

### 1. One-time Meetup OAuth setup

Follow the [`@coopkit/meetup` README](https://github.com/cppserbia/coopkit/blob/main/packages/meetup/README.md#one-time-meetup-oauth-setup) to create an OAuth app with the `event_management` scope and generate a JWT signing key. You'll need four secrets in your repo:

| Secret | Source |
| --- | --- |
| `MEETUP_CLIENT_KEY` | OAuth consumer key |
| `MEETUP_MEMBER_ID` | Your Meetup member ID (must be a group organizer) |
| `MEETUP_SIGNING_KEY_ID` | JWT key ID |
| `MEETUP_PRIVATE_KEY` | PEM file contents (paste the whole thing into the secret value) |

### 2. Add `coopkit.config.json` to your repo

```json
{
  "meetup": {
    "groupUrlname": "your-group-slug",
    "venues": {
      "online": 12345678,
      "Our Venue, City, cc": 23456789
    }
  }
}
```

Discover your venue IDs with `bunx coopkit-meetup list-venues --group your-group-slug` locally.

### 3. Add the workflow

```yaml
# .github/workflows/meetup-create-event.yml
name: Create Meetup Event
on:
  workflow_dispatch:
    inputs:
      title:
        description: Event title
        required: true
        type: string
      date:
        description: ISO datetime UTC (e.g. 2026-05-09T16:00:00Z)
        required: true
        type: string
      duration:
        description: ISO-8601 duration
        required: false
        type: string
        default: PT1H30M
      venue-key:
        description: Venue key from coopkit.config.json
        required: false
        type: string
        default: online
      description:
        description: Event description (Markdown OK)
        required: false
        type: string
      image-url:
        description: Featured photo URL
        required: false
        type: string
      dry-run:
        description: Print payload without calling the API
        required: false
        type: boolean
        default: false

jobs:
  create:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: cppserbia/coopkit-meetup-action@v1
        with:
          title: ${{ inputs.title }}
          date: ${{ inputs.date }}
          duration: ${{ inputs.duration }}
          venue-key: ${{ inputs.venue-key }}
          description: ${{ inputs.description }}
          image-url: ${{ inputs.image-url }}
          dry-run: ${{ inputs.dry-run }}
          meetup-client-key: ${{ secrets.MEETUP_CLIENT_KEY }}
          meetup-member-id: ${{ secrets.MEETUP_MEMBER_ID }}
          meetup-signing-key-id: ${{ secrets.MEETUP_SIGNING_KEY_ID }}
          meetup-private-key: ${{ secrets.MEETUP_PRIVATE_KEY }}
```

Open the **Actions** tab → **Create Meetup Event** → **Run workflow**, fill in the form, click Run. A Draft event appears under your group in Meetup; review and publish from the Meetup dashboard.

## Inputs

| Input | Required | Default | Description |
|---|---|---|---|
| `title` | yes | — | Event title. |
| `date` | yes | — | ISO datetime in UTC. |
| `duration` | no | `PT2H` | ISO-8601 duration. |
| `venue-key` | yes | — | Key into `coopkit.config.json#meetup.venues`. |
| `description` | no | `""` | Event description (Markdown). |
| `image-url` | no | `""` | Featured photo URL. |
| `id` | no | _auto_ | Event ID. Default is `YYYY-MM-DD-slugified-title`. |
| `dry-run` | no | `false` | Skip the API call; print the payload. |
| `config-path` | no | `coopkit.config.json` | Path to your config. |
| `package-version` | no | `0` | `@coopkit/meetup` version/range/tag to run (default: latest `0.x`). |
| `bun-version` | no | `1.3.13` | Bun runtime version. |
| `meetup-client-key` | yes | — | Pipe from `${{ secrets.MEETUP_CLIENT_KEY }}`. |
| `meetup-member-id` | yes | — | Pipe from `${{ secrets.MEETUP_MEMBER_ID }}`. |
| `meetup-signing-key-id` | yes | — | Pipe from `${{ secrets.MEETUP_SIGNING_KEY_ID }}`. |
| `meetup-private-key` | yes | — | Pipe from `${{ secrets.MEETUP_PRIVATE_KEY }}`. |

## How it works

1. Installs Bun on the runner.
2. Writes the JWT signing private key to a temp file (deleted after).
3. Builds a `NormalizedEvent` JSON from the inputs using `jq` (quote-safe).
4. Invokes `bunx @coopkit/meetup@<version> create-from-json` which authenticates against the Meetup GraphQL API, creates a Draft event, optionally attaches a featured photo.

## Versioning

This action follows semver. Pin to a major (`@v1`) to get bug-fix + feature updates without breaking changes, or pin to a specific release tag (`@v1.0.0`) for fully reproducible runs.

## Related

- [`@coopkit/meetup`](https://www.npmjs.com/package/@coopkit/meetup) — the underlying npm package
- [`@coopkit/core`](https://www.npmjs.com/package/@coopkit/core) — shared `NormalizedEvent` type
- [coopkit](https://github.com/cppserbia/coopkit) — the full toolkit (banners, social media, etc.)

## License

MIT
