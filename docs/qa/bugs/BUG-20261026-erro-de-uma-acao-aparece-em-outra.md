# BUG-20261026-erro-de-uma-acao-aparece-em-outra: A falha de uma ação do pedido aparece como falha de outra

- **Status:** verified (retestado em navegador no build servido, 2026-10-27 — reports/2026-10-26-mobile-adm-envelope-da-cliente.md, *Reteste*) — opção 1
- **Impact (user-side):** Trust-Damage
- **Severity:** Medium · **Priority:** P2
- **Persona Affected:** Adri no celular
- **Journey Step:** J-registrar-envelope-da-cliente, passos 3 e 5
- **Scenarios:** MAD-envelope-erro-fica-na-acao-certa; MAD-envelope-rede-cai-ao-salvar; MAD-envelope-colocar-em-producao
- **Found:** 2026-10-26 · **Report:** reports/2026-10-26-mobile-adm-envelope-da-cliente.md

## Summary

O erro de ação é um por pedido (`features/order-actions/model/erros.ts`, `75`) e fica "até a próxima ação". Com a
`82` o mesmo pedido tem três lugares de ação, e o erro aparece no lugar errado:

- "Recebi o material" falha ⇒ ela abre "Informar código do envelope" e a folha já nasce com "Não consegui salvar. Tente de novo.", antes de ela digitar nada.
- O código do envelope falha e ela toca "Agora não" ⇒ o alerta passa para o rodapé, em cima de "Recebi o material".
- "Colocar em produção" falha ⇒ o alerta aparece só no rodapé fixo, em cima de "Iniciar separação", longe do botão tocado.

## Reproduction

- **Charter:** CH-envelope-com-rede-ruim · **Tour:** Network Tour

1. P82-F: abortar `rpc/set_material_status`, tocar "Recebi o material"; depois "Informar código do envelope".
2. P82-F: abortar `rpc/set_material_tracking`, salvar um código, "Agora não".
3. P82-C: abortar `rpc/set_material_status`, "Colocar em produção".

**Expected:** cada falha aparece junto da ação que falhou, e uma folha nova não herda erro de outra ação.
**Actual:** como acima.

## Evidence

- evidence/2026-10-26-mobile-adm-envelope-da-cliente/s3-erro-do-rodape-na-folha.png · evidence/2026-10-26-mobile-adm-envelope-da-cliente/s3-erro-do-envelope-no-rodape.png · evidence/2026-10-26-mobile-adm-envelope-da-cliente/s6-producao-falhou.png

## Decisão pendente

1. Marcar o erro com a ação que o produziu (`ErroDaAcao.de`), e cada superfície desenhar só os seus: o rodapé o da primária/rastreio, a folha do envelope o do envelope, o bloco Material o de "Colocar em produção" (junto do botão). Custo: muda o `75` (cartão e rodapé continuam lendo o mesmo erro da primária).
2. Limpar o erro ao abrir qualquer folha. Custo: resolve só o primeiro caso.

**Recomendação:** 1.

## Conserto (2026-10-27, feature `82`, Fase 5)

Opção 1.

- `apps/mobile-adm/src/features/order-actions/model/erros.ts`: o erro continua um por pedido, e guarda AO LADO a ação que o gerou (`definirErro(id, erro, de = 'primaria')`, `OrigemDoErro = PedidoDaAcao['tipo']`, `useEntradaDoErro`, `lerOrigemDoErro`, `ERROS_DO_RODAPE = ['primaria', 'rastreio']`). A forma `ErroDaAcao { frase, retentativa }` não mudou — os testes da `75` que a comparam por igualdade passam sem toque.
- `useAcaoDoPedido.ts`: grava a origem (`pedido.tipo`) em todo desfecho e expõe `erroDe(origens)`; `useFolhaNoHistorico.ts` marca o `ORDER_CHANGED` de `MAA-26` com a origem da folha.
- Superfícies: `RodapeDaAcao.tsx` e `BotaoDaAcao.tsx` ⇒ `ERROS_DO_RODAPE`; `FolhaDoRastreio.tsx` ⇒ `rastreio-do-material` (envelope) ou `rastreio` (saída); `EnvelopeDaCliente.tsx` ⇒ `rastreio-do-material`, com a folha fechada; `ColocarEmProducao.tsx` ⇒ `producao`, num `role="alert"` logo depois do botão (sozinho se o botão saiu). A recusa por papel não mudou.
- Testes (reprovaram antes): `pages/__tests__/envelopeDaCliente.test.tsx` › "T17 — …" (4: a folha do envelope abre sem o erro de "Recebi o material"; o erro do envelope não vai ao rodapé depois de "Agora não"; nem à folha do rastreio de saída; a falha da primária não aparece no envelope), `useAcaoDoPedido.test.tsx` (+5, a origem de cada ação), `ColocarEmProducao.test.tsx` (+4).
- **Testes antigos alterados** (eles asseriam o comportamento que este bug descreve como errado; são da `82`, não da `75`): em `envelopeDaCliente.test.tsx` › "Colocar em produção (ENV-25)", os casos "a RPC recusa a transição" e "500". Antes: `within(screen.getByTestId('rodape-da-acao')).getByRole('alert')` com a frase. Depois: o rodapé SEM alerta, e `within(bloco()).getByRole('alert')` com a mesma frase (e, no 500, o alerta depois do botão). Fixture: o dublê `acaoDe` de `ColocarEmProducao.test.tsx` ganhou `erroDe: () => null` (sem asserção tocada). E `bloco()` do arquivo passou a achar a região também atrás da folha modal (`hidden: true`).
- Sensor: M17a (rodapé com qualquer erro), M17b (folha com qualquer erro), M17c (produção sem o alerta), M17d (origem ignorada), M17e (envelope sem o alerta) — os cinco mortos por asserção; SHA-256 restaurado.

## Reteste (2026-10-27) — passou

- **Ambiente:** build servido (`vite preview` :4582, bundle `index-D3v4wZjc.js` conferido), Supabase local real, `functions serve` com a chave do Resend inválida, conta `adri.qa`, 390×844 toque; fixturas P82-A..G (`fixturas.sql` + as duas da sessão de QA), restauradas a cada percurso e apagadas no fim (contagens idênticas às de antes).
Matriz de superfícies, 15/15 (falha por `route.abort('failed')`):
- A: "Recebi o material" falha ⇒ alerta no rodapé; envelope sem; a folha do envelope abre sem ele; voltando à lista **dentro do app** (o "Voltar" do detalhe e `popstate` — um `page.goto` recarregaria e apagaria o erro do módulo), o cartão de A mostra o alerta (o par).
- G: o envelope falha ⇒ alerta na folha e o bloco atrás SEM alerta (V07); "Agora não" ⇒ alerta e "Tentar de novo" no bloco, rodapé sem; na lista, o cartão de G sem alerta (V02).
- C: "Colocar em produção" falha ⇒ alerta logo depois do botão; rodapé, envelope e o cartão de C na lista sem alerta.
- F: a primária tocada no cartão da lista falha ⇒ alerta no cartão.
- B (enviado, rastreio de saída): o envelope falha, "Agora não", "Alterar rastreio" ⇒ a folha de saída sem alerta.
- Evidência: `evidence/2026-10-27-mobile-adm-envelope-da-cliente-reteste/17-a-folha-sem-erro-da-primaria.png`, `17-b-erro-no-envelope.png`, `17-b-lista.png`, `17-d-cartao.png`.
