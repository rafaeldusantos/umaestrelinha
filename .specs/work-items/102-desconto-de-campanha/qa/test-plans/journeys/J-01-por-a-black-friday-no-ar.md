# J-01 · Pôr a Black Friday no ar: cadastrar, marcar as peças e ligar o bloco da Home

**Valor:** a dona prepara a campanha sozinha, sem mexer em preço, e vê a loja passar a mostrar as peças em oferta.
**Persona:** PER-01 Adri (principal) · —
**Prioridade:** P0
**Critérios de origem:** CA-01, CA-03 (prévia no painel), CA-05, CA-06, R-04 (o bloco da Home)
**Charters:** CH-01 · **TC:** TC-JOURNEY-003, TC-FUNC-001, TC-FUNC-003

## Entrada

| Origem            | URL / caminho              | Estado de partida                                  |
| ----------------- | -------------------------- | -------------------------------------------------- |
| navegação interna | `http://localhost:8083/admin` → menu Descontos › Campanhas | logada como `admin-loja`, nenhuma campanha cadastrada |

## Passos

| # | A persona… | Deve ver | Em até | Fricção prevista | TC |
| - | ---------- | -------- | ------ | ---------------- | -- |
| 1 | abre Descontos › **Campanhas** | o item ao lado de Cupons e Promoções; a lista vazia e o botão "Nova campanha" | 5 s | — | TC-FUNC-001 |
| 2 | cria "Black Friday", 13/11/2026 00:00 a 30/11/2026 23:59, percentuais 10, 15 e 20, ligada | a prévia do selo "BLACK FRIDAY · −20%" mudando enquanto digita; "Pronta para salvar." | 60 s | vigência em data **e** hora | TC-FUNC-001 |
| 3 | salva e volta à lista | a linha com o selo, "13/11 a 30/11/2026", as três pílulas e o estado "Em vigência" | 5 s | — | TC-FUNC-001 |
| 4 | abre M-A no painel, aba Preço e estoque | o cartão "Black Friday" com "Nenhum · 10% · 15% · 20%" | 10 s | o cartão longe do campo de preço | TC-FUNC-003 |
| 5 | escolhe 20 % e salva; repete para M-B (15 %), M-C (10 %) e M-D (20 %) | a prévia "R$ X riscado → R$ Y" e a tabela por variação; "salvo" | 30 s por peça | quatro peças uma a uma | TC-FUNC-003 |
| 6 | em `/admin/home`, acrescenta o bloco "Joias em oferta" pela bandeja e o liga | o bloco na lista, ligado | 30 s | o bloco nasce desligado | TC-JOURNEY-003 |
| 7 | abre a loja (`/ofertas`) | as quatro peças com a faixa da campanha | 10 s | — | TC-JOURNEY-003 |

**Tempo total esperado:** ~5 min — dentro da paciência dela para uma tarefa de preparo.

## Objetivo

- **Observável:** a lista mostra "Black Friday · Em vigência · 4 peças" e `/ofertas` na loja mostra as quatro
  peças com o preço da campanha.
- **Efeitos colaterais:** o preço cadastrado das quatro peças continua o mesmo (aba Preço e estoque).

## Saída

- **Natural:** a dona volta à lista de campanhas ou à loja para conferir.

## Desvios e abandono

| Ramo  | No passo | Quando | A persona… | Deve acontecer | TC |
| ----- | -------- | ------ | ---------- | -------------- | -- |
| J-01a | 2 | escolhe cores da faixa e de destaque parecidas | vê a razão em vermelho e troca por "Preto e ouro" | "{x,y:1} Pouca diferença…", Salvar desligado até corrigir; nada gravado | TC-FUNC-002 |
| J-01b | 5 | sai da aba de preço sem salvar depois de escolher 20 % | volta à lista de produtos | aviso de alterações não salvas; nada gravado sem Salvar | TC-FUNC-003 |

## Fronteiras

nenhuma — painel e banco local.

## Modos de falha

- A campanha salva com o fim às 00:00 do dia 30 (fim exclusivo mal convertido) e a lista diz uma data e a loja outra
- O cartão da campanha não aparece na aba de preço, e não há outro caminho para marcar a peça
