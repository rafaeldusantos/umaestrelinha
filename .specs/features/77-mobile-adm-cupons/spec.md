# 77 — mobile-adm: Cupons

> **RASCUNHO**: escopo e histórias P1 do programa mobile-adm (`AD-056`). Ao abrir a feature, rodar
> o Specify completo (varredura das dimensões implícitas, portão de fechamento) e o Design. Roteiro e
> decisões comuns: `.specs/features/72-mobile-adm-fundacao/spec.md`. Depende da `72`.
> Telas: Claude Design `a780eec8-…`, `Ateliê Admin.dc.html`. — aba **Descontos** (cupons) e tela **Cupom**.

## Problem Statement
Cupom é decisão de momento ("vou mandar um código para essa cliente agora"). Hoje ela depende do computador para isso.

## Escopo
- Lista com o estado de cada cupom (*Ativo*, *Agendado*, *Expirado*, *Esgotado*, *Pausado*), usos e validade.
- Criar e editar: código (com **Gerar**, sempre em maiúsculas, "É o texto que a cliente digita no
  checkout"), "Como a cliente vê", tipo (percentual · valor fixo · frete grátis), valor, pedido mínimo,
  limite de usos, só na primeira compra, validade ("Deixe em branco para valer sem prazo"), ativo.
- **Duplicar** (a regra da cópia, `DSC-08`), **pausar** e **excluir** com a confirmação do protótipo
  ("Pedidos que já usaram o cupom mantêm o desconto… prefira desativar").

## Regras que sobem para `core`
`features/coupon-form/model/schema.ts` (o `zod`, `emptyCouponForm`, a cópia) e o estado derivado do
cupom. O `dateOnly` (`shared/lib`) vai junto. **Validade é dia de Brasília**: `valid_until` vale até
o fim do dia em Brasília, com o mesmo dono do dia do `AD-055`, nunca `new Date()` do aparelho.

## P1 — critérios
1. WHEN ela salva um código que já existe THEN a tela SHALL dizer "Já existe um cupom com esse código" e não gravar. A prova é contra o banco (índice único), não só a validação da tela. (`MCU-01`)
2. WHEN ela digita o código em minúsculas THEN ele SHALL ser gravado em maiúsculas. (`MCU-02`)
3. WHEN o tipo é frete grátis THEN o campo valor SHALL sumir e gravar 0. (`MCU-03`)
4. WHEN ela duplica THEN o formulário SHALL abrir com a cópia definida por `DSC-08` (código vazio, usos zerados). (`MCU-04`)
5. WHEN ela exclui e confirma THEN o cupom SHALL deixar de existir, e os pedidos que o usaram SHALL manter o desconto. (`MCU-05`)
6. WHEN a validade terminou ontem em Brasília THEN o estado SHALL ser *Expirado*, independente do fuso do celular. (`MCU-06`)
7. WHEN a gravação é feita THEN ela SHALL ser provada por probe HTTP contra o banco local (`AD-012`). (`MCU-07`)

## Perguntas abertas
- Compartilhar o código pelo WhatsApp direto da tela do cupom? (Não está no protótipo.)
