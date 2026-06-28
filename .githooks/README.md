# Git Hooks

Local-only git hooks for DocScan Pro. These are NOT auto-enabled — you
have to opt in once per clone.

## Enable

```bash
git config core.hooksPath .githooks
```

That's it. From now on, `git commit` will run both hooks automatically.

## Disable (per session)

```bash
git commit --no-verify
```

Or permanently:

```bash
git config --unset core.hooksPath
```

## What each hook does

### `pre-commit`

Scans **staged content** (what's about to be committed) for secret patterns
and blocks the commit if any are found. Patterns caught:

- Google Gemini / AI Studio API keys (`AIzaSy...`)
- Stripe live + test secret keys (`sk_live_`, `sk_test_`)
- Stripe restricted keys (`rk_live_`, `rk_test_`)
- Resend API keys (`re_...`)
- Emergent LLM keys (`em_...`)
- Cloudflare Turnstile secret keys (`0x4AAA...`)
- JWT / Bearer tokens with reasonable entropy
- AWS access keys (`AKIA...`)
- PEM private key blocks
- `.env` / `.env.*` files (other than `.env.example`)

If you genuinely need to commit something that matches (e.g. a regex
fixture or a public demo key), use `git commit --no-verify` and add a
note in the PR description.

### `commit-msg`

Rejects:

- Empty first lines
- The legacy `auto-commit for <uuid>` junk pattern (428 of those in
  history — see `git log --oneline | grep -c auto-commit`)
- First lines shorter than 10 characters

A Conventional-Commits check is included but **commented out** — turn
it on by editing the file when the team is ready to enforce it.

## Why this lives in `.githooks/` instead of `.git/hooks/`

`.git/hooks/` is per-clone and never tracked. `.githooks/` is in the
repo, so the rules travel with the code.

## CI secret scanning (independent of these hooks)

For the server-side belt-and-suspenders, see
`.github/workflows/secrets-scan.yml` (runs `gitleaks/gitleaks-action` on
every push + PR — even if a contributor didn't enable the local hooks).

## History rewrite (optional, dangerous)

The 428 legacy `auto-commit for <uuid>` commits are still in history.
Removing them requires `git filter-repo` + force-push, which rewrites
every contributor's view. Coordinate before doing this. See
`FOLLOW_UPS.md` → "Git-history secret scrub + key rotation" for the
full recipe.