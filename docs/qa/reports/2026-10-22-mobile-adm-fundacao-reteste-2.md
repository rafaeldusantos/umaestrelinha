# QA Run Report — 2026-10-22 — mobile-adm-fundacao-reteste-2

- **Scope:** branch `feat/72-mobile-adm-fundacao`, depois do conserto de `BUG-20261022-voltar-depois-de-salvar-volta-a-recuperacao` (opção 1: a gravação devolve os passos que a recuperação empilhou) e de dois paper cuts do reteste anterior: "Tentar de novo" sem rede não volta mais à splash, e o título do documento com a tela Sem conexão na frente. Canário: entrar e sair, a recuperação completa com o código do Mailpit, e o voltar entre os passos.
- **Cadence tier:** sanity (+ reteste)
- **Build:** working tree sobre `b6449bd2` (sem commit da `72`), `vite build` + `vite preview` (bundle servido `index-548rgCtv.js`, conferido contra o `dist/`, com `profundidade`, `Conferindo…` e `Sem conexão · Ateliê` presentes) · **Environment:** http://localhost:8085 (8082, 8083 e 8084 são de outras sessões, não tocadas), Supabase **local real** (API :54441, Mailpit :54444), auth real
- **Started:** 2026-10-22 · **Status:** closed

## Personas

| Persona | Base | Device / Network / Locale | Sessions |
|---|---|---|---|
| Adri recuperando o acesso | Recovering User | Android 390×844, local, pt-BR | CH-recuperar-acesso-pelo-celular, CH-voltar-do-android-no-atelie |
| Adri no celular | Mobile User | Android 390×844, local / rede inútil / modo avião, pt-BR | CH-atelie-com-rede-ruim, CH-entrar-no-atelie-pelo-celular |

## Flows in Scope

- `J-recuperar-acesso` (`../journeys/J-recuperar-acesso.md`)
- `J-sem-conexao` (`../journeys/J-sem-conexao.md`)
- `J-entrar-no-atelie` (`../journeys/J-entrar-no-atelie.md`) — canário

## Session Matrix & Results

| # | Charter | Journey / Scenario | Persona | Tour | Status | Issue | Fix commit |
|---|---|---|---|---|---|---|---|
| 1 | CH-voltar-do-android-no-atelie | J-recuperar-acesso / MAD-recuperar-acesso-por-codigo (o voltar depois de salvar) | Adri recuperando o acesso | Back-Button | Pass | BUG-20261022-voltar-depois-de-salvar-volta-a-recuperacao (retest pass) | working tree |
| 2 | CH-atelie-com-rede-ruim | J-sem-conexao / MAD-rede-inutil-recusa-falsa ("Tentar de novo" sem rede) | Adri no celular | Network | Pass | paper cut resolvido | working tree |
| 3 | CH-atelie-com-rede-ruim | J-sem-conexao / MAD-rede-cai-com-app-aberto (título offline) | Adri no celular | Network | Pass | paper cut resolvido | working tree |
| 4 | CH-entrar-no-atelie-pelo-celular | J-entrar-no-atelie / MAD-entrar-e-chegar-ao-inicio + MAD-sair-volta-ao-login (canário) | Adri no celular | Feature | Pass | | |
| 5 | CH-recuperar-acesso-pelo-celular | J-recuperar-acesso / MAD-recuperar-acesso-por-codigo (completa + voltar entre passos, canário) | Adri recuperando o acesso | Back-Button | Pass | | |

Status legend: `Pending | Pass | Fixed | Skipped | Blocked (needs human verify) | Blocked (human decision)`

## Session Debriefs

> Driver: Playwright (Chrome for Testing 1228, headless), Android emulado (UA Chrome 130 Android 14, `isMobile`, `hasTouch`, DPR 2,625), 390×844, pt-BR, America/Sao_Paulo. Scripts no scratchpad da sessão (`qa3/r1.js`, `qa3/r2.js`). Nada do produto interceptado, salvo o bloqueio deliberado de `127.0.0.1:54441` e o modo avião nas sessões de rede.

### CH-voltar-do-android-no-atelie + CH-recuperar-acesso-pelo-celular — Adri recuperando o acesso (rows 1 e 5)

- **Ran:** duas passadas completas, ~3 min cada, 62 s de intervalo entre elas (o reenvio do servidor). A primeira troca para `senha-qa-2` pelo caminho direto; a segunda entra e sai antes (canário), recupera com voltar/avançar em cada passo e devolve `senha-qa-1`. Histórico do teste: `about:blank` → `/login` (o `about:blank` faz o papel de "o que havia antes do app").
- **Walk:**
  1. Login → "Esqueci minha senha" → e-mail → "Enviar código" ⇒ `/recuperar/codigo`; o código chega no Mailpit em < 1 s. `pass`
  2. (2ª passada) voltar no passo do código ⇒ `/recuperar`; avançar ⇒ código; voltar no passo da senha ⇒ código; avançar ⇒ senha. `pass`
  3. Código digitado ⇒ "Conferir código" ⇒ `/recuperar/senha`; senha nova duas vezes ⇒ "Salvar e entrar" ⇒ Início com as abas. `pass`
  4. **Voltar da Início** ⇒ `about:blank` — **saiu do app de uma vez**, nas duas passadas. Amostra a cada 50 ms durante o voltar: "Digite o código" **nunca** apareceu. `pass` (era: código → e-mail → Início → só o quarto saía)
  5. **True end (leitura independente):** perfil novo — a senha anterior ⇒ fica no Login; a nova ⇒ Início. Nas duas passadas. `pass`
- **Bugs filed/updated:** `BUG-20261022-voltar-depois-de-salvar-volta-a-recuperacao` — `## Verification` (pass).
- **Scenarios settled:** MAD-recuperar-acesso-por-codigo → pass (retest pass)
- **Limpeza:** a senha da `adri.qa` voltou a `senha-qa-1` pelo próprio fluxo e foi conferida entrando num perfil novo. `admin@umaestrelinha.dev` não foi tocada.
- **Evidence:** `docs/qa/evidence/2026-10-22-mobile-adm-fundacao-reteste-2/R1-inicio-depois-de-salvar-senha-qa-2.png`, `R1-voltar-da-inicio-senha-qa-2.png`, `R1-inicio-depois-de-salvar-senha-qa-1.png`, `R1-voltar-da-inicio-senha-qa-1.png`

### CH-entrar-no-atelie-pelo-celular (canário, row 4) — Adri no celular

- **Walk:** entrar com `senha-qa-2` ⇒ Início; "Sua conta" → "Sair" ⇒ Login; recarregar ⇒ continua no Login. `pass`
- **Scenarios settled:** MAD-entrar-e-chegar-ao-inicio → pass · MAD-sair-volta-ao-login → pass

### CH-atelie-com-rede-ruim — Adri no celular (rows 2 e 3)

- **Ran:** ~1 min, perfil persistente com sessão admin salva e service worker; só `127.0.0.1:54441` bloqueado (`navigator.onLine` verdadeiro).
- **Walk (row 2):** `/pedidos` ⇒ "Não consegui conferir seu acesso." + "Tentar de novo". Toque em "Tentar de novo" com a rede ainda fora (amostra a cada 100 ms):
  - **Falha rápida:** em 3 ms o botão vira "Conferindo…" travado, a frase continua na tela, **sem splash**; em **7,07 s** volta "Tentar de novo". `pass`
  - **Sem resposta:** "Conferindo…" travado em 1 ms, frase na tela, sem splash; "Tentar de novo" em **8,07 s**. `pass`
  - Rede de volta ⇒ "Tentar de novo" ⇒ `/pedidos`, título "Pedidos · Ateliê". `pass`
- **Walk (row 3):** em `/clientes` ("Clientes · Ateliê"), modo avião ⇒ tela Sem conexão e título **"Sem conexão · Ateliê"**; a rede volta ⇒ `/clientes` e "Clientes · Ateliê"; tocar Pedidos ⇒ "Pedidos · Ateliê". `pass`
- **Observation (fora do escopo, dull):** na tela "Não consegui conferir seu acesso." o título do documento é o genérico "Ateliê · Uma Estrelinha". Não é o que foi consertado (a tela Sem conexão), não prejudica a tarefa; anotado em Paper Cuts.
- **Evidence:** `docs/qa/evidence/2026-10-22-mobile-adm-fundacao-reteste-2/R2-falha-rapida-frase.png`, `R2-falha-rapida-conferindo.png`, `R2-sem-resposta-frase.png`, `R2-sem-resposta-conferindo.png`, `R3-sem-conexao-titulo.png`

## What Was Fixed

Nada neste ciclo (reteste). Os três consertos verificados estão na working tree, sem commit (regra do projeto).

## Paper Cuts

| Persona | Where (journey/step) | Felt | Sharpness | Outcome |
|---|---|---|---|---|
| Adri no celular | J-sem-conexao, "Tentar de novo" com a rede inútil | antes: a splash voltava e parecia reabrir do zero. Agora: a mesma tela com "Conferindo…" travado | — | resolvido |
| Equipe com TalkBack | J-sem-conexao step 1 | antes: "Clientes · Ateliê" com a tela Sem conexão. Agora: "Sem conexão · Ateliê" | — | resolvido |
| Adri no celular | J-sem-conexao, tela "Não consegui conferir seu acesso." | o título da aba é o genérico "Ateliê · Uma Estrelinha" | dull | watching |
| Adri no celular | J-sem-conexao, rede sem resposta | 8,07 s até "Tentar de novo" voltar — no limite de `MAF-23` | dull | watching |

## Runtime Errors Observed

Nenhum `pageerror` e nenhuma resposta ≥ 400 nas sessões de recuperação. Nas de rede, só as falhas do bloqueio deliberado.

## Human Verifications Needed

As do ciclo anterior continuam (`reports/2026-10-22-mobile-adm-fundacao-reteste.md`), no Android da Adri. A do voltar ganha um item:

- [ ] **Recuperar no aparelho:** depois de "Salvar e entrar", um gesto de voltar na Início fecha o app (sem mostrar "Digite o código").

## Decisions for a Human

Nenhuma.

## Learnings

- O voltar depois do fim de um fluxo com rotas só se prova com o histórico começando **antes** do app (`about:blank`): começando no próprio Login, o "saiu" e o "caiu no Login" se confundem.

## Final Status

- **Exit gate:** `pnpm --filter @estrelinha/mobile-adm test --testTimeout=20000` → `Test Files 26 passed (26) · Tests 267 passed (267)`, **exit 0** (capturado fora de pipe). Nenhum código foi alterado neste ciclo; loja e painel não rodaram.
- **Issues by user impact (neste ciclo):** Blocks-Completion 0 · Data-Loss 0 · Trust-Damage 0 · Friction 0 · Cosmetic 0. Retestes: 1/1 pass. Paper cuts: 2 resolvidos, 1 dull novo (título genérico na tela "Não consegui conferir").
- **Coverage:** 5 linhas — 5 Pass, 0 Blocked, 0 Skipped.
- **Parity:** Supabase local com auth real e e-mail no Mailpit; Chrome for Testing headless com UA de Android, não um aparelho; rede inútil por bloqueio do host; modo avião por `setOffline`.
- **Fidelity:** nenhum passo decidido por leitura de banco ou de código; as leituras independentes foram por perfil novo de navegador.
- **Verdict:** **ready** — os três itens se sustentam no build servido; restam só as verificações no aparelho já listadas.
