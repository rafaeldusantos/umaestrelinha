# QA · 65 · Convite para o Instagram na Home

A árvore viva de QA desta feature. O caminho vem de `.specs/specflow.yaml › qa.docs_path`
(`.specs/features/<NN-slug>/qa`): a QA de cada feature mora na pasta dela. Cada rodada acrescenta
coisas a esta árvore e nada é apagado.

## Códigos de área

| Código | Área |
|---|---|
| `IG` | O convite para o Instagram na Home, e o link do Instagram no rodapé, que agora usa a mesma constante |

## Pontos de entrada

| Superfície | Como chegar |
|---|---|
| Loja (dev) | `pnpm dev:store` na raiz, e abrir `http://localhost:8082/` |
| Prévia da Home (painel) | `http://localhost:8082/?preview=1` **dentro de um iframe**, a prévia exige os dois |
| Estado limpo | apagar `estrelinha-instagram-invite` e `estrelinha-cookie-consent` do `localStorage` (ou usar uma aba anônima nova) |

O convite não usa banco. A Home precisa do Supabase local de pé (`supabase status`) para as seções
carregarem; sem ele, o convite não abre, porque ele só abre depois de a Home resolver.

## Evidência

Segue a política padrão: `evidence/` fica fora do git (veja o `.gitignore` da raiz). Só entram
capturas de checkpoint e de falha, e os relatórios as citam pelo caminho.

## Contexto da feature

- Plano: `../plan.md`, com os comportamentos C-01 a C-07 e as nove decisões ratificadas
- Tarefa: `../tasks/T01-convite-instagram-na-home.md`
- Revisão: `../reviews/impl-review-T01.md`
- Design: Paper, arquivo "Uma Estrelinha", página "Home · Convite para o Instagram"
