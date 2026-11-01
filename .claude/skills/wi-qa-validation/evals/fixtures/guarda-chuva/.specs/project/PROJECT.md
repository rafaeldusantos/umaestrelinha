# PROJECT — Acme Platform

## Topologia

- **Forma:** multi-repo
- **Onde estão os repositórios:** submódulos do guarda-chuva `acme-pd` — `.gitmodules`
- **Conferência de fronteira entre repositórios:** sim

## Ambiente local

| Repositório | O que é | Conferir que está de pé | Aplicar migration nele |
| ----------- | ------- | ----------------------- | ---------------------- |
| acme-web | front React em http://localhost:5173 (`npm run dev`) | `curl -sf http://localhost:5173` | não se aplica |
| acme-api | API Node em http://localhost:3001 (`npm run dev`) com Postgres no `docker compose` | `curl -sf http://localhost:3001/health` | `npm run migrate` |
