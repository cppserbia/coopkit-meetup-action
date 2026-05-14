# Publishing this action

Quick reference for getting this action onto the GitHub Marketplace.

## Prerequisites before the first release

1. **`@coopkit/meetup` must be on npm.** This action invokes `bunx @coopkit/meetup@<version>` at runtime; if the package doesn't exist on the registry, every run fails. Publish from the [coopkit monorepo](https://github.com/cppserbia/coopkit) first.
2. **The repo must be public.** GitHub Marketplace doesn't accept private actions.
3. **The repo's default branch must contain a valid `action.yml` at the root.** Already done.
4. **The action name in `action.yml` must be unique across the Marketplace.** "Create Meetup Draft Event" should be unique enough; if it isn't, GitHub will reject the listing and we'll iterate.
5. **The repo needs a clear `LICENSE` and `README.md`.** Both present.

## Releasing

1. Push to `github.com/cppserbia/coopkit-meetup-action`.
2. Create a release in the GitHub UI:
   - Tag: `v0.1.0` (semver — start with `v0.x.y` until the action surface is stable, then `v1.0.0`).
   - During release creation, the GitHub UI shows a **"Publish this Action to the GitHub Marketplace"** checkbox. Check it.
   - GitHub validates `action.yml` + branding + README. If anything is missing, you'll see the errors inline.
   - Accept the GitHub Marketplace Developer Agreement (one-time, per account/org).
   - Pick one or two categories (e.g. _Utilities_, _Project management_).
3. After the release, **create or update a moving major tag** so users can pin to `@v1`:
   ```bash
   git tag -f v1 v1.0.0
   git push origin v1 --force
   ```
   This is the standard pattern — see [actions/checkout](https://github.com/actions/checkout) for an example.

## Iterating

For non-breaking changes: bump the patch or minor version (`v1.0.1`, `v1.1.0`), publish a new release with "Publish this release to the GitHub Marketplace" checked, then re-update `v1` to point at the new release tag.

For breaking changes: bump the major version (`v2.0.0`) and create a new moving tag `v2`. Leave `v1` alone so existing users aren't broken.

## Self-testing before release

The `.github/workflows/ci.yml` self-test runs the action against itself in `--dry-run` mode (no actual Meetup API call, no real credentials needed beyond dummy values). Use it as the gate before tagging a release.

## Marketplace listing health

After publishing, periodically check:

- [Marketplace listing page](https://github.com/marketplace/actions/create-meetup-draft-event) for warnings (e.g. README too thin, missing categories).
- The "Used by" count on the listing page.
- The "Insights" tab in the action repo for usage trends.
