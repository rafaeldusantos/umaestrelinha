# Sessão CH-08 · design-check — os padrões do protótipo no editor do bloco (rodada 2, confirmação)

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-08-design-check.md` · design-check · P2        |
| Status      | done                                                                   |
| Persona     | PER-01 Adri · conta: admin-loja-2 — `QA_ADMIN_LOJA_2_*`                |
| Tour · modo | — · —                                                                  |
| Rodada      | confirmação                                                            |
| Orçamento   | 18 ações de browser de 20 (sem contar esperas; mais 2 para sair da conta e fechar) |
| Ambiente    | http://localhost:8083 (painel, worktree feature-103) · build não exposto · Chromium (agent-browser 0.39.1, headless) · viewport 1440 × 900 · rotas `**/*.supabase.co/**` e `**/g/collect*` abortadas |
| Paridade    | protótipo pela cópia decodificada do bundle lida na rodada 1 (o link para na verificação Cloudflare; não reaberto). Massa: editor de B-3 ("Virada QA", sem peças), não de B-1 |

## Missão

Conferir se os três padrões que a costura adotou do protótipo estão no editor do bloco como o protótipo os
desenha — e só eles: as telas do bloco não estão no protótipo. Nesta rodada: só o TC-UI-002 (a recusa ao
salvar, que ficou sem prova na rodada 1) e a reprodução do A-3 da rodada 1 (prévia da Home depois de Cancelar).

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Entrar no painel e abrir o 18º bloco em /admin/home ("Abrir Joias em oferta" da linha "Campanha “QA103 Virada” · encerrada em 17/11") | Editor "Joias em oferta" com "Título do bloco" = "Virada QA", descrição vazia, campanha "QA103 Virada" (encerrada) marcada, aviso "A campanha escolhida já terminou, e o bloco não aparece na loja. Escolha outra campanha." FormCard "Peças escolhidas" sem peças (sem lista) | — (snapshot) |
| 02 | Trocar o título por 61 caracteres e clicar em "Salvar seção" | O campo aceita os 61. Contador ao lado do rótulo, à direita: "61/60" (cinza, mesmo estilo do normal). Ao salvar: no topo do formulário, abaixo do cabeçalho, um alerta (papel `alert`, fundo rosado, ícone de triângulo) "Cabem 60 caracteres no título, e há 61. Encurte o título." O selo "Alterações não salvas" continua; a URL não muda — **não gravou**. Abaixo do campo segue só a dica "Vazio, o bloco usa o nome da campanha." | `screenshots/CH-08-r2-02-recusa-ao-salvar-61.png` |
| 03 | Cancelar o editor e olhar a prévia de /admin/home (A-3, tentativa 1) | Volta a /admin/home sem diálogo. A prévia mostra o 4º bloco "Joias para guardar quem a gente ama"; nenhum texto do rascunho ("bbbb…") em lugar nenhum da página. Mas o bloco B-3 **não é desenhado na prévia** (campanha encerrada), então o rascunho dele não teria onde aparecer: a tentativa não prova nem desmente o A-3 | `screenshots/CH-08-r2-03-home-apos-cancelar-1.png` |
| 04 | Sair da conta e fechar o browser | "Sua conta" › Sair → /admin/login; sessão fechada | — |

**Edge cases tentados:** nada além do pedido (rodada de confirmação). A segunda tentativa do A-3 não foi feita: com B-3 oculto na prévia, repetir daria o mesmo resultado inconclusivo (ver Fora da cobertura).

## Casos

| TC     | Veredito | Passo | Evidência                 | Nota                        |
| ------ | -------- | ----- | ------------------------- | --------------------------- |
| TC-UI-002 | pass | 01-03 | `screenshots/CH-08-r2-02-recusa-ao-salvar-61.png` | Pela decisão I-06: contador ao lado do rótulo ok ("n/limite", desvio declarado); com 61 no título, "Salvar seção" mostra a recusa como alerta, com ícone, motivo e número, e não grava — ok. Lista com subir/descer/remover: não visível em B-3 (sem peças); conferida em B-1 na rodada 1 (`screenshots/CH-08-04-sem-recusa-61.png`), "Remover" com lixeira segue CA-03.2. Diferença menor no contador: A-1 |

Contagem: pass 1 · fail 0 · blocked 0 · skip 0

## Achados

### A-1 · [Painel › editor do bloco] o contador do título fica em "61/60" sem estado de erro, mesmo depois da recusa — Adri não vê no campo onde errou

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-01 Adri                                                           |
| Jornada e passo     | — (design-check) · passo 02 do log                                    |
| TC                  | TC-UI-002 (passo 3)                                                   |
| Gravidade proposta  | low — a recusa no alerta do topo já diz o motivo e o número; o campo e o contador só não apontam o lugar |
| Reproduziu          | intermitente (1 de 1) — visto uma vez nesta rodada; na rodada 1 o contador também ficou cinza em 61/60 e 161/160 (sem salvar) |
| Viewport            | 1440 × 900                                                            |

**Passos para reproduzir** — de um estado limpo:

1. Painel http://localhost:8083 com uma conta admin; /admin/home › abrir um bloco "Joias em oferta"
2. Trocar o "Título do bloco" por 61 caracteres
3. Clicar em "Salvar seção"; olhar o contador e o campo

**Esperado:** contador em estado de erro e campo marcado inválido, como o "Texto do selo" acima do teto — **fonte:** protótipo `SQehnBNiiQmbnjkY3QQpbq`, tela Campanha · editar (contador com classe `err`, campo `aria-invalid`). A posição da recusa (alerta no topo em vez de abaixo do campo) é aceita pela decisão I-06 e não é parte deste achado

**Observado:** alerta "Cabem 60 caracteres no título, e há 61. Encurte o título." no topo; o contador segue "61/60" em cinza e o campo com a borda do estado normal.

**Evidência:**

- `screenshots/CH-08-r2-02-recusa-ao-salvar-61.png` — alerta no topo, contador 61/60 cinza ao lado do rótulo
- console: não coletado
- rede: nada

## Design

**Protótipo:** `SQehnBNiiQmbnjkY3QQpbq` · Painel — Campanhas, faixa de avisos e perfil de estilo · `link` · lido pela cópia decodificada do bundle (rodada 1); sem CSS — só estrutura, texto e ícone

| #  | Tela · frame         | Elemento        | Propriedade   | Design                 | Observado              | Evidência                          | Achado |
| -- | -------------------- | --------------- | ------------- | ---------------------- | ---------------------- | ---------------------------------- | ------ |
| D1 | `/admin/home/<B-3>` Conteúdo · Campanha › editar "Nome da campanha" | contador do título | texto (formato) | `n / teto` | `61/60` · 1440 | `screenshots/CH-08-r2-02-recusa-ao-salvar-61.png` | — desvio declarado (I-06) |
| D2 | `/admin/home/<B-3>` Conteúdo · Campanha › editar "Texto do selo" (erro) | recusa do título | posição · momento | abaixo do campo, ao digitar, ícone `alert` | alerta no topo do formulário, ao salvar, ícone de triângulo + motivo e número · 1440 | `screenshots/CH-08-r2-02-recusa-ao-salvar-61.png` | — aceito pela decisão I-06 |
| D3 | `/admin/home/<B-3>` Conteúdo · Campanha › editar "Texto do selo" (erro) | contador e campo em erro | estado | contador `err`, campo `aria-invalid` | contador cinza, campo no estado normal · 1440 | `screenshots/CH-08-r2-02-recusa-ao-salvar-61.png` | A-1 |

**Telas não conferidas:** a lista de peças (subir/descer/remover) — B-3 não tem peças; conferida em B-1 na rodada 1. O bloco inteiro, a linha e a bandeja — sem frame

## Spec-gaps

nada

## Fora da cobertura

- Reprodução do A-3 da rodada 1 (prévia da Home mostra o título cancelado): com a massa permitida (B-3, campanha encerrada), o bloco não é desenhado na prévia, então o rascunho não tem onde aparecer. A tentativa 1 não mostrou o rascunho, mas não prova nada; a tentativa 2 não foi feita porque daria o mesmo resultado. Para reproduzir, precisa de um bloco que apareça na prévia (B-1, com outra sessão nesta rodada) ou de liberar a massa
- Lista com subir/descer/remover nesta rodada — B-3 sem peças; a massa não permite acrescentar
- Recusa da descrição (161) ao salvar — não pedida nesta confirmação, e o orçamento ficou para o A-3
- Valores de cor, tipografia e espaço do estado de erro — sem CSS do protótipo

## Debrief

- **Surpresas:** a recusa ao salvar existe e é clara, com motivo e número; o B-3 não aparece na prévia, o que impede reproduzir o A-3 com ele
- **Próximo charter:** reproduzir o A-3 num bloco que apareça na prévia (B-1), duas vezes, com screenshot depois de Cancelar e antes de recarregar
- **Padrão novo:** nada
