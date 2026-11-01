# Acme Platform

## Visão

App de pedidos da Acme para lojistas.

## System Instructions (fonte da intenção)

| Dimensão     | Onde está               |
| ------------ | ----------------------- |
| ARCHITECTURE | `CLAUDE.md`             |
| TESTING      | `CLAUDE.md` §Comandos   |
| CODE STYLE   | `CLAUDE.md`             |
| INTEGRATIONS | `supabase/config.toml`  |
| CONCERNS     | nada                    |

## Topologia

- **Forma:** repositório único
- **Onde estão os repositórios:** o próprio repositório
- **Conferência de fronteira entre repositórios:** não

## Fontes de design

nenhuma

## Comandos de verificação

| Repositório | Tipos | Um arquivo de teste | Verificação mínima | Origem |
| ----------- | ----- | ------------------- | ------------------ | ------ |
| . | `instruções` | `instruções` | `instruções` | `instruções §Comandos` (`CLAUDE.md`) |

## Ambiente local

| Repositório | O que é | Conferir que está de pé | Aplicar migration nele |
| ----------- | ------- | ----------------------- | ---------------------- |
| . | Supabase local (`supabase start`, mantido pelo humano) | `supabase status` | `supabase migration up --local` |

## Escopo

**Inclui:** pedidos e cancelamento.
**Fora:** faturamento.
