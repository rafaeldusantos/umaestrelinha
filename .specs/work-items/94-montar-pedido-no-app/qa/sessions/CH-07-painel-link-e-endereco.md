# Sessão CH-07 · No painel: o link sempre, o renovar só do vencido e o endereço salvo pela function

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-07-painel-link-e-endereco.md` · exploratório · P1 |
| Status      | done                                                                   |
| Persona     | PER-04 Adri no computador · conta: `admin-atelie` (credencial local documentada, valor não registrado) |
| Tour · modo | Feature · por cenário (J-05)                                           |
| Rodada      | confirmação — só TC-FUNC-033 (blocked na r1)                           |
| Orçamento   | 25 ações de browser de 25                                              |
| Ambiente    | painel http://localhost:8083 (1440 × 900) · build não exposto (worktree feature/94 @ e8b20c6c) · Chromium headless (Playwright MCP) |
| Paridade    | Supabase local; `*.supabase.co` bloqueado; dado sintético. A falha da gravação foi provocada recusando no browser a conexão para `functions/v1/order-proposals` (`route.abort('connectionrefused')`) — do ponto de vista da tela é a function fora do ar; a function local não foi derrubada |

## Missão

Confirmar que o painel mostra o mesmo link que o app para o mesmo pedido montado, não oferece renovar o que
ainda vale, e que o endereço marcado para salvar chega à ficha uma vez só, e só quando o pedido montado é
gravado.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Entrou no painel e abriu Vendas › Pedidos montados › Montar pedido | Lista com P-0040 (Alana Muniz, Aberta) no topo; tela de montagem vazia | — |
| 02 | Escolheu Bia QA Oitenta e Nove (um endereço salvo, Padrão: Rua Siqueira Campos, 5), acrescentou "Anel Afetivo com Leite materno · Folheado a prata" (R$ 202,00), marcou "Outro endereço" e digitou CEP 90020-008, Rua dos Andradas, 1001, Centro Histórico | "Salvar no cadastro da cliente" apareceu e veio **marcada**; resumo R$ 202,00, SEDEX R$ 15,34 e Retirada | — |
| 03 | Com a function de gravação inalcançável, clicou em "Criar link do pedido" | A tela ficou na montagem, com o alerta **"Não consegui gravar o pedido. Nada foi enviado à cliente. Tente de novo."** Uma única chamada `POST order-proposals?action=save`, recusada | `screenshots/CH-07-r2-01-falha-gravacao.png` |
| 04 | Clicou de novo (segunda reprodução) e, numa aba nova, conferiu a lista e a ficha da Bia | Mesmo alerta, mesma frase. Na lista, o topo continuava P-0040 (nenhum pedido montado novo); na montagem, a Bia continuava com **um** endereço salvo (nenhum novo) | — |
| 05 | Com a function de volta, clicou em "Criar link do pedido" (o "Tente de novo") | Abriu "Pedido montado P-0041" Aberta, Bia QA, vale até 15/11/2026, 1× Anel Afetivo com Leite materno · Folheado a prata, R$ 202,00 | — |
| 06 | Abriu "Editar" de P-0041 | "Endereços salvos": Rua Siqueira Campos, 5 (**Padrão**) e Rua dos Andradas, 1001 (novo, uma vez só, **sem** virar padrão). "Salvar no cadastro da cliente" **desmarcada** | `screenshots/CH-07-r2-02-editar-endereco-uma-vez.png` |
| 07 | Nova montagem, escolheu Alana Muniz (sem endereço salvo) e digitou CEP 90010-000, Rua Siqueira Campos, 77, Centro Histórico | Só os campos de endereço (sem lista de salvos); "Salvar no cadastro da cliente" **marcada** ao escolher e depois de digitar | `screenshots/CH-07-r2-03-alana-caixa-marcada.png` |
| 08 | Acrescentou "Anel Afetivo Coração com Cabelo · Aço inoxidavel natural" (R$ 189,90) e criou | "Pedido montado P-0042" Aberta, Alana Muniz | — |
| 09 | Abriu "Editar" de P-0042 | Endereço salvo Rua Siqueira Campos, 77 marcado **Padrão**; "Salvar no cadastro" desmarcada | `screenshots/CH-07-r2-04-alana-padrao.png` |

**Edge cases tentados:** "Tente de novo" depois da falha (passa: grava uma vez, sem duplicar o endereço); trocar de cliente no meio da montagem — com Marta Lúcia (cliente com endereços) escolhida e depois "Trocar" para Alana, a caixa "Salvar no cadastro" veio **desmarcada**; numa montagem limpa com Alana ela vem marcada (ver Spec-gaps).

## Casos

| TC     | Veredito                       | Passo | Evidência                 | Nota                        |
| ------ | ------------------------------ | ----- | ------------------------- | --------------------------- |
| TC-FUNC-033 | pass | 02–09 | `screenshots/CH-07-r2-01-falha-gravacao.png`, `screenshots/CH-07-r2-02-editar-endereco-uma-vez.png`, `screenshots/CH-07-r2-03-alana-caixa-marcada.png`, `screenshots/CH-07-r2-04-alana-padrao.png` | passo 1 (Alana sem padrão → salvo vira padrão) passa; passo 2 passou na r1 (mesmo endereço não duplica) e, aqui, o endereço novo entra uma vez só mesmo depois de duas falhas e um "Tente de novo"; passo 3 passa (frase exata de D-20, 2 de 2, nada gravado); passo 4 passa (desmarcada no Editar de P-0041 e P-0042) |

Contagem: pass 1 · fail 0 · blocked 0 · skip 0

## Achados

nada

## Spec-gaps

Rodada de confirmação: não registrados como spec-gap. Observações para backlog:

- Ao trocar de uma cliente com endereços salvos (Marta Lúcia) para uma sem endereço (Alana Muniz) pelo "Trocar", a caixa "Salvar no cadastro da cliente" veio desmarcada; numa montagem limpa com a mesma cliente ela vem marcada (passo 07). Polimento.
- Marta Lúcia QA Oitenta e Nove tem **quatro** endereços salvos idênticos (Rua Siqueira Campos, 1240), de antes desta sessão — mesma assinatura que a r1 viu na Sônia Teste QA. A origem não é visível pela tela; vale um charter curto: montar no **app** com "Salvar no cadastro" para cliente que já tem o mesmo endereço.
- No "Editar" de P-0041, o endereço do pedido aparece em "Outro endereço" com os campos preenchidos, embora já esteja na lista de salvos. Polimento.

## Fora da cobertura

- A falha foi provocada recusando a conexão no browser, não parando a function: um erro devolvido pela function (500 com corpo) não foi exercitado
- Sair da conta antes de fechar — orçamento esgotado; o contexto do browser é isolado e foi fechado

## Debrief

- **Surpresas:** a falha com a conexão recusada aparece na hora, com a frase certa — diferente da r1, em que a rede offline só fazia a gravação esperar
- **Próximo charter:** a duplicata de endereços (Marta, Sônia) vinda de outra superfície
- **Padrão novo:** recusar só a rota da function no browser (`page.route(...).abort`) torna a falha da gravação provocável sem derrubar o ambiente

### Efeitos na massa

- P-0041: **novo**, Aberta até 15/11, Bia QA Oitenta e Nove, 1× Anel Afetivo com Leite materno · Folheado a prata, R$ 202,00
- Bia QA Oitenta e Nove: ganhou o endereço Rua dos Andradas, 1001, Centro Histórico, 90020-008 (não padrão)
- P-0042: **novo**, Aberta até 15/11, Alana Muniz, 1× Anel Afetivo Coração com Cabelo · Aço inoxidavel natural, R$ 189,90
- Alana Muniz: ganhou o endereço Rua Siqueira Campos, 77, Centro Histórico, 90010-000, como **Padrão**
