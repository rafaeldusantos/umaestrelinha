# Acme Pedidos

## Visão

Serviço de pedidos da Acme.

## System Instructions (fonte da intenção)

| Dimensão     | Onde está              |
| ------------ | ---------------------- |
| ARCHITECTURE | `AGENTS.md`            |
| TESTING      | `AGENTS.md` §Testes    |
| CODE STYLE   | `AGENTS.md`            |
| INTEGRATIONS | nada                   |
| CONCERNS     | nada                   |

## Topologia

- **Forma:** repositório único
- **Onde estão os repositórios:** o próprio repositório
- **Conferência de fronteira entre repositórios:** não

## Fontes de design

nenhuma

## Comandos de verificação

| Repositório | Tipos | Um arquivo de teste | Verificação mínima | Origem |
| ----------- | ----- | ------------------- | ------------------ | ------ |
| . | `instruções` | `instruções` | `instruções` | `instruções §Comandos` (`AGENTS.md`) |

## Ambiente local

| Repositório | O que é | Conferir que está de pé | Aplicar migration nele |
| ----------- | ------- | ----------------------- | ---------------------- |
| . | Postgres via Testcontainers, subido pelo próprio teste | não se aplica — o teste sobe | o próprio teste aplica (Flyway na inicialização) |
