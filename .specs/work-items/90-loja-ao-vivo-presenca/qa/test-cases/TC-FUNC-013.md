## TC-FUNC-013: "No celular" diz quantas das pessoas na loja usam celular, e o resto pelo computador ou tablet

**Tipo:** functional
**Prioridade:** P1
**Origem:** LAV-45
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-02, passo 2
**Charter:** CH-04
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** o aparelho se controla pelo user agent do contexto da loja

### Objetivo

A Adri confirma que a loja é vista no celular, como ela supõe.

### Pré-condições

- Conta: `admin-atelie`
- Massa: ambiente do CH-01; contextos com UA de iPhone, de iPad e de computador
- Estado de partida: `/ao-vivo`, ninguém na loja

### Condições reais

as da persona

### Passos

1. Duas clientes com UA de iPhone
   - **Esperado:** "2 de 2"; sem a linha "o resto pelo computador ou tablet"
2. Entra uma com UA de computador e uma com UA de iPad
   - **Esperado:** "2 de 4" e "o resto pelo computador ou tablet"
3. Confere o bloco
   - **Esperado:** ocupa a linha inteira (sem célula de Cidades ao lado)
4. Todas saem
   - **Esperado:** "Ninguém na loja agora."

### Esperado e fonte

"{m} de {n}", a segunda linha só quando nem todos estão no celular, vazio com a frase — fonte: PRD LAV-45; spec D-19

### Variações

| Variação        | Ação                 | Esperado      |
| --------------- | -------------------- | ------------- |
| Android Chrome   | UA de Android Chrome | conta celular |
