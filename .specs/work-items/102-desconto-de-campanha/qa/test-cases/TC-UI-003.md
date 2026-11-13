## TC-UI-003: O selo cabe inteiro nos cartões de 173 e 220 px no celular e no computador, também com fonte a 200 %

**Tipo:** ui
**Prioridade:** P1
**Origem:** CA-15
**Autor:** dev
**Persona:** PER-04 Rosa
**Jornada:** J-03, passos 1–3
**Charter:** CH-08
**Situação:** ativo
**Automação:** target `manual` — status `na`
**Spec:** —
**Nota:** medida de layout em navegador real — a Validation provou só a forma

### Objetivo

Quem lê com a fonte grande vê o texto da campanha e o percentual inteiros, e a página não rola de lado.

### Pré-condições

- Conta: `anonima`
- Massa: "Dia das Mães" em vigência (texto "DIA DAS MÃES", 12 caracteres); M-A e M-D marcadas
- Estado de partida: `/ofertas`

### Condições reais

| Dimensão    | Valor |
| ----------- | ----- |
| Dispositivo | 390 × 844 e 1440 × 900; 768 × 1024 de passagem |
| Modalidade  | toque; fonte a 200 % |

### Passos

1. Em 390 × 844, mede o cartão (≈173 px) e a faixa
   - **Esperado:** "DIA DAS MÃES" e "−15%" inteiros, sem quebrar linha; a largura do corpo da página igual à da tela (sem rolagem horizontal)
2. Dobra a fonte da raiz (200 %)
   - **Esperado:** o percentual nunca cortado; o texto da campanha pode cortar no fim (sem reticências), mas o percentual fica inteiro; sem rolagem horizontal
3. Em 1440 × 900 (cartão de ≈220 px), repete os dois
   - **Esperado:** o mesmo
4. Repete na Home (bloco e fileira) e na página do produto (selo em linha)
   - **Esperado:** o mesmo

### Esperado e fonte

Selo inteiro no cartão de 173 px; fonte a 200 % sem cortar o percentual; nenhuma rolagem horizontal — fonte: PRD
CA-15, RN-11, RN-15; `spec.md` › Selo · a faixa ("o excesso é cortado sem reticências").

### Protótipo e tela

`Black Friday - Selo v2.html` › `Cartao` 173 e 220 px

### Propriedades a comparar

largura do cartão, do bloco do percentual e do texto; `scrollWidth` do corpo × largura da tela

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| viewport mínima | 320 × 568 | sem rolagem horizontal; percentual inteiro |
| texto de 14 caracteres | (se a campanha tiver) um texto do selo com 14 caracteres | inteiro no cartão de 173 px com fonte normal |
