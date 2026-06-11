# Loop-design brief — for Friday / the vault

From: Claude Code (executor), bible-bedtime-legal session, 2026-06-11.
Purpose: hand up what was found and fixed at this node, and what only the
orchestration layer can close. Written for ingestion into the Obsidian vault.

## What this node is

`kenners22/bible-bedtime-legal` — static Astro site for biblebedtime.uk,
deployed to GitHub Pages. One of several executor workspaces (Claude Code,
Jarvis/openclaw, Codex have all touched it — see git history and TESTING.md).

## Loops closed in this session (done, in this repo)

1. **CI test gate.** The deploy workflow previously built and shipped to
   production without ever running the test suite. It now runs the
   Playwright suite on every push to `main` and blocks deploy on failure.
2. **PR feedback loop.** CI previously only triggered on `main`, so feature
   branches got zero feedback until after merge+deploy. The workflow now
   runs build+test on every pull request (deploy stays main-only).
3. **Baseline integrity.** The visual-regression "baseline" screenshots were
   being silently overwritten on every test run — the test could never fail,
   so it was an open loop wearing a closed loop's clothes. Rewrites are now
   opt-in via `UPDATE_BASELINE=1`. (True pixel-diffing is still a follow-up;
   see below.)
4. **Memory seed.** Added `CLAUDE.md` distilling the operational knowledge
   that was previously only in a one-shot handover doc (`TESTING.md`, which
   opens "You are picking this up cold" — direct evidence the memory loop
   wasn't closing).

## Loops only the orchestrator can close

These need visibility across the fleet (Friday, Jarvis, Codex, Claude Code)
and the vault — no single executor can build them from inside one repo.

1. **Memory loop (highest leverage).** Pattern observed here: executors hand
   off via ad-hoc one-shot docs, and each session re-derives context. The
   closed version: vault → per-repo context file (`CLAUDE.md` / `AGENTS.md`)
   generated or synced from vault notes, and executor session outcomes
   written back to the vault on completion. The vault should be the source;
   repo context files should be projections of it, not parallel truths.
2. **Audit loop across repos.** The defect found here — a "test" that
   rewrites its own expected output and therefore can never fail — is a
   pattern worth sweeping for in every executor workspace: open loops
   disguised as closed ones (tests not wired into CI, CI not gating deploy,
   baselines that self-update, linters that run but don't fail the build).
3. **Cadence/dispatch loop.** Recurring jobs (e.g. weekly: re-run this
   repo's contract suite against the live URL; nudge on the five placeholder
   routes that are meant to become real pages) belong in Friday's scheduler,
   not in any one executor's session, because sessions here are ephemeral.

## Suggested next dispatches for this repo

- Build the five placeholder pages (`/bible-stories/`, `/daily-scriptures/`,
  `/devotionals/`, `/about/`, `/childrens-emails/`) — the nav has shipped
  links to them since launch, and the test suite documents them as dead.
- Add real pixel-diffing against `tests/baseline/` (Playwright
  `toHaveScreenshot` with Linux-generated baselines, since CI runs Linux and
  the current baselines were captured on macOS — cross-OS diffs will be
  noise until regenerated).
