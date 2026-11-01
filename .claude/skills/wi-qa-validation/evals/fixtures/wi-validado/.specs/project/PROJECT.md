# PROJECT — Acme Pedidos

## Topologia

- **Forma:** mono-repo
- **Onde estão os repositórios:** este diretório

## Ambiente local

| Repositório | O que é | Conferir que está de pé | Aplicar migration nele |
| ----------- | ------- | ----------------------- | ---------------------- |
| acme-pedidos | app Next.js em http://localhost:3000 (`npm run dev`) com Postgres no `docker compose` | `curl -sf http://localhost:3000/api/health` | `npm run migrate` |

## Comandos de verificação

`npm run build` · `npm run lint` · `npm test`

## Fontes de design

Nenhuma fonte `fixo` cadastrada — o protótipo de cada Work Item vem nos insumos dele.
