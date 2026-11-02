## TC-FUNC-028: A variação contra o período anterior aparece nos quatro números, verde na alta e cinza na queda

**Tipo:** functional
**Prioridade:** P1
**Origem:** LAV-51
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-03, passo 5
**Charter:** CH-05
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** depende de massa de duas semanas com o marco de medição anterior; sem ela, `blocked` (massa)

### Objetivo

A Adri sabe se a semana vai melhor ou pior que a anterior, sem a queda gritar em vermelho.

### Pré-condições

- Conta: `admin-atelie`
- Massa: visitas, sacolas e vendas desde a segunda passada; o marco de início da medição anterior à semana passada; números escolhidos para dar uma alta (Visitas) e uma queda (Vendas)
- Estado de partida: Acessos

### Condições reais

as da persona

### Passos

1. Lê a Semana
   - **Esperado:** nos quatro números, "+N% vs semana anterior" ou "−N% vs semana anterior"; a comparação é de segunda até a hora completa atual contra a semana anterior de segunda até o mesmo dia e a mesma hora
2. Confere as cores
   - **Esperado:** a alta em verde; a queda em cinza (o tom secundário do texto); nunca vermelho
3. Lê Hoje
   - **Esperado:** "vs ontem" nos números; em "Com sacola", contra ontem até a mesma hora completa

### Esperado e fonte

Variação até o mesmo ponto, nos quatro números, verde/cinza, nunca vermelho — fonte: PRD LAV-51

### Variações

| Variação         | Ação                          | Esperado                       |
| ---------------- | ----------------------------- | ------------------------------ |
| Ontem            | troca para Ontem              | a variação "vs anteontem" segue a régua de Visitas (Fase 1) |
| empate (0 %)      | números iguais às da semana anterior | a variação de 0 %, sem vermelho |
