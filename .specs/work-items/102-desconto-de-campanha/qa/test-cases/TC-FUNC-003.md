## TC-FUNC-003: Na aba de preço da peça, a dona escolhe o percentual da campanha e vê o preço de cada variação

**Tipo:** functional
**Prioridade:** P0
**Origem:** CA-01, CA-05, CA-06
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-01, passos 4–5
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** é o único jeito de marcar uma peça; pedido de automação E2E

### Objetivo

A dona marca o desconto da peça na própria tela do produto e vê, antes de salvar, quanto cada variação vai custar
na loja — sem mexer no preço cadastrado.

### Pré-condições

- Conta: `admin-loja`
- Massa: Black Friday em vigência; M-A, M-B, M-C, M-D sem marcação
- Estado de partida: `/admin/produtos/<M-A>/editar`, aba **Preço e estoque**

### Condições reais

as da persona

### Passos

1. Olha abaixo do cartão Preço
   - **Esperado:** o cartão "Black Friday" com a pílula "Em vigência", "13/11 a 30/11/2026", "Desconto desta peça na campanha. Vale para todas as variações." e o grupo "Desconto na Black Friday": **Nenhum · 10% · 15% · 20%**, com "Nenhum" escolhido
2. Escolhe 20 %
   - **Esperado:** o preço base riscado → o preço com 20 % (arredondado ao centavo, meio centavo para cima) e o selo em linha; a tabela "Variação / Preço / Na campanha"; a nota "A loja mostra este preço até 30/11 às 23:59. O preço cadastrado não muda, e cupom não vale nesta peça durante a campanha."
3. Salva
   - **Esperado:** confirmação de salvo; o campo de preço cadastrado com o mesmo valor de antes
4. Repete com M-B (15 %): olha a tabela por variação
   - **Esperado:** cada variação com 15 % sobre o próprio preço
5. Repete com M-C (10 %): olha a variação com "de" maior que o preço
   - **Esperado:** "Na campanha" = o **menor** entre o "por" de hoje e o "de" com 10 % (ex.: "de" R$ 259,90 / por R$ 239,90 ⇒ R$ 233,91, nunca R$ 215,91)
6. Marca M-D com 20 % e salva

### Esperado e fonte

"Black Friday: Nenhum · 10% · 15% · 20%" e a prévia por variação — fonte: PRD CA-01, CA-05, CA-06, UC-03, RN-06;
`spec.md` › Painel · Produto · campo da campanha.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| exemplo do PRD | peça de R$ 209,90 com 20 %, se houver | R$ 209,90 riscado → R$ 167,92 |
| sair sem salvar | escolhe 20 % e sai da página | aviso de alterações não salvas; nada gravado |
| voltar ao mesmo | escolhe 15 % e volta a 20 % (o gravado) e salva | nada muda |
| celular | a aba em 390 × 844 | a coluna Preço some da tabela; botões de percentual com alvo ≥ 44 px |
| peça cujo "de/por" já é menor | marca 10 % numa variação com "por" bem abaixo do "de" | "Na campanha" igual ao "por" de hoje (a campanha não baixa o preço) |
