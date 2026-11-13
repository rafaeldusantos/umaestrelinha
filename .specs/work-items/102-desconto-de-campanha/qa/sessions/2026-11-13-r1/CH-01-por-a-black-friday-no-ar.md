# Sessão CH-01 · Pôr a Black Friday no ar

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-01-por-a-black-friday-no-ar.md` · exploratório · P0 |
| Status      | done (orçamento esgotado antes dos passos 6–7 da J-01) |
| Persona     | PER-01 Adri · conta: `admin-loja` (conta de dev do `seed.sql`; `QA_ADMIN_LOJA_*` não definidas nesta máquina) |
| Tour · modo | Feature · por cenário (J-01) |
| Rodada      | exploração |
| Orçamento   | 50 ações de browser de 50 (mais 2 de saída da conta) |
| Ambiente    | painel `http://localhost:8093/admin` (o charter diz 8083; o briefing corrige para 8093) · build não exposto · Chromium (agent-browser 0.39.1, headless) · viewports 1440 × 900 · 390 × 844 (lista) |
| Paridade    | banco local do Supabase; `*.supabase.co` e `**/g/collect*` bloqueados por rota (fotos podem não carregar — não é achado) |

## Missão

Como a dona, pôr a Black Friday no ar sozinha — cadastro, marcação das quatro peças e o bloco da Home — e chegar
à loja vendo as peças em oferta, procurando qualquer ponto em que a tela diga uma coisa e grave outra (data, hora,
percentual, preço).

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Entra no painel e abre o menu Descontos | Cupons · Promoções · **Campanhas**, nessa ordem. Lista vazia: "Nenhuma campanha ainda." e "Nova campanha" | `screenshots/CH-01-01-lista-vazia.png` não gravada (a pasta ainda não existia) · — |
| 02 | Toca em "Nova campanha" | Título "Nova campanha"; Começa em 13/11/2026 00:00, Termina em 13/11/2026 23:59; #161514 / #C2A063; "Campanha ligada" ligado; Salvar desligado | — |
| 03 | Digita "Black Friday" no nome | O texto do selo acompanha: "Black Friday"; a prévia mostra "BLACK FRIDAY −10%" (ainda sem percentual cadastrado) | — |
| 04 | Escolhe 30 no calendário de "Termina em" | "30/11/2026", hora 23:59 mantida. O calendário fica aberto depois da escolha e cobre o botão "Adicionar" dos percentuais; foi preciso Esc | — |
| 05 | Acrescenta 10, 15 e 20 | Três linhas "nenhuma peça"; prévia "BLACK FRIDAY −20%", "De R$ 179,90 / R$ 143,92"; "Pronta para salvar."; contraste "7,4:1" | `screenshots/CH-01-02-form-pronta.png` |
| 06 | Duplo clique em "Salvar campanha" | Volta à lista com **uma** linha: selo, "Black Friday", "13/11 a 30/11/2026", 10 % 15 % 20 %, 0 peças, "Em vigência". Recarregou: continua uma só | `screenshots/CH-01-03-lista-em-vigencia.png` |
| 07 | Reabre a campanha | Começa 13/11/2026 00:00 · Termina **30/11/2026 23:59**; "Estado: em vigência até 30/11 às 23:59"; "Encerrar agora" (não tocado) | `screenshots/CH-01-04-editar.png` |
| 08 | Volta (back) e confere a lista em 390 × 844 | Cartão: "Black Friday · Em vigência · 13/11 a 30/11/2026 · nenhuma peça", selo e pílulas; sem rolagem horizontal (scrollWidth 390) | `screenshots/CH-01-05-lista-390.png` |
| 09 | Busca "Pulseira Afetiva" em Produtos e abre M-A, aba "Preços & variações" (o plano a chama "Preço e estoque") | Cartão "Black Friday · 13/11 a 30/11/2026 · Em vigência", "Desconto desta peça na campanha. Vale para todas as variações.", grupo "Desconto na Black Friday": Nenhum (marcado) · 10% · 15% · 20% | — |
| 10 | Escolhe 20 % em M-A | "R$ 385,00 → R$ 308,00", selo −20%, tabela das 3 cores a R$ 308,00, e a nota "A loja mostra este preço até 30/11 às 23:59…" | `screenshots/CH-01-06-MA-20-previa.png` |
| 11 | Sem salvar, clica em "Produtos" no menu | Sai direto para a lista, sem aviso. Ao reabrir M-A: "Nenhum" — nada gravado, mas nada avisou (A-2) | — |
| 12 | Escolhe 20 % em M-A e salva | 20% fica marcado; nenhum aviso de salvo visto no momento da leitura | — |
| 13 | Abre M-B, escolhe 15 % | Tabela das 12 variações, cada uma com 15 % sobre o próprio preço (R$ 558,00 → R$ 474,30; R$ 383,00 → R$ 325,55; conferidas todas) ; salva: Salvar desliga | `screenshots/CH-01-07-MB-15-tabela.png` |
| 14 | Abre M-C | Antes de qualquer edição, o topo já diz "Alterações não salvas · Rascunho salvo automaticamente · há 0 s" | — |
| 15 | Escolhe 10 % em M-C | O topo do cartão diz "R$ 349,90 → **R$ 314,91**"; a tabela diz "Variação 1 · R$ 374,00 · **R$ 336,60**" (A-1); salva: o "Alterações não salvas" some | `screenshots/CH-01-08-MC-10-de-por.png` |
| 16 | Abre M-D | De novo "Alterações não salvas" sem edição | — |
| 17 | Escolhe 20 % em M-D e salva | "R$ 340,00 → R$ 272,00", 3 cores a R$ 272,00; após salvar, "Alterações não salvas" some e 20% fica marcado | `screenshots/CH-01-09-MD-20-salvo.png` |
| 18 | Orçamento no teto: sai da conta pelo menu "Sua conta" › Sair | Volta a `/admin/login` | — |

**Edge cases tentados:**

- Duplo clique em Salvar da campanha — uma campanha só, também depois de recarregar
- Voltar depois do sucesso (lista → editar → voltar) — volta à lista, intacta
- Sair da aba de preço com o percentual escolhido e sem salvar — nada gravado, mas sem aviso (A-2)
- Lista em 390 × 844 — cartões como o TC pede

## Casos

| TC     | Veredito | Passo | Evidência                 | Nota                        |
| ------ | -------- | ----- | ------------------------- | --------------------------- |
| TC-FUNC-001 | pass | 01–08 | `screenshots/CH-01-03-lista-em-vigencia.png` · `CH-01-04-editar.png` · `CH-01-05-lista-390.png` | Fim volta como 30/11/2026 23:59; duplo clique cria uma só. Variação "nome com mais de 14 caracteres" não tentada |
| TC-FUNC-003 | fail | 09–17 | `screenshots/CH-01-08-MC-10-de-por.png` | A-1 (M-C: o topo diz R$ 314,91 e a tabela R$ 336,60); A-2 (sair sem salvar não avisa). M-A, M-B e M-D com a prévia certa. "Confirmação de salvo" e o preço cadastrado depois de salvar não conferidos |
| TC-JOURNEY-003 | skip | 01–17 | — | Passos 1–2 feitos; passos 3–5 (bloco "Joias em oferta", "Black Friday · 4 peças" na lista, `/ofertas`) não alcançados — orçamento |

Contagem: pass 1 · fail 1 · blocked 0 · skip 1

## Achados

### A-1 · [Produto · cartão da campanha] Em peça com "de/por", o topo da prévia mostra um preço e a tabela outro — para a dona

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-01 Adri                                                           |
| Jornada e passo     | J-01, passo 5 (marcar M-C com 10 %) · passo 15 do log                 |
| TC                  | TC-FUNC-003 (passo 5)                                                 |
| Gravidade proposta  | high — a tela diz dois preços para a mesma peça; a dona não sabe qual a loja vai cobrar e perde a confiança na prévia, que é o que ela usa para não errar o preço |
| Reproduziu          | intermitente (1 de 1) — vista uma vez, não repetida por orçamento; é tela estática, deve reproduzir sempre |
| Viewport            | 1440 × 900                                                            |

**Passos para reproduzir** — de um estado limpo:

1. `admin-loja` em `http://localhost:8093/admin`, com a Black Friday (10/15/20) em vigência
2. Produtos › "Pulseira Afetiva Esferas com Leite Materno em Prata 925" (M-C, "de" R$ 374,00 / por R$ 349,90) › aba "Preços & variações"
3. No cartão Black Friday, escolher 10%

**Esperado:** um único "na campanha" = o menor entre o "por" de hoje e o "de" com 10 % = min(R$ 349,90; R$ 336,60) = R$ 336,60, igual no topo e na tabela — **fonte:** TC-FUNC-003 passo 5; PRD CA-05/CA-06, RN-06

**Observado:** topo do cartão "R$ 349,90 → R$ 314,91" (10 % sobre o "por"); tabela "Variação 1 · R$ 374,00 · R$ 336,60". A coluna "Preço" da tabela mostra o "de" (R$ 374,00), não o preço de hoje (R$ 349,90). Não conferido qual dos dois a loja cobra.

**Evidência:**

- `screenshots/CH-01-08-MC-10-de-por.png` — o topo com R$ 314,91 e a tabela com R$ 336,60 na mesma tela
- console: não lido
- rede: nada

### A-2 · [Produto · cartão da campanha] Sair da aba com o percentual escolhido e sem salvar não avisa — para a dona

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-01 Adri                                                           |
| Jornada e passo     | J-01, passo 5 / desvio J-01b · passo 11 do log                        |
| TC                  | TC-FUNC-003 (variação "sair sem salvar")                              |
| Gravidade proposta  | high — fricção numa jornada P0 (sobe um degrau): ela escolhe 20 %, vai à próxima peça e só descobre na loja que a peça ficou fora da vitrine |
| Reproduziu          | intermitente (1 de 1) — não repetido por orçamento |
| Viewport            | 1440 × 900                                                            |

**Passos para reproduzir** — de um estado limpo:

1. `admin-loja`, Black Friday em vigência; abrir M-A (`Pulseira Afetiva Lisa com Leite Materno em Prata 925`) › aba "Preços & variações", com "Nenhum" marcado
2. Escolher 20% (a prévia R$ 385,00 → R$ 308,00 aparece)
3. Sem salvar, clicar em "Produtos" no menu lateral

**Esperado:** aviso de alterações não salvas; nada gravado sem Salvar — **fonte:** J-01b; TC-FUNC-003, variação "sair sem salvar"

**Observado:** a lista de produtos abre direto, sem aviso. Reaberta a peça, "Nenhum" (nada gravado — essa parte está certa). A navegação foi por link do menu (SPA); o driver não mostrou diálogo.

**Evidência:**

- `screenshots/CH-01-06-MA-20-previa.png` — o estado com 20 % escolhido antes de sair
- console: não lido
- rede: nada

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta                     |
| ----------------------- | ------------ | ----------------------------------- |
| Ao abrir M-C e M-D, sem tocar em nada, o topo já mostra "Alterações não salvas · Rascunho salvo automaticamente · há 0 s" — a dona não sabe se há algo pendente | 14, 16 | pré-existente |
| O calendário de "Termina em" fica aberto depois de escolher o dia e cobre o "Adicionar" dos percentuais | 04 | polimento |
| A prévia do selo mostra "−10%" antes de existir percentual cadastrado | 03 | polimento |
| O link da campanha na lista tem o nome acessível "Black Friday, 20% de desconto Black Friday" (nome repetido) | 06 | polimento |

## Fora da cobertura

- J-01 passo 6 / TC-JOURNEY-003 passo 3 — acrescentar e ligar o bloco "Joias em oferta" em `/admin/home`, e as variações "bloco duplicado" e "bloco sem configuração" — orçamento esgotado. **O bloco não foi criado**
- TC-JOURNEY-003 passos 4–5 — a lista "Black Friday · 4 peças" e `/ofertas` e a Home na loja (8092) — orçamento. Por isso as quatro marcações **não foram conferidas depois de recarregar**
- Qual preço a loja cobra em M-C (R$ 314,91 ou R$ 336,60) — orçamento
- O preço cadastrado das quatro peças depois de salvar (efeito colateral) — orçamento
- Variações não tentadas: recarregar durante o salvar, voltar no meio do formulário, campanha aberta em duas abas, nome com mais de 14 caracteres, "voltar ao mesmo" percentual, aba de preço em 390 × 844
- Fonte a 200 % — orçamento

## Debrief

- **Surpresas:** o cartão da campanha calcula certo na tabela e errado no topo para a peça com "de/por"; o formulário de produto se diz "não salvo" ao abrir
- **Próximo charter:** quem ler `/ofertas` e a página de M-C (CH-03, CH-04) confere qual preço a loja cobra em M-C; a thread precisa criar o bloco "Joias em oferta" e conferir "4 peças" na lista antes do L2
- **Padrão novo:** comparar o resumo do topo com a tabela por variação na mesma tela, em peça com "de"
