## TC-FUNC-002: O cartão do Início se anuncia com o número de pessoas e abre a Loja ao vivo com um toque

**Tipo:** functional
**Prioridade:** P1
**Origem:** LAV-01
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-01, passo 4
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** nome acessível e área de toque conferíveis pelo snapshot e pela caixa do elemento

### Objetivo

O cartão inteiro é o botão: a Adri toca em qualquer ponto dele, com uma mão, e o leitor de tela diz quantas
pessoas há antes de ela tocar.

### Pré-condições

- Conta: `admin-atelie`
- Massa: 1 cliente presente; depois 3
- Estado de partida: Início

### Condições reais

as da persona

### Passos

1. Lê o nome acessível do cartão com 1 cliente presente
   - **Esperado:** "Agora na loja, 1 pessoa. Abrir loja ao vivo"
2. Com 3 clientes presentes, lê de novo
   - **Esperado:** "Agora na loja, 3 pessoas. Abrir loja ao vivo"
3. Mede o cartão
   - **Esperado:** ocupa a largura inteira do conteúdo e tem altura de pelo menos 44 px
4. Toca no mini gráfico (dentro do cartão)
   - **Esperado:** abre `/ao-vivo`

### Esperado e fonte

Botão de largura inteira, alvo ≥ 44 px, nome acessível com plural, abre `/ao-vivo` — fonte: PRD LAV-01, §9

### Variações

| Variação        | Ação                 | Esperado                                        |
| --------------- | -------------------- | ----------------------------------------------- |
| só teclado       | Tab até o cartão, Enter | foco visível; abre `/ao-vivo`                 |
