## TC-FUNC-003: O número grande da Loja ao vivo é o das pessoas dos últimos 5 minutos, e a barra de agora é igual a ele

**Tipo:** functional
**Prioridade:** P0
**Origem:** LAV-10, LAV-11, LAV-12
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-01, passo 5
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** a igualdade número × barra de agora é o coração do bloco A; a forma das barras se mede pela altura relativa

### Objetivo

A Adri confia no gráfico só se a barra de agora disser o mesmo que o número grande.

### Pré-condições

- Conta: `admin-atelie`
- Massa: ambiente do CH-01; clientes que entram em minutos diferentes
- Estado de partida: `/ao-vivo`

### Condições reais

as da persona

### Passos

1. Com 1 cliente presente, lê o bloco "Agora na loja"
   - **Esperado:** cartão escuro; número 1 em dourado; "pessoa nos últimos 5 minutos"
2. Conta as barras do gráfico e lê as legendas
   - **Esperado:** 30 barras; "30 min atrás" à esquerda e "agora" à direita; a última dourada
3. Entra uma segunda cliente; espera a leitura
   - **Esperado:** número 2, "pessoas nos últimos 5 minutos"; a barra de agora a mais alta, proporcional a 2; as barras de antes da entrada da primeira cliente no piso
4. Uma cliente fecha a aba; espera 6 min
   - **Esperado:** número 1; a barra de agora volta à altura de 1; as barras dos minutos em que havia 2 continuam mais altas

### Esperado e fonte

Número dourado sobre o escuro; 30 barras de minuto; barra de agora = número grande; janela de 5 min — fonte: PRD LAV-10, LAV-11, LAV-12; spec D-04

### Variações

| Variação           | Ação                     | Esperado                                    |
| ------------------ | ------------------------ | ------------------------------------------- |
| ninguém na loja     | todas as clientes saem   | número 0 ou a frase de vazio; barras no piso, o gráfico continua visível |
