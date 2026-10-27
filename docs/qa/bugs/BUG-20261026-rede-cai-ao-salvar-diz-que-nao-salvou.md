# BUG-20261026-rede-cai-ao-salvar-diz-que-nao-salvou: A rede cai no meio do Salvar, o código fica gravado, a tela diz que não salvou e o aviso nunca sai

- **Status:** verified (retestado em navegador no build servido, 2026-10-27 — reports/2026-10-26-mobile-adm-envelope-da-cliente.md, *Reteste*) — opção 1; a 3 segue como dívida (`BL-051`)
- **Impact (user-side):** Trust-Damage
- **Severity:** High · **Priority:** P1
- **Persona Affected:** Adri no celular
- **Journey Step:** J-registrar-envelope-da-cliente, passo 3
- **Scenarios:** MAD-envelope-rede-cai-ao-salvar
- **Found:** 2026-10-26 · **Report:** reports/2026-10-26-mobile-adm-envelope-da-cliente.md

## Summary

No 4G instável, o servidor grava o código mas a resposta não chega. O app vai para "Sem conexão"; quando a rede
volta, o cartão mostra o código com "Registrado por você agora" e, ao mesmo tempo, um alerta "Não consegui
salvar. Tente de novo." — sem botão de tentar de novo. E o gatilho `material_tracking_set` só sai no sucesso
visto pelo app: nem a cliente (se o e-mail estiver ligado) nem a Adri recebem o aviso, e nada diz isso.

## Reproduction

- **Charter:** CH-envelope-com-rede-ruim · **Tour:** Network Tour

1. P82-G → "Informar código do envelope" → `GG111222333BR` → Salvar, com a RPC respondida pelo servidor (200 `ok`) e a conexão caindo antes da resposta chegar ao app (`route.fetch` + `setOffline`).
2. Voltar a rede.

**Expected:** a tela diz o que de fato aconteceu (gravado) e o aviso não se perde — ou oferece "Tentar de novo", que regrava (a RPC é idempotente) e dispara o aviso.
**Actual:** código gravado, alerta de falha, nenhuma linha em `order_notifications` para P82-G.

## Evidence

- evidence/2026-10-26-mobile-adm-envelope-da-cliente/s3-offline-no-meio.png · evidence/2026-10-26-mobile-adm-envelope-da-cliente/s3-volta-da-rede.png
- banco: P82-G `material_enviado` / `GG111222333BR` / `admin`; zero notificações.

## Decisão pendente

1. Dar retentativa ao erro do envelope (`{ tipo: 'rastreio-do-material', codigo }`), como a `75` faz com o rastreio de saída: "Tentar de novo" regrava o mesmo código e dispara o aviso. Custo pequeno; a frase continua "não consegui".
2. Na releitura, se o código salvo é o que ela digitou, trocar o alerta por "O código ficou salvo." e disparar o gatilho. Custo: o app passa a decidir algo que hoje é do dono.
3. Gatilho do lado do banco (trigger/outbox) — resolve para os três escritores. Custo: arquitetura (`BL-051`).

**Recomendação:** 1 já (pequeno, cobre o aviso perdido), 3 como dívida.

## Conserto (2026-10-27, feature `82`, Fase 5)

Opção 1 (recomendação do QA, decidida pelo usuário).

- `apps/mobile-adm/src/features/order-actions/model/useAcaoDoPedido.ts` (`falhaDe`): `falhou` ou exceção que não é recusa, no `rastreio-do-material`, ⇒ `ACTION_FAILED` com `retentativa { tipo: 'rastreio-do-material', codigo }` (o código normalizado). A frase continua de `core`; nenhuma frase nova.
- `ui/AlertaDaAcao.tsx` (novo), usado por `FolhaDoRastreio.tsx` (o "Tentar de novo" na folha, que fecha no sucesso) e por `EnvelopeDaCliente.tsx` (o erro e o botão no bloco do envelope com a folha fechada — "Agora não", ou a tela que saiu por falta de rede).
- A retentativa vai pelo dono (`runAppAction`): regrava o mesmo código e dispara `material_tracking_set`; com a linha relida não mais editável, `mudou` sem rede.
- Testes (reprovaram antes do conserto): `pages/__tests__/envelopeDaCliente.test.tsx` › "T16 — …" (2, pela árvore real: a RPC grava e a resposta se perde ⇒ alerta na folha, cartão com o código, zero avisos; "Tentar de novo" ⇒ 2ª RPC com o mesmo código, 1 gatilho, folha fecha, confirmação; e o mesmo com a folha fechada, pelo bloco); `model/__tests__/useAcaoDoPedido.test.tsx` (+3 da retentativa).
- **Teste antigo alterado**: `ui/__tests__/FolhaDoEnvelope.test.tsx`, a linha "a rede caiu (ENV-11)" da tabela de desfechos assertava `lerErro(ID)?.retentativa` **nula** — exatamente o defeito. Antes: na tabela, com `toBeNull()`. Depois: caso próprio que assere a mesma frase, a folha aberta, nenhuma confirmação, "Salvar" de volta **e** a retentativa `{ tipo: 'rastreio-do-material', codigo: 'AN123456789BR' }`, e que "Tentar de novo" reenvia esse pedido e fecha a folha. As outras quatro linhas da tabela (recusas) seguem com `toBeNull()`.
- Sensor: M16 (retentativa sempre nula) reinjetado ⇒ 5 casos reprovam por asserção; SHA-256 restaurado.

## Reteste (2026-10-27) — passou

- **Ambiente:** build servido (`vite preview` :4582, bundle `index-D3v4wZjc.js` conferido), Supabase local real, `functions serve` com a chave do Resend inválida, conta `adri.qa`, 390×844 toque; fixturas P82-A..G (`fixturas.sql` + as duas da sessão de QA), restauradas a cada percurso e apagadas no fim (contagens idênticas às de antes).
- P82-G: Salvar com `route.fetch()` (servidor 200 `ok`) + `setOffline(true)` + `abort`; 2 s offline. A folha fica aberta com "Não consegui salvar. Tente de novo." e "Tentar de novo"; o banco já tem `GG111222333BR`/`admin`, zero linhas em `order_notifications`. "Tentar de novo" ⇒ 2ª `set_material_tracking` com o MESMO código, `send-notification?action=trigger {trigger: material_tracking_set}`, linha `owner_material_incoming/email/failed` (401 da chave inválida, de propósito); folha fecha, aviso "Código do envelope registrado. Pedido #P82-G atualizado.", foco no `h1`.
- P82-A: o mesmo com 6,5 s offline ⇒ "Sem conexão" aos ~5 s, a árvore desmonta; na volta o erro e "Tentar de novo" estão no bloco do envelope. Retentativa ⇒ regrava, o gatilho sai, a linha aparece.
- **Achado no reteste, consertado**: no caminho do bloco, o "Tentar de novo" sai da tela com o sucesso e o foco caía no `<body>` (1ª passada). `EnvelopeDaCliente.tsx` passou a devolver o foco ao título da página no sucesso e no `mudou`; teste que reprovou antes (o botão focado antes do toque — o `fireEvent.click` do jsdom não move o foco); mutantes F1/F2 mortos por asserção. 2ª passada no build refeito: foco no `h1` "Pedido #P82-A".
- Observação (não bug): na retentativa o aviso diz "Pedido #P82-A atualizado." em vez de "passou para "A caminho"": a 1ª gravação, perdida, já levou o estado; a frase descreve o que a 2ª mudou.
- Evidência: `evidence/2026-10-27-mobile-adm-envelope-da-cliente-reteste/16-G-offline.png`, `16-G-volta.png`, `16-G-depois.png`, `16-A-offline.png`, `16-A-volta.png`, `16-A-depois.png`.
