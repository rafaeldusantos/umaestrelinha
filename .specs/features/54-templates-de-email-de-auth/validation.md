# Validation — templates de e-mail de auth (feature 54)

**Verdict: PASS** ✅ (with 2 minor spec-precision gaps noted below — neither blocks close)

**Author ≠ verifier**: yes, fresh eyes, no prior context on this feature.

**Scope verified** (per the shared-tree instructions, exactly these 6 paths — nothing from the
concurrent, unrelated `53-aba-de-notificacoes` session was touched or evaluated):

- `supabase/templates/magic_link.html` (modified)
- `supabase/templates/confirmation.html` (modified)
- `supabase/templates/recovery.html` (modified)
- `apps/store/src/shared/lib/__tests__/authEmailTemplates.test.ts` (new, 23 cases)
- `CLAUDE.md` (root, doc-only)
- `.specs/features/54-templates-de-email-de-auth/spec.md` (read as source of truth)

---

## Spec-anchored coverage (AET-01..07)

| AC | Spec outcome | Test file:line | Assertion | Covered? |
| --- | --- | --- | --- | --- |
| AET-01 | Templates SHALL contain `{{ .Token }}` and SHALL NOT contain `{{ .ConfirmationURL }}` | `authEmailTemplates.test.ts:82-88` | `expect(html).toContain('{{ .Token }}')` / `.not.toContain('{{ .ConfirmationURL }}')`, `it.each(FILES)` | Yes, with a precision gap — see Finding 1 |
| AET-02 | SHALL NOT contain `<style`, `<link`, `@font-face`, `<script` | `:90-102` | `stripComment(RAW[name]).toLowerCase()` then 4× `.not.toContain(...)`, `it.each(FILES)` | Yes |
| AET-03 | Hex color in renderable body (outside top comment) SHALL belong to `ESTRELINHA` palette (`layout.ts`, read as text) | `:104-126` | `stripComment`, regex `#([0-9A-Fa-f]{6})(?![0-9A-Fa-f])`, membership check against `ALLOWED_HEX` parsed from `layout.ts` via `readFileSync` (never imported) | Yes |
| AET-04 | `#B8945F` SHALL NOT be used as `color:` | `:128-131` | `stripComment(...).toLowerCase()`, `not.toMatch(/color:\s*#b8945f/)` | Yes |
| AET-05 | Casco (outer table, header band, card open, body-cell open, code box, footer) SHALL be byte-identical across the 3 files, excluding `<h1>`, lead `<p>`, and note `<p>` | `:134-154` | `fromOuterTable(stripComment(...))` then `maskVariableRegions`, `expect(b).toBe(a)` / `expect(c).toBe(a)` (strict string equality) | Yes |
| AET-06 | Hidden preheader (`display:none` inline, no `<style>`), non-empty, distinct per template, derived from the existing lead paragraph | `:156-180` | 3 `it.each` + 1 standalone: presence + `display:none` + no `<style`, then `.toContain(lead)`, then `Set(...).size === FILES.length` | Yes |
| AET-07 | Deliver the 3 comment-stripped HTMLs + subject table to the user for manual dashboard paste | N/A by nature | — | N/A — chat/doc deliverable, not a code artifact. Not applicable to test coverage. |

**Edge cases (spec, non-numbered) — all verified**:
- Exactly 3 `.html` files found (`:74-79`, `readdirSync` + `toEqual(sorted 3-name array)`) — real count anchor, not `>0`.
- CRLF normalized before any regex (`read()`, `:27-32`, `.replace(/\r\n/g, '\n')`) — L-031.
- Comment stripped once with a single alternation-free regex that handles the block comment (`stripComment`, `:40-42`) — no line-comment variant needed here since these are static HTML files (only one block comment per file), so the line/block dual-pass trap (`BL-027`) does not apply to this guard the way it does to the JS/TS guards.
- 6-digit hex not confused with an 8-digit alpha-channel prefix: negative lookahead `(?![0-9A-Fa-f])` at `:121` — verified this is exercised (the palette itself has no 8-digit hex in the fixtures, but the regex construction is correct and was not the target of an assigned mutation; confirmed by inspection, not injection).
- No occurrence of the retired `send.` subdomain anywhere in the diff (checked via `git diff` grep) and `authSenderDomain.test.ts` passes clean (4/4) against the new content.

---

## Gate

```
cd apps/store && npx vitest run src/shared/lib/__tests__/authEmailTemplates.test.ts --testTimeout=20000
```

- **Result**: 23 passed, 0 failed. **Exit code: 0.**
- Run twice (once before mutation testing, once after full revert) — identical result both times.
- `authSenderDomain.test.ts` also run standalone as due diligence: 4/4 passed.

---

## Sensor results (mutation testing, scratch-reverted)

All 3 template files were snapshotted to a `mktemp -d` scratch dir before any mutation; each mutation
was applied to the real working-tree file, the guard re-run, then the file restored from the scratch
copy. `git diff --stat` after every restore matched the pre-mutation (post-implementation) diff
exactly — no residual changes.

| # | Mutation | Target file | Result |
| --- | --- | --- | --- |
| 1 | `{{ .Token }}` → `{{ .ConfirmationURL }}` (the one visible occurrence) | `magic_link.html` | **Killed** — AET-01's exact test (`magic_link.html usa {{ .Token }}...`) failed, plus AET-05 casco (expected, since the span content differs). |
| 2 | Injected `<style>.x{color:red}</style>` into visible body (before `<h1>`) | `confirmation.html` | **Killed** — AET-02's exact test failed, plus AET-05 casco. |
| 3 | Changed a visible-body `color:` from `#54616B` to off-palette `#123456` | `recovery.html` | **Killed** — AET-03's exact test (`recovery.html só usa hex da paleta...`) failed, plus AET-05 casco. |
| 4 | `background:#B8945F` → `color:#B8945F` on the fio `<div>` | `magic_link.html` | **Killed** — AET-04's exact test failed, plus AET-05 casco. |
| 5 | Changed one word in the shared footer casco of `magic_link.html` only (`eternizando` → `guardando`) | `magic_link.html` | **Killed** — AET-05's casco-identity test failed (only that test; AET-01..04, AET-06 stayed green, confirming AET-05 is the one guarding footer drift). |
| 6 | Deleted both preheader `<div>` lines entirely | `confirmation.html` | **Killed** — both of AET-06's `confirmation.html` tests failed (presence check and lead-text check). |

**6/6 mutations killed, 0 survived.** Final state confirmed clean: `git diff --stat` on the 3
templates matches the original post-implementation diff exactly, and the full guard re-run is
23/23 green, exit 0.

---

## The "guard rejects its own prose" trap (CLAUDE.md pattern) — checked, not present as a false-fail; a related false-pass risk found instead

Checked whether any of the 3 templates' top documentation comments contain a literal form the guard
recusa, which would make the guard reject the very file that documents the restriction (the
`supabase start` / `authSenderDomain.test.ts` pattern this repo has hit twice):

- `magic_link.html`'s comment mentions `<style>` in prose (line 9) and several hex codes including
  `#B8945F` (lines 4-6, 16). AET-02/AET-03/AET-04 all call `stripComment()` before scanning, so none
  of this prose is scanned. Verified directly: mutations 2-4 above prove the guard *does* still catch
  real violations in the visible body while the comment's own citations sit untouched in all 3 clean
  runs.
- `recovery.html`'s comment (lines 4-8) literally contains `{{ .Token }}` and the word
  `ConfirmationURL` (without the `{{ .  }}` wrapper: "`(não ConfirmationURL)`"). AET-01 does **not**
  call `stripComment()` — it reads `RAW[name]` directly. Today this is harmless for the *negative*
  assertion (`{{ .ConfirmationURL }}` as an exact bracketed string is not present in any comment), so
  no false failure occurs.

**Finding 1 (minor, informational — not required by the assigned mutation list, found by extending
it)**: because AET-01's *positive* assertion (`toContain('{{ .Token }}')`) also reads the unstripped
`RAW[name]`, and `recovery.html`'s comment already quotes `{{ .Token }}` literally, the positive half
of AET-01 can **false-pass** for `recovery.html` specifically if the token were removed from the
visible `<span>` and replaced with an unrelated GoTrue variable that doesn't spell
`ConfirmationURL`. Verified by injection (scratch-reverted, not part of the assigned 6):
replacing the visible `{{ .Token }}` in `recovery.html`'s code box with `{{ .OneTimePasscode }}` —
run filtered to `-t AET-01` — passed 3/3 for `recovery.html` (comment still supplies the string).
Run **without** the filter, the same mutation is still killed by AET-05 (casco byte-identity), since
that `<span>` sits outside the 3 masked variable regions — so the **suite as a whole** (all `describe`
blocks together) never lets this specific defect through; only AET-01 in isolation is fooled, and it
is backstopped by a different AC. `magic_link.html` and `confirmation.html` have no `{{ .Token }}`
mention in their comments, so this risk is unique to `recovery.html`'s more elaborate documentation
header. **Not severe enough to fail the gate** (full suite is still red on the underlying defect,
and the current templates are correct), but worth a follow-up: stripping the comment for AET-01 too
would remove the asymmetry and make it robust file-by-file rather than only in aggregate.

**Finding 2 (cosmetic)**: the new `CLAUDE.md` guard-table row states the guard catches "perder
`{{ .Token }}`" for "qualquer um dos 3" templates. That claim is true at the suite level (confirmed
above) but not, in isolation, at the single-`describe`-block level for `recovery.html`. Not worth
rewriting the row over — the guard-table entries in this repo are pitched at "what breaks the suite",
which remains accurate — but noted here in case a future editor wants AET-01 hardened.

Neither finding is a regression, a spec violation, or a case of the guard failing to catch a real
defect end-to-end. Both are precision notes about test *design*, not about the templates or the
guard's net effect.

---

## `CLAUDE.md` internal consistency

- The new guard-table row (`authEmailTemplates.test.ts`) accurately describes the 6 failure classes
  the test enforces (Token/ConfirmationURL, forbidden tags outside comment, off-palette hex, accent
  as `color:`, casco divergence outside the 3 variable regions, preheader regressions), and correctly
  notes "nenhum outro comando lê `supabase/templates/`". Matches what was verified above (see Finding
  2 for the one over-broad phrasing, which doesn't misrepresent the guard's net behavior).
- The *Estado conhecido* entry was checked for the specific requirement in the task: does it still
  make clear the manual dashboard-paste step is **not** done? Yes — it explicitly says "É o único
  passo que resta — o SMTP do auth foi ativado no dashboard em 2026-09-19, e os três templates
  **ainda não** foram colados", and separately states `authEmailTemplates.test.ts` "prova o conteúdo
  do repositório, nunca o que está colado no dashboard." No ambiguity about code-side prep (done) vs.
  manual action (pending).
- Baseline delta note (+23/+1) is arithmetically correct (23 `it`/`it.each` cases counted directly in
  the test file: 1+3+3+1+3+3+1+1+3+3+1 = 23) and the tree-sharing caveat (why the main baseline table
  row for `store` wasn't bumped) is self-consistent with the scope instructions given for this
  verification — the concurrent `53` session's failing `notificationSingleOwner.test.ts` was
  confirmed out of scope and not evaluated here.

---

## Summary

7 ACs: 6 code-testable (AET-01..06), all covered with exact `file:line` citations; 1 (AET-07) is a
documentation/chat deliverable, correctly not represented in the test file. Gate is green (23/23,
exit 0). All 6 assigned mutations killed the intended, exact tests. Two minor, non-blocking precision
notes recorded for a future hardening pass. No regressions found in the 6-file scope.

---

## Post-verification fix

Finding 1 was applied rather than left as a follow-up: AET-01 now calls `stripComment()` before both
the positive and negative assertions, matching AET-02/03/04. The `recovery.html` false-pass-in-isolation
described above is closed. Re-ran the gate after the change: `23 passed, 0 failed`, exit 0 — same test
count, no new cases needed (the fix tightens an existing assertion's input, it doesn't add a scenario).
Finding 2 is now also moot: the guard-table row's claim is accurate at the single-`describe`-block
level too, not just at the suite level.
