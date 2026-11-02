## TC-REG-001: Com o aviso de presença saindo a cada minuto, a visita do dia continua contada uma vez

**Tipo:** regression
**Prioridade:** P1
**Origem:** exploratório — o aviso de presença passa pela mesma function e pelo mesmo endereço da visita do dia (feature 71)
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-03, passo 1
**Charter:** CH-05
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** fronteira loja → function `visit` → banco

### Objetivo

Visitas é o número que a Adri já usava; a presença nova não pode inflá-lo nem derrubá-lo.

### Pré-condições

- Conta: `admin-atelie`; uma cliente `anonima` nova com estatística aceita
- Massa: ambiente do CH-01; Visitas de Hoje anotado
- Estado de partida: Início

### Condições reais

as da persona

### Passos

1. A cliente nova navega por 10 páginas em 5 min, mudando a sacola
   - **Esperado:** Visitas de Hoje sobe exatamente 1, na faixa do Início e em Acessos
2. A cliente recarrega a loja e volta mais tarde no mesmo dia
   - **Esperado:** Visitas não sobe de novo

### O que mudou

A function `visit` ganhou a ação do aviso de presença, com limite próprio por IP (spec D-05).

### Pontos de contato com outras jornadas

J-01 (o mesmo navegador conta na presença) e o Dashboard do painel (TC-REG-002).

### Esperado e fonte

Uma visita por navegador por dia, como antes — fonte: PRD §2 (contador de visitas), §8; `apps/store/CLAUDE.md` › O contador de visitas únicas

### Variações

| Variação         | Ação                               | Esperado          |
| ---------------- | ---------------------------------- | ----------------- |
| muitos avisos     | a cliente fica 10 min com a aba visível | Visitas +1 só    |
