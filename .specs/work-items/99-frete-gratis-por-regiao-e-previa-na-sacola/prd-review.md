# PRD Tech Review · WI 99

## Rodada 1 · 2026-11-14 · prd_version 1

Parecer de um subagent de revisão (só leitura), sobre o worktree `store__feature-99` em `76c51acb`.
Veredito: `changes_requested_blocking` — 1 bloqueio, 8 lacunas/perguntas, 7 decisões técnicas, 3 informativos.

Gate respondido **inline a pedido** do humano ("Handoff e perguntas e decisões nessa sessão você deve responder
com suas recomendações ou enviar um agente para validar e responder por você, não espere resposta do humano"),
pela recomendação do parecer, salvo onde está dito.

| id | key | owner | sev. | pergunta | resposta (decisão) | destino |
| -- | --- | ----- | ---- | -------- | ------------------ | ------- |
| PR-01 | estado-sem-cep-reached | tech_prd_edit | 🔴 | Qual a forma do estado sem CEP? `reached` hoje decide "liberado", a lista "Complete o frete grátis", o frete do cupom e o zero da mais barata; UC-07 contradiz CA-19 | `reached` continua "o valor atingiu a faixa". Nasce `destination: 'inside' \| 'outside' \| 'unknown'` e `granted = reached && (destino dentro, ou todas as regiões marcadas)`. Quem zera frete ou diz "liberado" lê `granted`. Com as cinco regiões marcadas, a faixa alcançada diz "Frete grátis liberado" mesmo sem CEP, como hoje; com parte delas, sem CEP, diz "Frete grátis para …" e não "liberado" | prd.md RN-14/UC-07 (r1) · spec Decisões |
| PR-02 | regioes-ausente-vazio-desconhecida | tech_prd_edit | 🟡 | RN-15 "sem regiões = todas" × UC-12 que recusa lista vazia; o que é região desconhecida | Campo ausente (linha antiga) = todas. Lista vazia com o interruptor ligado = frete grátis inativo (molde da faixa ≤ 0), e a recusa ao salvar impede gravá-la. CEP incompleto/desconhecido: na tela, igual a sem CEP; no servidor, não zera o frete quando só parte das regiões está marcada | prd.md RN-13/RN-15 (r1) · spec Decisões |
| PR-03 | config-montada-a-mao-perde-regioes | tech | 🔴 | Quatro lugares montam a config só com dois campos (`checkout/proposal.ts`, `mercado-pago/handlers.ts`, `RuntimeSettingsLoader`+`constants.ts`, `useFreeShipping`) | Um leitor único em `core/shipping` (`freeShippingConfigOf`), com os três campos, chamado pelos quatro; o guarda `freeShippingSingleOwner` passa a varrer `supabase/functions` e o campo `free_shipping_regions`; `proposalPricing` recebe o CEP | spec Decisões |
| PR-04 | cupom-frete-gratis-e-regiao | negocio | 🟡 | O cupom de frete grátis vale fora do Sul/Sudeste? | Vale em qualquer região, como hoje. Com cupom de frete grátis aplicado, a faixa da região some | prd.md RN-18 (r1) |
| PR-05 | base-do-valor-da-faixa | negocio | 🟡 | A faixa conta antes ou depois do cupom e do desconto progressivo? | Mantém a regra de hoje em cada caminho: o valor das peças, já com o preço da campanha, antes do cupom e do desconto progressivo (no pedido montado segue a de hoje) | prd.md RN-19 (r1) |
| PR-06 | pagina-do-produto-nao-aplica-frete-gratis | negocio | 🟡 | O cálculo da página do produto "aplica a regra inteira"? | Não zera nem risca frete. Com o frete grátis ativo, só uma linha de texto dizendo a faixa e a região | prd.md UC-11/CA-24 (r1) |
| PR-07 | faixa-de-avisos-uc11-x-fora | negocio | 🟡 | A faixa de avisos (WI 101) está no UC-11 e em Fora | Sai do UC-11: é texto livre da dona, que escreve a região no aviso | prd.md UC-11 (r1) |
| PR-08 | faixas-de-cep-nao-contiguas | tech | 🟡 | Norte e Centro-Oeste não são contíguos | Tabela de faixas por região em `region.ts`: Sudeste 01000–39999; Sul 80000–99999; Nordeste 40000–65999; Norte 66000–69999, 76800–76999, 77000–77999, 78900–78999 (RO); Centro-Oeste 70000–76799, 78000–78899, 79000–79999; fora disso (ex.: 00000–00999) desconhecida. Teste nas bordas de RO, TO, DF/GO, MT, MS. `[conhecimento]` para Norte/Nordeste/CO; a campanha usa só Sul e Sudeste, cujas faixas são inequívocas | spec Decisões |
| PR-09 | crosssell-complete-o-frete-fora-da-regiao | negocio | 🟡 | A lista "Complete o frete grátis" com CEP fora da região | Esconde a lista (e não busca o catálogo) com CEP fora da região. Sem CEP, como hoje | prd.md RN-20 (r1) |
| PR-10 | rotulo-das-regioes-derivado | tech_prd_edit | 🟡 | Como nomear um conjunto qualquer de regiões | Função em `core` que monta o rótulo: com as cinco, o texto de hoje sem região; com parte, "para Sul e Sudeste", ordem fixa (Sul, Sudeste, Centro-Oeste, Nordeste, Norte), "e" antes da última | prd.md RN-13 (r1) · spec Decisões |
| PR-11 | pedido-montado-zera-qualquer-opcao | tech | 🟡 | `proposalPricing` zera qualquer opção; o bloco Entrega só a mais barata | **Fora deste item, como dívida** (divergência anterior ao WI; corrigir exigiria levar "é a mais barata?" ao servidor do pedido montado). Decisão minha, diferente da primeira opção do parecer, porque CA-16 trata da gaveta e do checkout comum | spec Não resolvido |
| PR-12 | guarda-defaults-nao-le-array | tech | 🟢 | `storeSettingsDefaults` não lê lista | Estender o guarda para comparar lista; migration no molde da `37` | spec Decisões |
| PR-13 | painel-titulo-da-recusa-e-leitura-crua | tech | 🟢 | Título fixo da recusa; painel lê a linha crua | Título vem do motivo da recusa; as caixas leem o padrão pelo leitor único | spec Decisões |
| PR-14 | referencias-de-linha-conferidas | none | — | — | registro: `mercado-pago/handlers.ts:1452`, `useCartPromotion.ts:185`; Pergunta 2 confirmada (o pedido comum não confere o frete no servidor) e mantida fora | — |
| PR-15 | info-hover-e-toque | tech | 🟢 | Tooltip do Radix não abre ao toque; Popover não abre no ponteiro | Popover controlado com eventos de ponteiro, `collisionPadding={16}`, largura `w-[min(18rem,calc(100vw-32px))]` | spec Decisões |
| PR-16 | perfil-wi100-nao-existe | none | — | — | registro: o perfil do WI 100 não está na master; o ✓ dentro da faixa ouro é `ink` | — |
| PR-17 | cidade-no-info-exige-lookup | tech | 🟢 | "Entrega em São Paulo/SP" exige busca do CEP | `useCepLookup` na gaveta; a UF da busca nunca decide a região (dono RN-13); a busca falhando, o ⓘ sai sem a cidade | spec Decisões |
| PR-18 | rodape-270-a-qual-fonte | tech_prd_edit | 🟢 | O limite de 270 px vale a 200 %? | "≤ 270 px com a fonte a 100 %; a 200 % o rodapé pode crescer e rolar por dentro, sem cortar o CEP nem o valor" | prd.md CA-23 (r1) |
| PR-19 | retirada-e-cep-unico-sem-conflito | none | — | — | registro: retirada é só RS (Sul) e já custa 0; o CEP da gaveta e do checkout é o mesmo campo | — |

Perguntas 1–4 da 97 (abertas pelo PRD da 99, Pergunta 1), respondidas inline pela recomendação de lá: (1) vale o
CEP da gaveta; igual ao do endereço salvo, entra o endereço salvo inteiro; (2) a gaveta marca a mais barata e leva a
escolha ao checkout; (3) `add_shipping_info` não é emitido na gaveta; (4) o CEP da página do produto fica fora.
Perguntas 2–4 da 99: (2) fora, como dívida; (3) só a mais barata; (4) sem data automática.
