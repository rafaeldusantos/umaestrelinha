# Sessão CH-02 · Recusas do cadastro e a edição em massa

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-02-recusas-do-cadastro-e-edicao-em-massa.md` · exploratório · P1 |
| Status      | done (orçamento esgotado antes da edição em massa: ver Fora da cobertura) |
| Persona     | PER-01 Adri · conta: `admin-loja` (conta de dev local documentada no seed; `QA_ADMIN_LOJA_*` não definidas nesta máquina) |
| Tour · modo | Garbage · por técnica — valor limite e transição de estado              |
| Rodada      | exploração                                                             |
| Orçamento   | 51 ações de browser de 50 (as 3 últimas: sair da conta) — snapshots, leituras de texto, esperas e screenshots não contadas |
| Ambiente    | painel `http://localhost:8093/admin` · build não exposto · Chromium (agent-browser 0.39.1, headless) · viewport 1440 × 900 · rotas abortadas: `**/*.supabase.co/**`, `**/g/collect*` |
| Paridade    | banco local; data do sistema 13/11/2026; conta de dev do seed |

## Missão

Como a dona com pressa, achar qualquer entrada no cadastro de campanha que grave sem motivo ou recuse sem dizer
por quê, qualquer jeito de a marcação em lote numa campanha agendada aparecer na loja antes da hora, e qualquer
lote que o Desfazer não devolva por inteiro.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Entrar no painel e abrir "Nova campanha" | Form vazio; vigência já vem 13/11/2026 00:00 a 13/11/2026 23:59 e, sem ela tocar em nada, já mostra a recusa "A vigência cruza a da campanha “Black Friday” (13/11 a 30/11). Só uma campanha ligada pode valer por vez: mude as datas ou desligue a outra."; Salvar desligado | — |
| 02 | Acrescentar 0 % | "Use um número de 1 a 70."; nenhuma pílula; segue "Nenhum percentual ainda." | — |
| 03 | Acrescentar 80 % | "Use um número de 1 a 70."; nenhuma pílula | — |
| 04 | Acrescentar 10 % e de novo 10 % (Adicionar) | Pílula "10% · nenhuma peça · Tirar 10%"; a segunda tentativa: "10% já está na campanha." | — |
| 05 | Tirar o 10 % (fica sem percentual) | "Nenhum percentual ainda." **e, logo abaixo do campo, continua "10% já está na campanha."** — o 10 % já não está. O motivo "Acrescente ao menos um percentual." não aparece; o rodapé diz só "Corrija o que está marcado para salvar."; Salvar desligado. A prévia continua mostrando "−10%" | `screenshots/CH-02-04-recusas-sem-percentual.png` |
| 06 | Texto do selo com 15 caracteres ("PROMOCAO NATAL!") | Contador "15 / 14" e "O selo cabe até 14 caracteres no cartão do celular. Use uma forma curta do nome."; Salvar desligado | `screenshots/CH-02-04-recusas-sem-percentual.png` |
| 07 | Cores #777777 e #999999 | "1,6:1 Pouca diferença entre as cores: o selo fica difícil de ler. Escolha cores com mais diferença (o mínimo é 4,5:1)."; Salvar desligado | `screenshots/CH-02-04-recusas-sem-percentual.png` |
| 08 | Cor de destaque "#12GG45" | "Use o formato #RRGGBB nas duas cores." | — |
| 09 | Mesmo dia, início 10:00 e fim 09:59 (13/11) | "O fim vem antes do início." (substitui a recusa de cruzamento); Salvar desligado | `screenshots/CH-02-08-fim-antes-do-inicio.png` |
| 10 | Voltar à lista de campanhas | Só a "Black Friday · 13/11 a 30/11/2026 · 10% 15% 20% · 4 · Em vigência": nada gravado pelas recusas | — |
| 11 | Criar "Natal": selo NATAL, 10 e 15 %, 01/12/2026 00:00 a 24/12/2026 23:59, ligada | Ao escolher só o início (01/12) com o fim ainda 13/11: "O fim vem antes do início."; com o fim em 24/12 a recusa some e o Salvar liga. Salvou e voltou à lista: "Natal · 01/12 a 24/12/2026 · 10% 15% · 0 · Agendada" acima da Black Friday | `screenshots/CH-02-10-natal-agendada.png` |
| 12 | Sair da conta | Volta a `/admin/login` | — |

**Edge cases tentados:**

- Valor limite do percentual (0, 80) e repetido (10 duas vezes)
- Transição de estado: acrescentar e tirar o único percentual (passo 05 — achado A-1)
- Fora de ordem: escolher o início antes do fim (passo 11) — recusa coerente, some ao completar
- Digitar a hora nos campos de hora: só funciona tecla a tecla (dígito por dígito); colar/preencher o campo de hora não muda o valor (observado pelo driver; ver Fora da cobertura — não registrado como achado)

## Casos

| TC     | Veredito | Passo | Evidência                 | Nota                        |
| ------ | -------- | ----- | ------------------------- | --------------------------- |
| TC-FUNC-002 | fail | 01–10 | `screenshots/CH-02-04-recusas-sem-percentual.png` · `screenshots/CH-02-08-fim-antes-do-inicio.png` | Passos 1, 2, 3, 6, 7, 8, 9, 10 conforme o esperado (frases literais). Passo 4 falha: sem o motivo "Acrescente ao menos um percentual." e com a recusa velha "10% já está na campanha." — A-1. Passo 5 (sexto percentual) e as variações (Ardósia e ouro, colar com espaço, colar do editor, nome vazio, desligada não cruza) não rodaram: orçamento |
| TC-FUNC-010 | skip | — | — | Depende de M-G marcada em 15 % na Natal, que não foi feita (orçamento) |
| TC-FUNC-021 | skip | 11 | `screenshots/CH-02-10-natal-agendada.png` | Só o passo 1 rodou e passou ("Natal · Agendada"). Passos 2–6, a edição em massa, o filtro e as duas variações "Desfazer" não rodaram: orçamento |
| TC-UI-004 | skip | — | — | 390 × 844 não rodou: orçamento |

Contagem: pass 0 · fail 1 · blocked 0 · skip 3

## Achados

### A-1 · [Nova campanha · Percentuais] Sem nenhum percentual, a tela diz "10% já está na campanha." e não diz o que falta — para a dona

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-01 Adri                                                           |
| Jornada e passo     | J-02, passo 1 (cadastrar a campanha) · passo 05 do log                |
| TC                  | TC-FUNC-002 (passo 4)                                                 |
| Gravidade proposta  | medium — o Salvar fica desligado sem o motivo certo, e a mensagem visível contradiz a tela ("já está" com "Nenhum percentual ainda."): a dona precisa adivinhar o que corrigir |
| Reproduziu          | intermitente (1 de 1) — a segunda tentativa não coube no orçamento; o estado persistiu por três leituras seguidas da mesma tela (passos 05 a 09) |
| Viewport            | 1440 × 900                                                            |

**Passos para reproduzir** — de um estado limpo:

1. Como `admin-loja`, abrir `http://localhost:8093/admin/campanhas/nova`
2. Em "Novo percentual", digitar 10 e tocar em "Adicionar"; digitar 10 de novo e tocar em "Adicionar" — aparece "10% já está na campanha."
3. Tocar em "Tirar 10%"

**Esperado:** "Nenhum percentual ainda." e o motivo "Acrescente ao menos um percentual."; Salvar desligado; a recusa de percentual repetido some com o percentual — **fonte:** TC-FUNC-002 passo 4; PRD CA-02; `spec.md` › Painel · Campanha · nova/editar (frases literais)

**Observado:** "Nenhum percentual ainda." e, abaixo do campo, ainda "10% já está na campanha."; o motivo "Acrescente ao menos um percentual." não aparece; o rodapé mostra só "Corrija o que está marcado para salvar."; Salvar desligado. A prévia do selo segue com "−10%".

**Evidência:**

- `screenshots/CH-02-04-recusas-sem-percentual.png` — "Nenhum percentual ainda." junto de "10% já está na campanha." (com o selo de 15 caracteres e as cores sem contraste na mesma tela)
- console: não lido
- rede: nada

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta                     |
| ----------------------- | ------------ | ----------------------------------- |
| "Nova campanha" abre com a vigência de hoje a hoje (13/11 00:00–23:59) e já mostra a recusa de cruzamento com a Black Friday antes de a dona tocar em qualquer campo | 01 | polimento |
| Com nenhum percentual, a prévia do selo mostra "−10%" | 05 | polimento |

## Fora da cobertura

- TC-FUNC-002 passo 5 (sexto percentual) e todas as variações (Ardósia e ouro, hex colado com espaço/minúsculas, colar do editor de texto no nome/selo, nome vazio, desligada não cruza, duplo clique em "Adicionar") — orçamento
- Segunda reprodução de A-1 — orçamento
- Edição em massa em `/admin/produtos` (seção de campanha, Natal → 15 % em M-G, duplo clique em "Aplicar", recarregar durante o lote), filtro por campanha e por percentual, "Ver as peças" — orçamento. **A massa M-G não foi marcada**
- TC-FUNC-010 inteiro (recusa de tirar 15 % e "Ver as peças com 15%") — depende da marcação de M-G
- As duas variações "Desfazer" do TC-FUNC-021 (Natal 15 → 10 % e Black Friday → 10 % numa peça de M-G), e a conferência na loja e em `/ofertas` — orçamento. Nada foi marcado na Black Friday
- TC-UI-004 (lista, nova e edição em 390 × 844; fonte a 200 %) — orçamento
- Campo de hora: preencher (`fill`/colar) não muda o valor; só a digitação tecla a tecla muda. Não dá para afirmar pela sessão se é limitação do driver ou do campo — não registrado como achado
- O orçamento de 50 ações não comporta o charter: as recusas (≈ 25 ações, o campo de data pede 3 cliques por data e a hora 3 teclas) e a criação da Natal (≈ 15) consumiram tudo

## Debrief

- **Surpresas:** o seletor de data custa 3 ações por data (abrir, mês seguinte, dia) e o de hora só aceita tecla a tecla — o cadastro sozinho consome ~15 ações
- **Próximo charter:** a metade de lote do CH-02 (edição em massa de M-G na Natal, filtro, "Ver as peças", TC-FUNC-010, os dois Desfazer e TC-UI-004) como uma sessão própria, partindo da "Natal" já criada
- **Padrão novo:** acrescentar e tirar o último item de uma lista com validação — a recusa anterior fica pendurada
