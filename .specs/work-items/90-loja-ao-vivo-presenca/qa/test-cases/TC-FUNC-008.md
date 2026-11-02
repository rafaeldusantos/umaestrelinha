## TC-FUNC-008: A Loja ao vivo avisa que conta só quem aceitou cookies de estatística

**Tipo:** functional
**Prioridade:** P2
**Origem:** R-01
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-02
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** texto literal do PRD §7

### Objetivo

A Adri não confunde "ninguém na loja" com "ninguém que aceitou ser contado".

### Pré-condições

- Conta: `admin-atelie`
- Massa: nenhuma
- Estado de partida: `/ao-vivo`

### Condições reais

as da persona

### Passos

1. Procura a nota na tela
   - **Esperado:** em letra pequena, "Conta só quem aceitou cookies de estatística."
2. Com ninguém na loja
   - **Esperado:** a nota continua lá

### Esperado e fonte

A nota literal, em letra pequena — fonte: PRD §7 (primeiro item)

### Variações

| Variação        | Ação            | Esperado        |
| --------------- | --------------- | --------------- |
| fonte 200 %     | lê a nota       | inteira, sem cortar |
