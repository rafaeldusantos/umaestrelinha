# PRD — Exportar relatório de pedidos

## Problema

O gerente da loja copia os pedidos à mão para uma planilha no fim de cada mês.

## Usuários

- Gerente da loja (perfil `gerente`)
- Atendente (perfil `atendente`) — não exporta

## Casos de uso e critérios de aceite

- UC-01 Exportar pedidos de um período
  - P1-AC01: na tela de pedidos, o gerente escolhe um período e baixa um CSV com os pedidos dele
  - P1-AC02: o CSV traz número, data, cliente, total e status, com acentos legíveis no Excel
  - P1-AC03: o atendente não vê o botão "Exportar"
- UC-02 Período sem pedidos
  - P1-AC04: período sem pedidos avisa na tela e não baixa arquivo vazio

## Expectativas de UI/UX

- Protótipo: https://www.figma.com/design/AbC123xyz/Acme-Pedidos?node-id=42-7 (tela "Pedidos — exportar")

## Fora do escopo

- Exportar em XLSX ou PDF
- Agendar a exportação

