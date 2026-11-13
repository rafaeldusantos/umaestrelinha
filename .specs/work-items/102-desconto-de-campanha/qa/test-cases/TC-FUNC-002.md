## TC-FUNC-002: O cadastro da campanha recusa cada entrada inválida com o motivo, sem gravar

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-02, CA-14
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-02, passo 1 (e J-01a, J-02a)
**Charter:** CH-02
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** cada recusa é determinística e tem texto literal na fonte; pedido de automação E2E

### Objetivo

Nenhuma entrada errada vira uma campanha gravada, e a dona entende, pelo motivo na tela, o que corrigir.

### Pré-condições

- Conta: `admin-loja`
- Massa: Black Friday em vigência (13/11–30/11/2026), do CH-01
- Estado de partida: `/admin/campanhas/nova`

### Condições reais

as da persona

### Passos

1. Põe o fim antes do início no mesmo dia (início 10:00, fim 09:00)
   - **Esperado:** "O fim vem antes do início."; Salvar desligado
2. Tenta acrescentar 0 e depois 80
   - **Esperado:** "Use um número de 1 a 70." nos dois; nenhum dos dois vira pílula
3. Acrescenta 10 e tenta 10 de novo
   - **Esperado:** "10% já está na campanha."
4. Tira todos os percentuais
   - **Esperado:** "Nenhum percentual ainda." e o motivo "Acrescente ao menos um percentual."; Salvar desligado
5. Acrescenta um sexto percentual
   - **Esperado:** "Até 5 percentuais por campanha."
6. Digita 15 caracteres no texto do selo
   - **Esperado:** contador "15 / 14" em vermelho e "O selo cabe até 14 caracteres no cartão do celular. Use uma forma curta do nome."; Salvar desligado
7. Escolhe cores #777777 e #999999
   - **Esperado:** "{x,y:1} Pouca diferença entre as cores: o selo fica difícil de ler. Escolha cores com mais diferença (o mínimo é 4,5:1)." com a razão medida; Salvar desligado
8. Digita um hex inválido (#12GG45)
   - **Esperado:** "Use o formato #RRGGBB nas duas cores."
9. Põe vigência de 25/11 a 05/12, ligada
   - **Esperado:** "A vigência cruza a da campanha “Black Friday” (13/11 a 30/11). Só uma campanha ligada pode valer por vez: mude as datas ou desligue a outra."; Salvar desligado
10. Volta à lista
    - **Esperado:** nenhuma campanha nova gravada

### Esperado e fonte

Cada recusa com o motivo e nada gravado — fonte: PRD CA-02, CA-14, UC-01, RN-02, RN-11, RN-12; `spec.md` ›
Painel · Campanha · nova/editar (frases literais); `implement-log.md` T01 · 10 (frases que o design não dava).

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| combinação pronta | escolhe "Ardósia e ouro" depois do par recusado | a razão verde "Contraste bom para ler o selo."; Salvar volta |
| colar com espaço | cola " #C2A063 " no hex | aceito como #C2A063, ou recusado com o motivo — nunca gravado errado |
| colar do editor de texto | cola "Black Friday — 2026" no nome | o texto fica como colado; o selo corta em 14 |
| nome vazio | apaga o nome | Salvar desligado |
| desligada não cruza | a mesma vigência cruzada, com o interruptor desligado | aceita (só campanhas ligadas se cruzam); não salvar — só conferir que o motivo some |
