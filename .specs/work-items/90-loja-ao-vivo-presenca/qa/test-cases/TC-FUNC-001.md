## TC-FUNC-001: O cartão do Início diz quantas pessoas estão na loja e o que fazem, sem as partes zeradas

**Tipo:** functional
**Prioridade:** P0
**Origem:** LAV-02, LAV-03
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-01, passos 1–2
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** texto e plural determinísticos com 0, 1, 2 e 3 clientes em estados controlados

### Objetivo

A Adri lê em um olhar quantas pessoas e quantas com sacola ou no checkout, sem frase com "0 no checkout"
poluindo a linha.

### Pré-condições

- Conta: `admin-atelie`; clientes `anonima` com estatística aceita (até 3 contextos)
- Massa: ambiente do CH-01
- Estado de partida: Início aberto

### Condições reais

as da persona

### Passos

1. Com uma cliente olhando uma joia, espera o cartão atualizar
   - **Esperado:** eyebrow "Agora na loja" com ponto dourado parado; "1 pessoa"; nenhuma linha do funil (as duas partes são zero); 15 barras, a última dourada
2. A cliente põe a joia na sacola
   - **Esperado:** linha "1 com joia na sacola"; nada de "no checkout"
3. Uma segunda cliente põe duas joias na sacola
   - **Esperado:** "2 pessoas"; "2 com joias na sacola"
4. A primeira vai ao checkout
   - **Esperado:** "1 com joia na sacola · 1 no checkout"
5. As duas fecham a aba (esperar até 5 min)
   - **Esperado:** "Ninguém na loja agora", com o gráfico visível

### Esperado e fonte

Número, plural e linha do funil com cada parte sumindo no zero — fonte: PRD LAV-02, LAV-03, §9 ("com joias" a partir de 2; "1 pessoa" e "{n} pessoas")

### Variações

| Variação            | Ação                       | Esperado                                  |
| ------------------- | -------------------------- | ----------------------------------------- |
| só gente no checkout | 1 cliente no checkout      | "1 no checkout", sem "com joia na sacola" |
| ponto dourado        | observa 10 s               | o ponto não pulsa                         |
