## TC-FUNC-017: O cupom acumula com o desconto casado e só se diz que algo ficou de fora quando ele de fato descontaria

**Tipo:** functional
**Prioridade:** P0
**Origem:** CA-03.6
**Autor:** dev
**Persona:** PER-04 Helena
**Jornada:** J-03, passo 3 e ramo J-03b
**Charter:** CH-03
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** a frase de "ficou de fora" é a de sempre da loja; confere-se quando ela aparece, não o texto

### Objetivo

Helena usa o cupom sem perder o desconto do Compre Junto, e não lê um aviso falso.

### Pré-condições

- Conta: `cliente-loja`
- Massa: M-01; cupom de 15 % e cupom de frete grátis (M-04); uma promoção concorrente com o cupom
- Estado de partida: P e a corrente avulsa na sacola

### Condições reais

As da persona.

### Passos

1. Aplicar o cupom de 15 %
   - **Esperado:** a linha "Desconto do Compre Junto" continua; o cupom = 15 % do subtotal já com o desconto casado
2. Com uma promoção ativa em outra peça da sacola que concorre com o cupom, aplicar o cupom
   - **Esperado:** a loja diz qual ficou de fora só se ele desconta alguma coisa além do desconto casado
3. Trocar pelo cupom de frete grátis
   - **Esperado:** frete zerado; o desconto casado continua

### Esperado e fonte

Fonte: `prd.md` CA-03.6 (Q-03, o cupom acumula); cenários preliminares do PRD (cupom de 15 % P0; frete grátis P1).

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| promoção só na corrente com casado maior | o casado vence a promoção | nenhum aviso de promoção descartada (ela não descontaria) |
| tirar a joia com o cupom | — | o casado sai; o cupom recalcula sobre o subtotal novo |
