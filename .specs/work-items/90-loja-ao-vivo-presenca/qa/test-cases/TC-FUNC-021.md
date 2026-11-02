## TC-FUNC-021: Os números se renovam sozinhos com o app na frente, e o puxar para atualizar relê na hora

**Tipo:** functional
**Prioridade:** P1
**Origem:** LAV-05
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-01, passo 3; J-06, passos 1 e 4
**Charter:** CH-06
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** contagem de leituras por janela de tempo

### Objetivo

A Adri deixa o celular aberto na bancada e o número se mexe sem ela tocar; quando tem pressa, puxa a tela.

### Pré-condições

- Conta: `admin-atelie`
- Massa: ambiente do CH-01
- Estado de partida: Início, com o app em primeiro plano

### Condições reais

as da persona

### Passos

1. Fica 2 min no Início sem tocar, contando as leituras do cartão
   - **Esperado:** uma ao montar e uma a cada ~30 s
2. Puxa para atualizar no Início
   - **Esperado:** o cartão relê na hora (junto das outras leituras do Início)
3. Abre a Loja ao vivo e fica 1 min
   - **Esperado:** uma leitura a cada ~15 s; a linha "Atualizado agora" logo depois de cada uma, e "Atualizado há {s} s" contando
4. Puxa para atualizar na Loja ao vivo
   - **Esperado:** as duas leituras (ao vivo e Acessos) relidas; "Atualizado agora"

### Esperado e fonte

30 s no cartão, 15 s na tela, puxar relê, frescor pela chegada da resposta — fonte: PRD LAV-05, §5.2 (cabeçalho); spec D-14

### Variações

| Variação                    | Ação                                    | Esperado                        |
| --------------------------- | --------------------------------------- | ------------------------------- |
| uma cliente entra            | uma cliente pousa durante o passo 3      | o número muda na leitura seguinte, sem tocar |
