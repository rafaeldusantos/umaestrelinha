# Descoberta — ACME-43 Lista de desejos

## Diagnóstico

- **Existe** — nada no domínio: nenhuma tabela, rota ou tela de lista de desejos (procurado por `desejo`, `wishlist`, `favorit` em `src/`)
- **Muda** — nada
- **Nasce** — modelo da lista, rotas de adicionar/remover, tela da lista

## Rascunho de PRD

(gravado em `prd.md`)

## Premissas

- P-01 — a lista é por cliente logado, não por sessão anônima `[conhecimento]` · alternativa: também para visitante, guardada no navegador
- P-02 — um produto entra uma vez só na lista `[conhecimento]` · alternativa: permitir quantidade

## Perguntas

- Q-01 — A lista avisa quando o preço do produto cai? · sugestões: sim, por e-mail · não nesta versão · Muda: UC-03 entra ou vai a Fora do escopo

## Incertezas

nada
