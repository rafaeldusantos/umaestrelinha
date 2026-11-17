# J-02 · Chegar à página do item destacado pelo menu do celular

**Valor:** a cliente reconhece de relance o item destacado (ícone e cor) e chega à página dele com um toque.
**Persona:** PER-02 Cliente no celular (principal) · —
**Prioridade:** P0
**Critérios de origem:** C-03, C-06
**Charters:** CH-03, CH-05 (CFR) · **TC:** TC-JOURNEY-002, TC-FUNC-010

## Entrada

| Origem                                                   | URL / caminho        | Estado de partida                |
| -------------------------------------------------------- | -------------------- | -------------------------------- |
| direta | `http://localhost:8082/` | anônima, 390 × 844; o menu como CH-01 e CH-02 o deixaram (itens A–D) |

## Passos

| #  | A persona…        | Deve ver                          | Em até | Fricção prevista            | TC          |
| -- | ----------------- | --------------------------------- | ------ | --------------------------- | ----------- |
| 1  | toca no menu (hambúrguer) | a folha abre com os itens principais | 3 s | — | TC-JOURNEY-002 |
| 2  | procura o item A | a Etiqueta ao lado do rótulo, o rótulo em `#8A5A2B` sobre o branco | 5 s | rótulo colorido lido como aviso | TC-FUNC-010 |
| 3  | toca no item A | chega à página do item | 5 s | alvo de toque pequeno | TC-JOURNEY-002 |
| 4  | volta e abre o item B (com submenu) | o Presente e o rótulo em `#8A5A2B`, aberto e fechado; o chevron marca o aberto; os filhos e o "ver tudo" na cor de hoje | 10 s | não percebe que abre | TC-FUNC-010 |

**Tempo total esperado:** 23 s — dentro da paciência da persona (30 s).

## Objetivo

- **Observável:** a página do item A aberta, alcançada pelo menu do celular.
- **Efeitos colaterais:** —

## Saída

- **Natural:** a cliente navega na página que abriu.

## Desvios e abandono

| Ramo  | No passo | Quando                                  | A persona…                       | Deve acontecer                     | TC   |
| ----- | -------- | --------------------------------------- | -------------------------------- | ---------------------------------- | ---- |
| J-02a | 4 | abre o acordeão do item B e desiste | fecha a folha pelo voltar do navegador e a reabre | a folha volta coerente, o rótulo de B segue na cor da lista, nada fica preso aberto | TC-FUNC-010 |

## Fronteiras

Lê o documento `store_settings.menu` gravado pelo painel (via `packages/core`).

## Modos de falha

- a folha desenha o rótulo na cor da barra (superfície trocada) ou sem cor
- o ícone do sistema não aparece (chave lida como desconhecida)
