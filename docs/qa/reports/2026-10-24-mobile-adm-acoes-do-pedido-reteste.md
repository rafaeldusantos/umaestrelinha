# QA Run Report — 2026-10-24 — mobile-adm: ações no pedido (feature 75) — reteste (rodada 2)

- **Scope:** reteste dos 4 bugs da rodada 1 (C01–C04) e passe de regressão da `75` em navegador real.
- **Cadence tier:** targeted
- **Build:** `2a285bab` + árvore de trabalho da `75` com os consertos C01–C04 · **Environment:** `pnpm dev:mobile-adm`
  (:8084) do worktree, Supabase LOCAL (:54441; nada do banco interceptado, exceto os atrasos/abortos/corridas
  declarados abaixo). Edge runtime local parado ⇒ todo `send-notification` falha (o caminho "aviso falhou,
  gravação vale"). Conta: admin do `seed.sql`.
- **Started:** 2026-10-24 · **Status:** closed

## Fixturas

`prova/fixturas.sql` (P75-N1..N6) + extras desta rodada: N7 (sem telefone, aguardando material), N11 e N12
(`paid` + `material_recebido`, para a corrida), N13 (`shipped` + código + `order_shipped` **failed**), N14
(`shipped` + código + `order_shipped` **sent**). Contagens antes/depois de `prova/limpa.sql`:
`orders 54 · order_items 82 · order_status_history 22 · order_notifications 11 · order_notes 8 · auth.users 9 ·
customers 9 · user_roles 3 · orders_number_seq 183/true` — **idênticas**. Papel admin removido e devolvido.

## Session Matrix & Results

| # | Charter | Scenario / Bug | Persona | Status | Issue |
|---|---|---|---|---|---|
| 1 | CH-acoes-com-leitor-de-tela | BUG botão do cartão sem o pedido no nome | Equipe com TalkBack | Fixed | BUG-20261024-botao-do-cartao-sem-o-pedido-no-nome |
| 2 | CH-acoes-com-leitor-de-tela | BUG folha fecha e foco cai no body | Equipe com TalkBack | Fixed | BUG-20261024-folha-fecha-e-foco-cai-no-body |
| 3 | CH-acoes-registrar-o-dia-no-celular | BUG folha afirma aviso que falhou | Adri no celular | Fixed | BUG-20261024-folha-afirma-aviso-que-falhou |
| 4 | CH-acoes-toque-duplo-e-corrida | BUG tentar de novo diz falha sem tentar (separating e cancelled) | Adri no celular | Fixed | BUG-20261024-tentar-de-novo-diz-falha-sem-tentar |
| 5 | CH-acoes-registrar-o-dia-no-celular | MAD-acao-recebi-o-material | Adri no celular | Pass | |
| 6 | CH-acoes-registrar-o-dia-no-celular | MAD-acao-marcar-como-enviado / rastreio informar ou alterar | Adri no celular | Pass | |
| 7 | CH-acoes-registrar-o-dia-no-celular | MAD-acao-marcar-como-retirado | Adri no celular | Pass | |
| 8 | CH-acoes-registrar-o-dia-no-celular | MAD-acao-lembrete-whatsapp (com e sem telefone) | Adri no celular | Pass | |
| 9 | CH-acoes-toque-duplo-e-corrida | MAD-acao-toque-duplo-trava | Adri no celular | Pass | |
| 10 | CH-acoes-com-rede-ruim | MAD-acao-falha-de-rede-ao-salvar + offline | Adri no celular | Pass | |
| 11 | CH-acoes-conta-sem-acesso | MAD-acao-conta-sem-papel-nao-grava | Admin que perde o papel | Pass | |
| 12 | CH-acoes-com-fonte-grande | MAD-acao-fonte-grande-e-telas-estreitas (390/1440 × 100/130/200 %) | Adri no celular | Pass | |

## Session Debriefs

### Retestes

1. **Botão do cartão** — `/pedidos?bloco=aguardando`, 390×844: 22 botões de ação, **22 nomes distintos**
   ("Recebi o material, Pedido #NS-163, Viviane Santos"…), rótulo visível no começo do nome. Durante a
   gravação o botão vira "Salvando…" com `aria-disabled="true"`.
2. **Foco ao fechar a folha** — P75-N3 (`separating`), rodapé "Marcar como enviado" por teclado: foco no campo ao
   abrir; depois de "Agora não", Escape e voltar do navegador o foco volta a "Marcar como enviado" (a URL
   continua o detalhe). Depois de "Salvar" com sucesso (o rodapé some) o foco vai ao `H1 "Pedido #P75-N3"`.
   "Informar" em P75-N2 (`delivered`) ⇒ depois de salvar, foco em "Alterar o rastreio". "Agora não" no "Alterar"
   de N13/N14 ⇒ foco de volta a "Alterar".
3. **Frase do "Alterar"** — N13 (`order_shipped` failed): "O código aparece no pedido dela." (neutra);
   N14 (`order_shipped` sent): "A cliente já recebeu o aviso de postagem. O código novo aparece no pedido dela,
   mas não gera outro e-mail." O par prova que a frase depende do aviso, não só do status.
4. **"Tentar de novo"** — N11/N12: `set_material_status` atrasado por rota; dentro do atraso outra escrita
   (chave de serviço, simulando o painel/2º aparelho) leva o pedido a `separating` (N11) e a `cancelled` (N12).
   1ª resposta: a frase parcial de MAA-40 com "Tentar de novo" (declarado: decisão de spec, nota b do bug).
   Toque em "Tentar de novo": **zero requisições** de escrita, "Este pedido mudou enquanto você olhava.", sem
   novo "Tentar de novo"; rodapé relido "Marcar como enviado" (N11) / sem rodapé (N12). Banco: N11
   `separating/em_producao`, N12 `cancelled/em_producao`, nenhuma escrita de status pelo app.

### Regressão

- **Recebi o material** (N1, rede lenta 1,5 s, três toques): **uma** `rpc/set_material_status`, um disparo
  `send-notification`; rodapé relido "Iniciar separação". N6: confirmação `role="status"` "Material
  registrado. · O pedido #P75-N6 foi para a bancada." (sem citar e-mail — o envio falhou), some em ~5 s.
- **Marcar como enviado** (N3): `' aa 1234 5678 9br '` ⇒ `PATCH tracking_code=AA123456789BR` com guarda
  `status=in.(separating,shipped)` → `PATCH status=shipped` com `status=eq.separating` → **uma** linha
  `separating→shipped` no histórico → um disparo. Confirmação "Rastreio salvo. · O código ficou no pedido."
  (aviso não saiu ⇒ sem e-mail, conforme A11). Banco conferido.
- **Informar** (N2 `delivered`): folha "Salvar rastreio · O código aparece no pedido dela."; gravou
  `CC123456789BR`, sem linha de histórico.
- **Retirada** (N5): sem "Informar"; `PATCH status=delivered` guardado por `status=eq.separating`, uma linha
  `separating→delivered`, "Retirada registrada. · Pedido #P75-N5 entregue.".
- **WhatsApp**: N6 ⇒ `wa.me/5551999990006?text=…`, `target=_blank`, `rel="noopener noreferrer"`, mensagem na
  primeira pessoa da Adri, sem nomear o material, "Sem pressa nenhuma."; N7 sem telefone ⇒ nenhum link.
- **Sem rede**: `set_material_status` abortado ⇒ "Não consegui salvar. Tente de novo." (N7 sem mudança);
  `setOffline` ⇒ tela "Sem conexão" da `72`, nenhum botão de ação; de volta online, o rodapé reaparece.
- **Recusa do banco**: papel admin removido com o detalhe de N4 aberto, "Salvar rastreio" ⇒ `PATCH` com zero
  linhas → `atelie_clock` 403 ⇒ `/login` "Esta conta não tem acesso ao painel."; N4 continua **sem código**.
- **Fonte e largura**: 390×844 e 1440×900 × 100/130/200 %, detalhe com rodapé (N11), folha "Alterar" aberta
  (N14) e lista `bloco=aguardando`: `scrollWidth == innerWidth` nas 18 medidas, nenhum botão de ação abaixo de
  44 px, nenhum botão com texto cortado.

### Observações (não bugs)

- `order_status_history.created_by` fica nulo nas linhas gravadas pelo app — paridade com o painel
  (`useAdminOrders` também não o grava).
- Sem edge runtime local, o caminho "aviso enviado" (confirmação citando e-mail) não foi exercitado em
  navegador nesta rodada; está coberto pelos testes de unidade e pela rodada 1.

## What Was Fixed

| Bug | Task | Retest |
|---|---|---|
| BUG-20261024-tentar-de-novo-diz-falha-sem-tentar | C01 | verified |
| BUG-20261024-folha-afirma-aviso-que-falhou | C02 | verified |
| BUG-20261024-folha-fecha-e-foco-cai-no-body | C03 | verified |
| BUG-20261024-botao-do-cartao-sem-o-pedido-no-nome | C04 | verified |

## Decisions for a Human

- MAA-40 (nota b do bug do "Tentar de novo"): a **primeira** resposta a uma corrida ainda mostra a frase
  parcial; o "Tentar de novo" leva em um toque, sem rede, a "Este pedido mudou enquanto você olhava.". Trocar a
  primeira frase é mudança de letra da AC.
- A10: a frase do "Alterar" agora depende do `order_shipped` (SPEC_DEVIATION declarado em código).
- TalkBack real e gesto de voltar do Android em aparelho: Blocked (needs human verify), como na rodada 1.

## Final Status

**Pronto para merge do ponto de vista do QA**: 0 bugs abertos (4 verificados), nenhum Blocks-Completion,
Data-Loss ou Trust-Damage novo. Exit gate: `pnpm --filter @estrelinha/mobile-adm test --testTimeout=20000` →
**76 arquivos, 1102 testes, exit 0** (as suítes da loja e do painel não foram re-rodadas nesta sessão; a
árvore não foi alterada por ela). Ambiente derrubado: `:8084` livre, navegador fechado, fixturas removidas
com contagens iguais às de antes, papel admin devolvido.
