# QA Run Report — 2026-10-24 — mobile-adm: ações no pedido (feature 75)

- **Scope:** branch `feat/75-mobile-adm-acoes-do-pedido` (árvore não commitada sobre `2a285bab`): o rodapé de
  ação do detalhe (Recebi o material, Iniciar separação, Marcar como enviado, Salvar rastreio, Marcar como
  retirado), a folha do rastreio (Informar/Alterar), o botão de ação do cartão da lista e o lembrete de
  envio no WhatsApp.
- **Cadence tier:** targeted
- **Build:** `2a285bab` + árvore de trabalho da `75` · **Environment:** `pnpm dev:mobile-adm` (:8084) do
  worktree, Supabase LOCAL (:54441, nada interceptado do banco), `send-notification` servida por
  `supabase functions serve` com `RESEND_API_KEY` inválida de propósito (o evento é reivindicado e o envio
  falha — nenhum e-mail sai). Conta: a admin do `seed.sql`.
- **Started:** 2026-10-24 · **Status:** closed

## Personas

| Persona | Base | Device / Network / Locale | Sessions |
|---|---|---|---|
| Adri no celular | dona do ateliê | 390×844 (depois 1440), 4G, pt-BR | CH-acoes-registrar-o-dia-no-celular, CH-acoes-toque-duplo-e-corrida, CH-acoes-com-rede-ruim, CH-acoes-voltar-do-android-na-folha, CH-acoes-com-fonte-grande |
| Admin que perde o papel | equipe | 390×844, wifi | CH-acoes-conta-sem-acesso |

## Flows in Scope

- `J-registrar-material-e-envio` — levar o pedido do envelope à entrega pelo celular (`../journeys/J-registrar-material-e-envio.md`)
- canário adjacente: `J-ver-um-pedido` (o detalhe só de leitura da `74`)

## Session Matrix & Results

| # | Charter | Journey / Scenario | Persona | Tour | Status | Issue | Fix commit |
|---|---|---|---|---|---|---|---|
| 1 | CH-acoes-registrar-o-dia-no-celular | J-registrar-material-e-envio / MAD-acao-recebi-o-material | Adri no celular | Money Tour | Pass | | |
| 2 | CH-acoes-registrar-o-dia-no-celular | MAD-acao-iniciar-separacao | Adri no celular | Money Tour | Pass | | |
| 3 | CH-acoes-registrar-o-dia-no-celular | MAD-acao-marcar-como-enviado / MAD-acao-rastreio-informar-ou-alterar | Adri no celular | Money Tour | Blocked (human decision) | BUG-20261024-folha-afirma-aviso-que-falhou | |
| 4 | CH-acoes-registrar-o-dia-no-celular | MAD-acao-marcar-como-retirado | Adri no celular | Money Tour | Pass | | |
| 5 | CH-acoes-registrar-o-dia-no-celular | MAD-acao-lembrete-whatsapp (com e sem telefone) | Adri no celular | Money Tour | Pass | | |
| 6 | CH-acoes-registrar-o-dia-no-celular | MAD-acao-sem-acao-cancelado-ou-entregue | Adri no celular | Money Tour | Pass | | |
| 7 | CH-acoes-toque-duplo-e-corrida | MAD-acao-toque-duplo-trava / MAD-acao-pedido-mudou-enquanto-olhava | Adri no celular | Multi-Tab Tour | Blocked (human decision) — bug aberto, conserto pendente | BUG-20261024-tentar-de-novo-diz-falha-sem-tentar | |
| 8 | CH-acoes-com-rede-ruim | MAD-acao-falha-de-rede-ao-salvar / MAD-acao-aviso-falha-gravacao-vale | Adri no celular | Network Tour | Pass | | |
| 9 | CH-acoes-conta-sem-acesso | MAD-acao-conta-sem-papel-nao-grava | Admin que perde o papel | Garbage Tour | Pass | | |
| 10 | CH-acoes-voltar-do-android-na-folha | MAD-acao-folha-e-voltar-do-android / MAD-acao-codigo-de-rastreio-recusado | Adri no celular | Back-Button Tour | Pass (gesto real: Blocked, needs human verify) | | |
| 11 | CH-acoes-com-fonte-grande | MAD-acao-fonte-grande-e-telas-estreitas (390 e 1440, 130 % e 200 %) | Adri no celular | Feature Tour | Pass | | |
| 12 | CH-acoes-com-leitor-de-tela | MAD-acao-com-leitor-de-tela | Equipe com TalkBack | Feature Tour | Blocked (human decision) — bugs abertos; TalkBack real: Blocked (needs human verify) | BUG-20261024-folha-fecha-e-foco-cai-no-body, BUG-20261024-botao-do-cartao-sem-o-pedido-no-nome | |

Status legend: `Pending | Pass | Fixed | Skipped | Blocked (needs human verify) | Blocked (human decision)`

## Session Debriefs

Banco antes/depois (fixturas `P75-N1..N6` da prova + extras de QA `P75-N7..N12`: sem telefone, só espaços no
telefone, cancelado com material aguardando, separação para a corrida, material na bancada):
`orders 54 · order_items 82 · order_status_history 22 · order_notifications 11 · order_notes 8 ·
orders_number_seq 183/true · auth.users 9 · customers 9 · user_roles 3` — **idênticos** depois de `prova/limpa.sql`
e do papel admin devolvido. Toda escrita foi conferida pela rede capturada no navegador e no banco local.

### CH-acoes-registrar-o-dia-no-celular — Adri no celular (390×844)

- **Findings:**
  - "Recebi o material" (`P75-N1`): **uma** chamada `rpc/set_material_status` (`material_recebido`), um disparo
    `material_status_changed`, releitura do detalhe/lista/Início; confirmação `role="status"` "Material
    registrado. · O pedido #P75-N1 foi para a bancada." sem citar e-mail (o envio falhou: chave inválida — A11
    certo); o foco ficou no rodapé, relido como "Iniciar separação". Banco: `material_recebido`,
    `material_received/email failed`, nenhuma linha de status (o status não mudou).
  - "Iniciar separação" com o material na bancada: `set_material_status(em_producao)` → `PATCH orders
    status=eq.paid` → `order_status_history paid→separating` → disparo; "Separação iniciada. · Pedido #P75-N1 em
    produção.".
  - "Marcar como enviado": código curto recusado no campo **sem rede** ("Confira o código — ele costuma ter 13
    caracteres."); `' aa 1234 5678 9br '` normalizado para `AA123456789BR`; `PATCH tracking_code` com
    `status=in.(separating,shipped)` → `PATCH status=eq.separating` → histórico `separating→shipped` uma vez →
    **um** disparo. "Alterar" com o mesmo código e com código novo: guarda `status=in.(shipped)`, nenhuma linha
    de histórico nova. **Achado**: a folha "Alterar" diz "A cliente já recebeu o aviso de postagem" enquanto o
    histórico mostra o `order_shipped` falho, e cada "Alterar" reenvia esse aviso (`attempts` 1→3) ⇒
    BUG-20261024-folha-afirma-aviso-que-falhou (frase de A10, decisão de spec).
  - `delivered` sem código → "Informar": "Salvar rastreio · O código aparece no pedido dela.", guarda
    `status=in.(delivered)`, confirmação sem e-mail.
  - Retirada (`P75-N5`, separação): rodapé "Marcar como retirado" → `PATCH status=eq.separating` →
    `separating→delivered`; "Retirada registrada. · Pedido #P75-N5 entregue."; sem "Informar" na Entrega.
  - Lembrete: com telefone (`P75-N6`, 84 dias) `wa.me/5551999990006?text=…`, `target=_blank`,
    `rel="noopener noreferrer"`, mensagem sem nomear o material e sem urgência ("Sem pressa nenhuma.");
    sem telefone (`N7`) e telefone só com espaços (`N12`): nem lembrete nem link de WhatsApp (MAA-17).
  - Cancelado com material aguardando (`N9`) e entregue: sem rodapé, sem lembrete.
- **Bugs filed/updated:** BUG-20261024-folha-afirma-aviso-que-falhou
- **Paper cuts:** sem telefone, o bloco Material não diz por que não há lembrete; o histórico da retirada diz
  "Em Separação → Entregue" sob o selo "Retirado" (rótulo herdado da `74`); a mensagem de falha do aviso mostra o
  erro cru do provedor ("401 validation_error: API key is invalid") — herdado da `74`.
- **Surprises:** o recorte "Aguardando material" da Início/lista (24) inclui pedidos cancelados e com pagamento
  pendente (`QUEUE_BLOCKS.aguardando` só olha `material_status`) — regra da `73`, fora do diff; a `75` não oferece
  ação aos cancelados, corretamente.

### CH-acoes-toque-duplo-e-corrida — Adri no celular

- **Findings:**
  - Toque duplo com rede lenta (latência 1,5 s): o botão vira "Salvando…" com `aria-disabled`, **uma**
    `set_material_status` só (`P75-N8`).
  - Painel cancela com a folha aberta e o Realtime de pé: a folha fecha sozinha com "Este pedido mudou enquanto
    você olhava." (MAA-26). Com o Realtime bloqueado e "Salvar": `PATCH … status=in.(separating,shipped)` com
    zero linhas → `atelie_clock` → "Este pedido mudou enquanto você olhava."; banco: `cancelled`, **sem código**.
  - Duas abas tocando "Iniciar separação" no mesmo pedido (`P75-N11`): banco certo (uma linha `paid→separating`),
    mas a aba que perdeu mostra a frase de falha parcial (falsa) e o "Tentar de novo" responde "Não consegui
    salvar. Tente de novo." **sem nenhuma requisição** ⇒ BUG-20261024-tentar-de-novo-diz-falha-sem-tentar.
- **Bugs filed/updated:** BUG-20261024-tentar-de-novo-diz-falha-sem-tentar

### CH-acoes-com-rede-ruim — Adri no celular

- **Findings:** `set_material_status` em 500 ⇒ "Não consegui salvar. Tente de novo.", pedido igual; a
  `send-notification` em 500 ⇒ gravação vale, confirmação sem e-mail, nenhum erro; o `PATCH` do status sem rede
  depois do material ⇒ "A produção ficou registrada, mas o pedido não passou para separação." e "Tentar de
  novo" grava **só** o status (nenhum segundo `set_material_status`) — "Separação iniciada. · em separação.";
  offline total ⇒ a tela "Sem conexão" da `72`, sem rodapé, nada enfileirado nem reenviado ao voltar.

### CH-acoes-conta-sem-acesso — Admin que perde o papel

- **Findings:** papel removido com o detalhe aberto: "Recebi o material" (`not_admin`) e "Salvar rastreio"
  (zero linhas + `atelie_clock` 403) levam à recusa da `72` ("Esta conta não tem acesso ao painel."), nenhuma
  confirmação, `orders` sem mudança (`P75-N4` continua sem código). Papel devolvido no fim (user_roles 3).

### CH-acoes-voltar-do-android-na-folha — Adri no celular

- **Findings:** folha aberta pelo cartão da lista → voltar ⇒ folha fechada, mesma lista; detalhe → folha →
  "Agora não" → voltar ⇒ `/pedidos?visao=tudo`. Recusa do código curto sem rede (acima). F5 e o gesto real
  ficaram com a prova da T31 / aparelho.

### CH-acoes-com-fonte-grande — Adri no celular

- **Findings:** 390×844 e 1440×900 × 100/130/200 %: detalhe com rodapé, folha aberta e lista com botões —
  `scrollWidth == innerWidth` nas 18 medidas, nenhum botão/link cortado, nenhum alvo < 44 px.
- **Paper cuts:** a 200 % o placeholder do campo ("Ex.: AN123456789BR") é cortado; "Agora não" quebra em
  duas linhas (legível).

### CH-acoes-com-leitor-de-tela — Equipe com TalkBack (árvore e foco no Chromium)

- **Findings:** confirmação em `role="status"` sem roubar o foco; erro em `role="alert"` que fica; com
  `prefers-reduced-motion: reduce`, zero animações ao abrir a folha. **Falhas**: ao fechar a folha (Agora não,
  Escape, voltar, ou depois do sucesso) o foco cai no `<body>` ⇒ BUG-20261024-folha-fecha-e-foco-cai-no-body; os
  botões dos cartões não têm o pedido no nome (20+ "Recebi o material" iguais) ⇒
  BUG-20261024-botao-do-cartao-sem-o-pedido-no-nome. TalkBack real: Blocked (needs human verify).

## What Was Fixed

## Paper Cuts

| Persona | Where (journey/step) | Felt | Sharpness | Outcome |
|---|---|---|---|---|
| Adri no celular | detalhe sem telefone | nenhuma pista de por que não há lembrete | dull | registrado |
| Adri no celular | histórico da retirada | "Em Separação → Entregue" sob o selo "Retirado" | dull | herdado da `74` |
| Adri no celular | histórico com aviso falho | erro cru do provedor de e-mail na tela | medium | herdado da `74` |
| Adri no celular | folha a 200 % | placeholder cortado | dull | registrado |

## Decisions for a Human

- **BUG-20261024-folha-afirma-aviso-que-falhou** — a frase (2) de A10 depende só de (status, código). Opções:
  (a) ler o estado do `order_shipped` e usar a frase neutra quando ele não está `sent` (recomendado);
  (b) manter A10 e aceitar a frase falsa no caso do aviso falho.
- **BUG-20261024-tentar-de-novo-diz-falha-sem-tentar** — o "Tentar de novo" que encontra o pedido fora de
  `separar` deve dizer "Este pedido mudou enquanto você olhava." (conserto de código, recomendado já); trocar
  também a frase parcial quando a releitura mostra o status de destino é mudança de letra de `MAA-40`.

## Final Status

**Não pronto para merge sem decisão**: 4 bugs abertos — Trust-Damage 2 (1 Medium, 1 Low), Friction 2 (Low,
acessibilidade). Nenhum Blocks-Completion nem Data-Loss: em todos os percursos o banco ficou certo (escrita
pela porta do dono, guardas `expectedFrom`, uma linha de histórico por mudança, zero escritas sem papel).
Nenhum conserto aplicado nesta rodada (sem commit).

Exit gate: `pnpm --filter @estrelinha/mobile-adm test --testTimeout=20000` → **76 arquivos, 1080 testes,
exit 0** (a árvore não foi alterada por esta sessão; as suítes da loja e do painel não foram re-rodadas aqui).
Ambiente derrubado no fim: `:8084` livre, `supabase functions serve` parado (gateway voltou ao 503), fixturas
removidas com contagens iguais às de antes.
