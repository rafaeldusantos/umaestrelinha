# Sessão CH-01 (continuação) · A dona destaca o item com ícone do sistema e cor

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-01-dona-destaca-item.md` · exploratório · P0   |
| Status      | done (orçamento esgotado antes da loja a 390 — ver Fora da cobertura)  |
| Persona     | PER-01 Adri, a dona · conta: `admin` — `QA_ADMIN_*`                    |
| Tour · modo | Feature · por cenário (J-01) — continuação: só TC-JOURNEY-001, TC-FUNC-003, TC-FUNC-004, TC-UI-001 |
| Rodada      | exploração                                                             |
| Orçamento   | 50 ações de browser de 50 (mais 5 de encerramento: tentativa de sair da conta e fechar o browser) |
| Ambiente    | painel http://localhost:8083/admin/menu · loja http://localhost:8082 · build não exposto · Chromium (agent-browser, sessão `CH-01b`, headless) · viewport 1440 × 900 (painel e loja) |
| Paridade    | Supabase local; `**/*.supabase.co/**` e `**/g/collect*` bloqueados; perfil de estilo Black Friday (barra #1C1A18); a primeira gravação converteu o menu da forma legada (esperado, não é achado) |

## Missão

Confirmar que a dona acha o ícone de etiqueta entre os dois grupos do seletor, dá ao item uma cor para cada fundo vendo o efeito na prévia, e encontra tudo gravado — no painel recarregado e na loja — sem que nada mais mude.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Entrou no painel e foi a /admin/menu | Lista com Joias afetivas, Coleção Amuletos, Colar e correntes, Personalizados, Sobre | — |
| 02 | Abriu "Sobre" por Ações › "Editar nome, ícone e banners"; escolheu Etiqueta em "Do sistema"; digitou `#E8C77A` na barra e `#8A5A2B` na lista | Os poços de cor acompanharam (`#e8c77a`, `#8a5a2b`); "Usar a cor padrão" habilitou nos dois; medidas "5,7:1 Contraste bom para ler o nome na barra do computador." e "5,9:1 Contraste bom para ler o nome na lista do celular." O botão Etiqueta não expõe estado de marcado na árvore de acessibilidade (sem `pressed`/`selected`) | `screenshots/CH-01b-02-editor-a-cores.png` |
| 03 | Olhou a prévia antes de salvar | O editor é um painel modal que cobre a metade esquerda da prévia (o quadro fica em 705–1375 px, o painel até ~980 px) e escurece o resto; os botões Celular / Computador / Tela cheia ficam fora de alcance (fora da árvore, atrás do modal). Na parte visível da barra da prévia (Computador), "SOBRE" segue com o ícone antigo e o rótulo claro, não dourado | `screenshots/CH-01b-03-previa-computador-nao-salvo.png` |
| 04 | Salvou | O editor fechou sem erro; não há outro botão de gravar na página. A prévia, agora sem o modal, mostra "SOBRE" com cor computada `rgb(232, 199, 122)` | — |
| 05 | Recarregou o painel e reabriu "Sobre" | Nome "Sobre"; barra `#E8C77A` (poço `#e8c77a`) e lista `#8A5A2B` (poço `#8a5a2b`), com 5,7:1 e 5,9:1 "Contraste bom". A Etiqueta continua escolhida (confirmado pela loja no passo 07; o editor não expõe o estado marcado) | — |
| 06 | Ainda no editor de "Sobre", trocou a barra para `#F2E1B6` para ver a prévia acompanhar; depois fechou com Esc sem salvar | A leitura da prévia com o editor aberto não foi possível (o quadro fica atrás do modal); Esc fechou sem gravar — a loja depois não tem `#F2E1B6` | — |
| 07 | Abriu "Joias afetivas", escolheu Presente, digitou `#8A5A2B` só na lista (barra intocada) e salvou | O editor fechou sem erro | — |
| 08 | Abriu a loja a 1440 | Barra: "JOIAS AFETIVAS" com o Presente e o rótulo claro de sempre; "COLEÇÃO AMULETOS" com a flor prensada; "SOBRE" com a Etiqueta e o rótulo dourado (81 px `#E8C77A` na barra, nenhum `#F2E1B6`) | `screenshots/CH-01b-05-loja-1440-barra.png` |

**Edge cases tentados:** recarregar o painel depois de Salvar (passo 05 — a gravação chegou inteira); fechar o editor com Esc com cor alterada e não salva (passo 06 — nada gravado). Duplo clique em Salvar não tentado — orçamento.

## Casos

| TC     | Veredito | Passo | Evidência                 | Nota                        |
| ------ | -------- | ----- | ------------------------- | --------------------------- |
| TC-JOURNEY-001 | skip | 02–08 | `screenshots/CH-01b-02-editor-a-cores.png` · `screenshots/CH-01b-05-loja-1440-barra.png` | Passos 1–5 conferem (editor, Etiqueta, medidas ≥ 4,5:1, gravado sem recusa, loja a 1440 com Etiqueta e rótulo `#E8C77A`). Passo 6 (loja a 390, folha com A em `rgb(138, 90, 43)`) não feito — orçamento. A cor "verde" da medida não foi lida (só o texto "Contraste bom") |
| TC-FUNC-003 | pass | 05 | — | Passo 1 confere depois de recarregar (Etiqueta comprovada pela loja; barra e lista nos campos hex e nos poços, medidas boas). Passos 2–3 (mudar só o nome e voltar) e as variações item B recarregado e duplo clique não feitos — orçamento. Variação "recarregar logo depois de Salvar" confere |
| TC-FUNC-004 | fail | 03 | `screenshots/CH-01b-03-previa-computador-nao-salvo.png` | A-1: com o editor aberto a prévia fica coberta e escurecida, sem troca Celular/Computador, e a parte visível não mostra a Etiqueta nem o dourado antes de salvar; passo 3 (prévia acompanhar `#F2E1B6`) não conferível pelo mesmo motivo |
| TC-UI-001 | pass | 08 | `screenshots/CH-01b-05-loja-1440-barra.png` · `screenshots/CH-01-02-do-sistema.png` (sessão 1) | Julgamento visual na loja a 1440: Presente (B) e Etiqueta (A) no mesmo traço fino de contorno e do mesmo tamanho que a flor prensada (D) e os ícones de C e da corrente; alinhados ao rótulo pela base, sem preenchido sólido. A Etiqueta toma a cor do rótulo (dourado), como manda `currentColor`. A 390 não conferido — orçamento |

Contagem: pass 2 · fail 1 · blocked 0 · skip 1

## Achados

### A-1 · [Painel › editor do item] a dona não vê o ícone nem a cor na prévia antes de salvar — o editor cobre a prévia e trava a troca Celular/Computador

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-01 Adri, a dona                                                   |
| Jornada e passo     | J-01, passo 5 (olhar a prévia antes de gravar) · passo 03 do log      |
| TC                  | TC-FUNC-004                                                           |
| Gravidade proposta  | medium — a dona grava às cegas; ela vê o efeito só depois de salvar e precisa reabrir o item para corrigir, mas não perde dado |
| Reproduziu          | intermitente (1 de 1 — a segunda tentativa, no passo 06, não conseguiu ler a prévia com o editor aberto; a cobertura do modal e a troca Celular/Computador inalcançável se repetiram nas duas aberturas) |
| Viewport            | 1440 × 900                                                            |

**Passos para reproduzir** — de um estado limpo:

1. Entrar no painel como `admin` e abrir http://localhost:8083/admin/menu (prévia em Computador)
2. Em "Sobre", Ações › "Editar nome, ícone e banners"; escolher Etiqueta em "Do sistema"; digitar `#E8C77A` em "Na barra do computador (fundo escuro)"
3. Sem salvar, olhar a prévia à direita e tentar trocar para Celular

**Esperado:** a prévia ao lado mostra, antes de gravar, o item com a Etiqueta e o rótulo `#E8C77A` em Computador e `#8A5A2B` na folha em Celular, e acompanha a troca de cor sem recarregar — **fonte:** TC-FUNC-004; `plan.md` C-03 ("e na prévia do painel"); Design › Editor do item ("a prévia ao lado mostra o efeito")

**Observado:** o editor abre como painel modal que cobre a metade esquerda do quadro da prévia e escurece o restante; Celular, Computador e Tela cheia saem da árvore de acessibilidade e não podem ser tocados. Na parte visível da barra da prévia, "SOBRE" segue com o ícone antigo e o rótulo claro. Depois de Salvar, a prévia mostra `rgb(232, 199, 122)` — o efeito só aparece gravado.

**Evidência:**

- `screenshots/CH-01b-03-previa-computador-nao-salvo.png` — o quadro da prévia com o editor aberto e não salvo: metade coberta, "SOBRE" sem dourado
- console: não lido
- rede: nada

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta                     |
| ----------------------- | ------------ | ----------------------------------- |
| O ícone escolhido no seletor não expõe estado de marcado à tecnologia assistiva (o botão Etiqueta não tem `pressed`/`selected` no snapshot) — quem não vê a tela não sabe qual ícone está escolhido | 02, 05 | pré-existente |

## Fora da cobertura

- Loja a 390 × 844 com a folha aberta (TC-JOURNEY-001 passo 6; TC-UI-001 passo 2 a 390): A em `#8A5A2B` e B em `#8A5A2B` na lista — orçamento. **A cor da lista de B foi digitada e salva sem recusa, mas não foi vista na loja nem no editor recarregado**
- TC-FUNC-003 passos 2–3 (mudar só o nome e voltar), variação "item B recarregado" e "duplo clique no Salvar" — orçamento
- TC-FUNC-004 passo 3 (a prévia acompanha `#F2E1B6`) — com o editor aberto a prévia fica atrás do modal; o driver não leu o quadro nesse estado
- Cor computada da medida de contraste ("verde") — não lida; só o texto "Contraste bom"
- Sair da conta: o botão "Sair" não foi achado pelo nome no menu da conta; o browser foi fechado (sessão em memória, sem perfil — o login não persiste)

## Debrief

- **Surpresas:** o editor é modal e cobre a prévia — a promessa "a prévia ao lado mostra o efeito" não se cumpre enquanto se edita. Um `reload` seguido de snapshot imediato e um `wait --text` com texto partido em nós custaram 3 ações
- **Próximo charter:** conferir a loja a 390 com a folha aberta (A e B em `#8A5A2B`) e o duplo clique em Salvar — 6 a 8 ações; CH-03/CH-04 podem começar por isso
- **Padrão novo:** nada

Estado final gravado: A "Sobre" = ícone `etiqueta`, barra `#E8C77A`, lista `#8A5A2B` (painel recarregado + loja a 1440); B "Joias afetivas" = ícone `presente` (loja a 1440), barra sem cor (loja a 1440, rótulo claro), lista `#8A5A2B` (salva sem recusa, não vista na loja). C, D e o perfil de estilo não tocados.
