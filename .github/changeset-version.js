// ORIGINALLY FROM CLOUDFLARE WRANGLER:
// https://github.com/cloudflare/wrangler2/blob/main/.github/changeset-version.js

const { exec } = require('child_process');
// This script is used by the `release.yml` workflow to update the version of the packages being released.
// The standard step is only to run `changeset version` but this does not update the bun.lock file.
// So we also run `bun install`, which does this update.
// This is a workaround until this is handled automatically by `changeset version`.
// See https://github.com/changesets/changesets/issues/421.
exec('bun run changeset version');
exec('bun install --lockfile-only');
