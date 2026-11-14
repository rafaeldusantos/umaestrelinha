## TC-FUNC-007: A loja aberta com o perfil anterior não muda de cor enquanto a página está parada

**Tipo:** functional
**Prioridade:** P1
**Origem:** RN-04
**Autor:** dev
**Persona:** PER-03 Rodrigo
**Jornada:** J-03, ramo J-03a
**Charter:** CH-03
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** exige o documento interceptado com `data-perfil="padrao"` (ver Ambiente); determinístico

### Objetivo

Uma página que troca de cor sozinha diante de quem está lendo parece defeito — numa loja memorial, pesa mais.

### Pré-condições

- Conta: `anonima`
- Massa: perfil salvo = Black Friday (S1); documento da Home e de um produto interceptados com `data-perfil="padrao"`
- Estado de partida: Home aberta com a rota ativa; sonda lida (`dataset.perfil` = `padrao`, cabeçalho `#283A4A`)

### Condições reais

As da persona (390 × 844, toque).

### Passos

1. Deixa a página parada 60 s
   - **Esperado:** atributo `padrao`; cabeçalho `#283A4A`
2. Tira o foco da aba (abre outra) e volta
   - **Esperado:** o mesmo
3. Rola até o rodapé e abre a sacola (sem trocar de rota)
   - **Esperado:** o mesmo

### Esperado e fonte

Se a página veio do cache com o perfil anterior, continua nele; a cor nunca muda com a página parada — fonte: PRD
RN-04; spec R2.

### Variações

| Variação                    | Ação                                   | Esperado                         |
| --------------------------- | -------------------------------------- | -------------------------------- |
| rede cai e volta            | offline 10 s e online, parado          | sem mudança de cor               |
| girar a tela                | viewport 844 × 390 e volta             | sem mudança de cor               |
| começar num produto         | documento do produto interceptado      | o mesmo comportamento            |
