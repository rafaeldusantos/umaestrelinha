## TC-FUNC-015: A corrente acrescentada pelo catálogo recebe o desconto com a joia na sacola, sem a frase de que o desconto volta

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-03.4, CA-03.3
**Autor:** dev
**Persona:** PER-01 Marina
**Jornada:** J-01, passo 4 (variação)
**Charter:** CH-02
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** a frase exata da linha sem a marca "acompanha" não está nas fontes (ver 🟢 do plano); confere-se o "de/por" e a linha do rodapé

### Objetivo

O desconto depende da joia estar no pedido, não do caminho por onde a corrente entrou.

### Pré-condições

- Conta: `anonima`
- Massa: M-01
- Estado de partida: só P na sacola

### Condições reais

As da persona.

### Passos

1. Achar a corrente avulsa pela busca ou pela categoria e pô-la na sacola
   - **Esperado:** a corrente sai com "de/por" (15 %) e a linha "Desconto do Compre Junto" aparece no rodapé
2. Tirar P da sacola
   - **Esperado:** a corrente volta ao preço cheio; **sem** a frase "O desconto de N% volta com o … na sacola." (ela não entrou pelo Compre Junto)
3. Pôr a corrente primeiro e depois P
   - **Esperado:** o desconto aparece quando P entra

### Esperado e fonte

Fonte: `prd.md` CA-03.4 (presença), CA-03.3 (a frase só para a peça que entrou pelo Compre Junto).

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| corrente da lista pelo catálogo | repetir com uma corrente da lista | o desconto de 10 % |
