# Sessão CH-07 · No painel: o link sempre, o renovar só do vencido e o endereço salvo pela function

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-07-painel-link-e-endereco.md` · exploratório · P1 |
| Status      | done                                                                   |
| Persona     | PER-04 Adri no computador · conta: `admin-atelie` (`QA_ADMIN_ATELIE_*`) |
| Tour · modo | Feature · por cenário (J-05)                                           |
| Rodada      | exploração                                                             |
| Orçamento   | 50 ações de browser de 50                                              |
| Ambiente    | painel http://localhost:8083 (1440 × 900) · app do ateliê http://localhost:8084 (390 × 844, só para comparar o link) · build não exposto · Chromium headless (Playwright MCP) |
| Paridade    | Supabase local; `*.supabase.co` bloqueado; Mercado Pago não configurado; dado sintético. A falha da gravação foi tentada cortando a rede do browser (não parando a function, que esta sessão não podia derrubar) |

## Missão

Confirmar que o painel mostra o mesmo link que o app para o mesmo pedido montado, não oferece renovar o que
ainda vale, e que o endereço marcado para salvar chega à ficha uma vez só, e só quando o pedido montado é
gravado.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Entrou no painel e abriu Vendas › Pedidos montados | Lista com P-0035 Expirada, P-0034 Aberta, P-0033 Cancelada, P-0014/P-0013 Concluídas (com "Pedido #NNNN"), P-0012/P-0011 Canceladas | — |
| 02 | Abriu P-0034 (Juliana Prates Ch02, Aberta) e clicou em "Copiar link"; depois clicou no campo do link | Cartão "Link para a cliente" · "Vale até 15/11/2026." · campo só leitura com `…/pedido-montado#<token>` · "Copiar link" · "Enviar pelo WhatsApp" · "Mensagem do WhatsApp". **Nenhum** "Renovar" nem "Gerar link novo"; ações "Editar", "Duplicar", "Cancelar proposta". Copiar: status "Link copiado.", a área de transferência tem exatamente o link do campo, histórico ganhou "Link enviado · link copiado". Focar o campo seleciona o texto inteiro (0–80 de 80) | `screenshots/CH-07-02-painel-link-p0034.png` |
| 03 | Abriu P-0034 no app do ateliê (Pedidos › Montados) | "Link para Juliana" com **o mesmo token** do painel; "Vale até 15/11." e a mensagem do WhatsApp com o mesmo link | — (screenshot recusada pelo driver fora da raiz permitida; comparação feita pelo texto) |
| 04 | Abriu P-0035 (Bia QA Oitenta e Nove, Expirada) e clicou em "Renovar prazo" | "Venceu em 07/11/2026." · "Este link venceu. Renovar gera um link novo e trava os preços de hoje." · só "Renovar prazo" (e "Duplicar"); sem link, sem Editar/Cancelar. O clique abre um **`confirm` nativo do navegador** (sem título, botões do browser) com "O link venceu em 07/11. Os preços são conferidos de novo e sai um link novo, que vale até 15/11. Mande o novo para Bia." | — |
| 05 | Confirmou | Faixa "Link novo gerado. O link antigo parou de funcionar."; selo Aberta; "Vale até 15/11/2026."; link com token novo; "Editar" e "Cancelar proposta" voltaram; histórico "Link renovado". O "Gerando…" não chegou a ser visto (rápido demais). Total igual (R$ 151,41) | `screenshots/CH-07-05-renovado.png` |
| 06 | Na aba do app, abriu P-0035 de novo (segunda aba no mesmo pedido) | Aberta, "vale até 15/11", e o **mesmo token novo** do painel | — |
| 07 | Abriu P-0033 (Cancelada) | "Link encerrado." · "Quem abrir o link lê que este pedido não está mais disponível."; nenhuma ação além de "Duplicar" e salvar observação | `screenshots/CH-07-07-cancelada.png` |
| 08 | Abriu "Montar pedido" sem escolher cliente | Endereço com CEP/Rua/…; **sem** a caixa "Salvar no cadastro da cliente"; "Criar link do pedido" desabilitado ("Escolha a cliente ou cadastre uma nova.") | — |
| 09 | Escolheu "Sônia Teste QA" (sonia.ch08r2…, já com endereço padrão), marcou "Outro endereço" e digitou o mesmo endereço salvo (CEP 90010-000, Rua Siqueira Campos, 100, Centro Histórico); acrescentou "Anel Afetivo 6 Corações… · Prata 925 Folheado a Ouro Branco" e o cupom QA92CUPOM15 | A cliente já vinha com **dois** endereços salvos idênticos (Rua Siqueira Campos, 100 — um "Padrão", outro igual), de antes desta sessão. "Salvar no cadastro da cliente" aparece com "Outro endereço" e vem **marcada**. Cidade "Porto Alegre / RS" pelo CEP. Resumo: 1 peça R$ 329,90, Cupom −R$ 49,49, Total das peças R$ 280,41, prévia SEDEX R$ 16,61 e Retirada | — |
| 10 | Cortou a rede do navegador e clicou em "Criar link do pedido"; 3 s depois religou a rede | Durante os 3 s offline: só "Criando o link…", sem mensagem de erro. Ao religar, a gravação seguiu sozinha e abriu o pedido montado criado — a falha não se materializou | `screenshots/CH-07-10-offline-criando.png` |
| 11 | Leu o pedido criado | "Pedido montado P-0036" Aberta, Sônia Teste QA, "Vale até 15/11/2026.", link, a peça e o cupom, Total das peças R$ 280,41 (igual à montagem); histórico "Criada" | `screenshots/CH-07-11-criado-painel.png` |
| 12 | Clicou em "Editar" de P-0036 | "Editar pedido montado P-0036"; "Endereços salvos" com os **mesmos dois** endereços de antes (nenhum novo) e "Outro endereço" escolhido; "Salvar no cadastro da cliente" **desmarcada** | `screenshots/CH-07-12-editar.png` |

**Edge cases tentados:** duas abas no mesmo pedido montado (painel renova, a outra aba — o app — recarrega e mostra o link novo: passa); focar o campo do link seleciona tudo (passa); montar sem cliente escolhida (a caixa não aparece: passa); rede caída no momento de criar (não provocou a falha: a gravação esperou e concluiu ao voltar a rede). Não tentados: recarregar depois de copiar no painel, voltar do navegador depois de renovar.

## Casos

| TC     | Veredito                       | Passo | Evidência                 | Nota                        |
| ------ | ------------------------------ | ----- | ------------------------- | --------------------------- |
| TC-JOURNEY-005 | pass | 02–06 | `screenshots/CH-07-02-painel-link-p0034.png`, `screenshots/CH-07-05-renovado.png` | link igual no painel e no app; sem renovar no aberto; renovar do vencido com a frase de D-17 e link novo; variação de duas abas passa. O diálogo é um `confirm` nativo (spec-gap). "O antigo morto" não conferido na loja |
| TC-FUNC-032 | pass | 02, 04–05, 07 | `screenshots/CH-07-02-painel-link-p0034.png`, `screenshots/CH-07-05-renovado.png`, `screenshots/CH-07-07-cancelada.png` | passos 1–5 batem; "Gerando…" não observado (resposta instantânea); variação "origem Pedido montado" no pedido nascido de proposta não feita (orçamento) |
| TC-FUNC-033 | blocked | 08–12 | `screenshots/CH-07-12-editar.png` | ambiente: passo 3 (falha da gravação) não provocável — parar a `order-proposals` está fora desta sessão, e cortar a rede só atrasou a gravação. Passo 2 passa (mesmo endereço, nenhum novo), passo 4 passa (caixa desmarcada no Editar), variação "sem cliente" passa. Passo 1 (cliente sem padrão vira padrão) não feito por orçamento |
| TC-REG-002 | skip | 09–11 | `screenshots/CH-07-11-criado-painel.png` | orçamento: passo 1 passa (montagem com cupom cria o pedido montado com link e o total da montagem); passos 2 (abrir na loja) e 3 (no app, Montados) não feitos |

Contagem: pass 2 · fail 0 · blocked 1 · skip 1

## Achados

nada

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta                     |
| ----------------------- | ------------ | ----------------------------------- |
| No painel, "Renovar prazo" confirma por `window.confirm` nativo do navegador (sem título, botões do browser), enquanto o app usa folha com "Renovar o prazo de P-NNNN?" / "Agora não" / "Renovar". A frase é a de D-17; a forma do diálogo no painel não está definida | 04 | polimento |
| O histórico do painel diz "Link renovado"; o do app diz "Prazo renovado" para a mesma ação (e o TC-FUNC-028 pede "Prazo renovado · link novo, o anterior parou de funcionar") | 05 | polimento |
| O painel nomeia o objeto como "proposta" ("Cancelar proposta", "Histórico da proposta", "observação sobre esta proposta") enquanto título, menu e app dizem "pedido montado" | 02, 05 | pré-existente |
| Com a rede caída no clique de "Criar link do pedido", a tela fica em "Criando o link…" sem nenhuma mensagem (3 s) e conclui sozinha ao voltar a rede; nenhuma fonte define o que mostrar enquanto a gravação espera rede | 10 | polimento |

## Fora da cobertura

- TC-FUNC-033 passo 3 (a frase "Não consegui gravar o pedido. Nada foi enviado à cliente. Tente de novo." e "nada gravado") — exige parar a function `order-proposals` local, que esta sessão não podia derrubar; o corte de rede do browser não produziu falha
- TC-FUNC-033 passo 1 (cliente sem endereço padrão: o salvo vira padrão) — orçamento
- TC-REG-002 passos 2–3 (o link do P-0036 aberto na loja e o pedido no app em Montados) — orçamento
- O link antigo de P-0035 deixando de abrir na loja — orçamento
- "Gerando…" no renovar — a resposta local foi instantânea
- Voltar do navegador depois de renovar e recarregar depois de copiar — orçamento
- Variação de TC-FUNC-032 "origem Pedido montado" num pedido nascido de proposta — orçamento
- Sair da conta antes de fechar — o orçamento acabou; o browser é isolado e foi fechado

## Debrief

- **Surpresas:** a cliente "Sônia Teste QA" (sonia.ch08r2…) já tinha dois endereços salvos idênticos antes desta sessão — a origem não é visível pela tela (pode ser de sessão anterior, inclusive do app); nesta sessão nenhum terceiro foi criado. O corte de rede não derruba a gravação: ela espera e conclui
- **Próximo charter:** a falha da gravação (parar a `order-proposals`) e "cliente sem padrão vira padrão" merecem uma sessão curta com o ambiente preparado; e a origem da duplicata de endereço da Sônia (montar no app com "Salvar no cadastro" para cliente que já tem o mesmo endereço)
- **Padrão novo:** comparar o token do link no painel e no app na mesma hora, com uma aba de cada, cobre "mesmo link" e "duas abas" num passo só

### Efeitos na massa

- P-0034: histórico ganhou "Link enviado · link copiado" (link inalterado)
- P-0035: **renovado** — Aberta até 15/11, token novo; o link antigo morreu
- P-0036: **novo**, Aberta até 15/11, Sônia Teste QA (sonia.ch08r2…), 1× Anel Afetivo 6 Corações · Prata 925 Folheado a Ouro Branco, cupom QA92CUPOM15, Total das peças R$ 280,41, endereço "Outro" = Rua Siqueira Campos, 100; nenhum endereço novo na ficha
