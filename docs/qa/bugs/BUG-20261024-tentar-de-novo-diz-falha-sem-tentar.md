# BUG-20261024-tentar-de-novo-diz-falha-sem-tentar: "Tentar de novo" da falha parcial diz "Não consegui salvar" sem ir à rede, com o pedido já em separação

- **Status:** verified (retestado em navegador, 2026-10-24, rodada 2 — reports/2026-10-24-mobile-adm-acoes-do-pedido-reteste.md)
- **Impact (user-side):** Trust-Damage
- **Severity:** Medium · **Priority:** P2
- **Persona Affected:** Adri no celular (com o painel ou um segundo aparelho aberto)
- **Journey Step:** J-registrar-material-e-envio — "Iniciar separação" com o material na bancada
- **Scenarios:** MAD-acao-separacao-falha-no-meio, MAD-acao-pedido-mudou-enquanto-olhava
- **Requirements:** MAA-40, MAA-21, MAA-22
- **Found:** 2026-10-24 · **Report:** reports/2026-10-24-mobile-adm-acoes-do-pedido.md

## Summary

Quando o passo do status de "Iniciar separação" afeta zero linhas porque OUTRA escrita já levou o pedido a
`separating` (outra aba/aparelho, ou o painel), a tela mostra a frase de falha parcial "A produção ficou
registrada, mas o pedido não passou para separação." — falsa: o pedido passou, e o próprio detalhe relido logo
abaixo mostra "Pago → Em Separação" no histórico e o rodapé "Marcar como enviado". Pior: tocar "Tentar de novo"
**não envia nenhuma requisição** e troca a frase por "Não consegui salvar. Tente de novo." — uma falha de rede
inventada, num laço sem saída (tentar de novo diz o mesmo para sempre).

Causa (lida no código): a retentativa guardada é `{ tipo: 'primaria' }` (`useAcaoDoPedido.ts`, `erroDe`, ramo
`parcial`/`material`). Com a linha relida em `separating`, `appPrimaryAction` dá o plano `folha`, e
`runAppAction` (`packages/core/src/order-actions/appAction.ts`, `case 'folha'`) devolve `semRede(...)` ⇒
`{ tipo: 'falhou' }` ⇒ `ACTION_FAILED`. A frase de falha "sem rede" é desenhada para um desfecho que nunca
tocou a rede. O mesmo acontece se o painel CANCELAR o pedido entre os dois passos (o edge case da spec): a
retentativa cai em `nenhuma` ⇒ "Não consegui salvar", em vez de "Este pedido mudou enquanto você olhava.".

## Reproduction

- **Charter:** CH-acoes-toque-duplo-e-corrida · **Tour:** Multi-Tab Tour
- **Environment:** `pnpm dev:mobile-adm` (:8084), Supabase local, 390×844, admin do seed

1. Um pedido `paid` + `material_recebido` (fixtura `P75-N11`).
2. Abrir `/pedidos/<id>` em duas abas do app.
3. Tocar "Iniciar separação" nas duas ao mesmo tempo.
4. Na aba que perdeu: ler a frase; tocar "Tentar de novo".

**Expected:** a aba que perdeu diz "Este pedido mudou enquanto você olhava." (ou não mostra erro, já que o
pedido chegou aonde ela queria), sem "Tentar de novo"; nunca uma falha de rede sem rede.
**Actual:** passo 3 ⇒ "A produção ficou registrada, mas o pedido não passou para separação." + "Tentar de
novo" (com o histórico e o rodapé dizendo o contrário); passo 4 ⇒ zero requisições e "Não consegui salvar.
Tente de novo.".

No banco: `separating`, `em_producao`, **uma** linha `paid → separating` — a escrita está certa; só a tela
mente.

## Evidence

- Rede capturada na sessão (relatório, sessão 7): aba B `PATCH orders … status=eq.paid` (zero linhas); depois
  do "Tentar de novo", nenhuma requisição.

## Notes

Conserto provável, dentro da regra que já existe: (a) quando a retentativa (ou o passo do status) encontra a
linha relida sem a ação que a criou (`appPrimaryAction(row).action !== 'separar'`), o desfecho é `mudou`
(ORDER_CHANGED, sem retentativa), nunca `falhou`; (b) avaliar se a frase parcial deve ser trocada por
ORDER_CHANGED quando a causa é `nenhuma-linha` e a releitura já mostra o status de destino — a letra de
`MAA-40` hoje pede a frase parcial também para "zero linhas sem recusa", o que torna (b) uma decisão de spec.

## Fix

- **Task:** C01 em `.specs/features/75-mobile-adm-acoes-do-pedido/tasks.md` (Conserto do QA).
- **Causa:** a retentativa `{ tipo: 'primaria' }` não dizia o que reenviava; sobre a linha relida, o dono
  (`runAppAction`) caía em `folha`/`nenhum` ⇒ `semRede` ⇒ `falhou`. Com um pedido de **retirada** relido em
  `separating`, a mesma retentativa cairia no plano `status` e gravaria `delivered` (achado pelo mutante).
- **Conserto (pela causa, no dono):** `PedidoDaAcao` primária ganhou `espera?: AppActionId`, e
  `AppActionOutcome` ganhou `{ tipo: 'mudou' }`. Com `espera` e a linha relida oferecendo outra ação,
  `runAppAction` devolve `mudou` sem ir à rede. O hook guarda a retentativa da parcial do material como
  `{ tipo: 'primaria', espera: 'separar' }`; `mudou` já era desenhado como "Este pedido mudou enquanto você
  olhava." sem "Tentar de novo".
  Arquivos: `packages/core/src/order-actions/{types,appAction}.ts`,
  `apps/mobile-adm/src/features/order-actions/model/useAcaoDoPedido.ts`,
  `apps/mobile-adm/src/features/order-actions/api/gravarAcao.ts` (comentário).
- **Testes:** `apps/mobile-adm/src/pages/__tests__/acoesDoPedido.test.tsx` (+2, pelo `<App />` real: linha
  relida em `separating` e em `cancelled` ⇒ zero requisições no "Tentar de novo", frase "mudou", sem
  retentativa — reprovaram antes com "Não consegui salvar. Tente de novo."),
  `packages/core/src/order-actions/__tests__/appAction.test.ts` (+4), e a régua do hook apertada para
  exigir `espera: 'separar'`.
- **Mutantes:** 3 reinjetados (guarda desligada, retentativa sem `espera`, `mudou` → `semRede`), SHA-256 ok,
  todos mortos por asserção.
- **Medido:** mobile-adm 1082/76, core 4210/166, store 5885/320, backoffice 3696/212, todos verdes; `tsc`
  0/0/0 nos apps, core 11 herdados.
- **Não consertado (decisão de spec, nota b):** a primeira resposta ainda mostra a frase parcial de
  `MAA-40` quando a causa é zero linhas — a letra da AC a pede. O "Tentar de novo" agora leva, em um toque e
  sem rede, a "Este pedido mudou enquanto você olhava.".

## Retest (2026-10-24, rodada 2)

Verificado em navegador real (Chromium via Playwright, 390×844, `pnpm dev:mobile-adm` do worktree, Supabase
local sem interceptar o banco). Detalhe e números em `reports/2026-10-24-mobile-adm-acoes-do-pedido-reteste.md`.
