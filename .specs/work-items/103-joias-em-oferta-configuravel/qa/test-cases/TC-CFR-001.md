## TC-CFR-001: O editor do bloco é usável em 390 px com a fonte a 200 % e pelo teclado, com rótulos e recusas anunciadas

**Tipo:** cfr
**Prioridade:** P1
**Origem:** RNF-04, RNF-07, RNF-08
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-01 (refeita como auditoria)
**Charter:** CH-07
**Situação:** ativo
**Automação:** target `manual` — status `na`
**Spec:** —
**Nota:** acessibilidade e compatibilidade pela árvore de acessibilidade e pelo teclado

### Objetivo

A dona consegue configurar o bloco pelo celular com a fonte grande, ou só pelo teclado, sem perder campo nem
recusa.

### Pré-condições

- Conta: `admin-loja`
- Massa: B-1 com "Dia das Mães" (religada pelo CH-06)
- Estado de partida: editor de B-1

### Condições reais

| Dimensão    | Valor                                            |
| ----------- | ------------------------------------------------ |
| Dispositivo | celular (390 × 844), fonte a 200 %; depois desktop (1440 × 900) |
| Rede        | rápida                                           |
| Locale      | pt-BR                                            |
| Modalidade  | só-teclado no passo 2                            |

### Categoria

Acessibilidade · Compatibilidade · Usabilidade (o editor não desenha vitrine)

### Metas

| Observável | Alvo | Aceitável |
| ---------- | ---- | --------- |
| rolagem horizontal do editor em 390 px a 200 % | nenhuma | nenhuma |
| campos e seletor com nome acessível (snapshot) | todos | todos |
| recusa anunciada | `alert` ou região viva, com o motivo | — |
| subir/descer pelo teclado | alcançável e com nome | — |
| o editor mostra cartão, foto ou fileira da loja | não | não |

### Passos

1. Em 390 × 844 com fonte a 200 %, percorrer o editor até o Salvar
   - **Esperado:** todo campo, o seletor, a lista e o Salvar alcançáveis; nada corta; sem rolagem horizontal
2. Só pelo teclado: Tab do título ao Salvar; mover uma peça com subir/descer; título com 61 caracteres e Salvar
   - **Esperado:** ordem de Tab segue a visual; foco visível; a recusa é anunciada (alerta) com o motivo
3. Ler o snapshot de acessibilidade do editor
   - **Esperado:** título, descrição e seletor de campanha com rótulo; a lista é lista (posição, nome, remover) —
     não um desenho de vitrine
4. Devolver o título ao original e salvar

### Esperado e fonte

Em 390 px o editor não rola na horizontal e continua usável a 200 %; campos e seletor com rótulo acessível; recusa
como alerta; o editor não desenha vitrine — fonte: PRD RNF-04, RNF-07, RNF-08

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| fonte a 130 % | repetir o passo 1 | o mesmo |
| movimento reduzido | salvar e ver a linha que acende | sem animação decorativa |
