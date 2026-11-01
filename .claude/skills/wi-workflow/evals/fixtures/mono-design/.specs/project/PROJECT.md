# Acme Platform

## Visão

Plataforma de pedidos da Acme para lojistas: catálogo, carrinho e acompanhamento de entrega.

## System Instructions (fonte da intenção)

| Dimensão     | Onde está                |
| ------------ | ------------------------ |
| ARCHITECTURE | `AGENTS.md` §Arquitetura |
| TESTING      | `AGENTS.md` §Testes      |
| CODE STYLE   | `AGENTS.md` §Estilo      |
| INTEGRATIONS | `AGENTS.md` §Integrações |
| CONCERNS     | `AGENTS.md` §Armadilhas  |

## Topologia

- **Forma:** repositório único
- **Onde estão os repositórios:** o próprio repositório
- **Conferência de fronteira entre repositórios:** não

## Fontes de design

| Fonte                            | Localizador                                                            | Mecânica               |
| -------------------------------- | ---------------------------------------------------------------------- | ---------------------- |
| Figma — arquivo de telas da Acme | por Work Item: o link de Figma da seção "Expectativas de UI/UX" do PRD | servidor MCP de design |

> `nenhuma` quando o projeto não tem design a ler. Escrever `nenhuma` é o acordo, e ele não se reconfirma.

## Escopo

**Inclui:** catálogo, carrinho, checkout e acompanhamento de pedido.
**Fora:** gestão de estoque e faturamento.

## Restrições

- nada
