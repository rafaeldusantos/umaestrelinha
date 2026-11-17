## TC-FUNC-007: Título acima de 60, descrição acima de 160 ou mais de 12 peças não gravam, e a tela diz o motivo e o limite

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-01.6, CA-03.3, RNF-06, RNF-08
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-01, ramo J-01a
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** valor-limite determinístico; a 13ª peça exige 13 marcadas em C-VIG

### Objetivo

A dona não grava um bloco que não cabe no celular nem uma fileira maior que o teto, e sabe exatamente o que
ajustar.

### Pré-condições

- Conta: `admin-loja`
- Massa: B-1 salvo pelo TC-FUNC-006; C-VIG com 13 ou mais peças marcadas (P-1..P-10 e as do manifesto)
- Estado de partida: editor de B-1 aberto, sem alteração

### Condições reais

as da persona

### Passos

1. Título com exatamente 60 caracteres
   - **Esperado:** o contador mostra o limite; nada recusa
2. Título com 61 caracteres e Salvar
   - **Esperado:** não grava; a recusa diz o motivo e o número 60, anunciada como alerta; o título digitado
     continua no campo (sem ser cortado)
3. Voltar o título a 60; descrição com 161 caracteres e Salvar
   - **Esperado:** não grava; recusa com o motivo e o número 160
4. Voltar a descrição; acrescentar peças até a 13ª e tentar salvar
   - **Esperado:** a 13ª não fica gravada; a tela diz o motivo e o número 12 — na busca, ao tentar acrescentar, ou
     na recusa ao salvar
5. Cancelar
   - **Esperado:** B-1 volta ao que estava salvo

### Esperado e fonte

Título até 60, descrição até 160, até 12 peças; acima, salvar é recusado com o motivo e o número; a recusa é
anunciada como alerta — fonte: PRD CA-01.6, CA-03.3, RNF-06, RNF-08; spec.md (recusa "sem aparar")

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| colar texto longo | colar 200 caracteres no título | o campo não corta em silêncio; salvar recusa com o número (ver 🟡 do plano) |
| emoji e acento | título de 60 com acentos e um emoji | o contador e a recusa contam como a dona espera; anotar se divergem |
