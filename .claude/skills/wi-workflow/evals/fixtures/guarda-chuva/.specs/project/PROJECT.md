# PROJECT — Acme Platform

## Visão

Plataforma de pedidos da Acme para lojistas.

## System Instructions (fonte da intenção)

| Dimensão     | Onde está                                   |
| ------------ | ------------------------------------------- |
| ARCHITECTURE | `acme-web/AGENTS.md` · `acme-api/AGENTS.md` |
| TESTING      | `acme-web/AGENTS.md` §Testes · `acme-api/AGENTS.md` §Testes |
| CODE STYLE   | idem                                        |
| INTEGRATIONS | `acme-api/AGENTS.md` §Integrações           |
| CONCERNS     | nada                                        |

## Topologia

- **Forma:** multi-repo
- **Onde estão os repositórios:** submódulos do guarda-chuva `acme-pd` — `.gitmodules`
- **Conferência de fronteira entre repositórios:** sim

## Fontes de design

nenhuma

## Comandos de verificação

| Repositório | Tipos | Um arquivo de teste | Verificação mínima | Origem |
| ----------- | ----- | ------------------- | ------------------ | ------ |
| acme-web | `npx tsc --noEmit` | `npx vitest run <arquivo>` | `npm run lint && npx vitest run` | `confirmado pelo humano em 2026-10-01` |
| acme-api | `npx tsc --noEmit` | `npx vitest run <arquivo>` | `npm run lint && npx vitest run` | `confirmado pelo humano em 2026-10-01` |

## Ambiente local

| Repositório | O que é | Conferir que está de pé | Aplicar migration nele |
| ----------- | ------- | ----------------------- | ---------------------- |
| acme-web | front React em http://localhost:5173 (`npm run dev`) | `curl -sf http://localhost:5173` | não se aplica |
| acme-api | API Node em http://localhost:3001 (`npm run dev`) com Postgres no `docker compose` | `curl -sf http://localhost:3001/health` | `npm run migrate` |
