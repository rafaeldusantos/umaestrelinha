## TC-FUNC-009: As joias sendo vistas aparecem com foto, nome e quantas pessoas, até cinco, as mais vistas primeiro

**Tipo:** functional
**Prioridade:** P1
**Origem:** LAV-30
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-02, passo 2
**Charter:** CH-04
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** seis contextos de cliente; ordem e empate determinísticos

### Objetivo

A Adri sabe quais peças estão chamando atenção agora, para pensar no próximo post ou na próxima peça.

### Pré-condições

- Conta: `admin-atelie`
- Massa: ambiente do CH-01; 6 joias ativas com foto; nomes conhecidos para o empate
- Estado de partida: `/ao-vivo`, ninguém na loja

### Condições reais

as da persona

### Passos

1. Duas clientes na joia "B…", uma na "A…", uma na "C…"
   - **Esperado:** "B…" primeiro com "2 pessoas"; depois "A…" e "C…" com "1 pessoa" cada, nessa ordem (empate por nome)
2. Cada linha
   - **Esperado:** a foto da joia, o nome e "{n} pessoa(s)"
3. Mais três clientes em três outras joias (seis joias com gente)
   - **Esperado:** só cinco linhas de joia; fica de fora uma das que têm menos pessoas

### Esperado e fonte

Até 5 linhas com foto, nome e "{n} pessoa(s)"; mais pessoas primeiro, empate por nome — fonte: PRD LAV-30; spec D-15 (foto)

### Variações

| Variação             | Ação                         | Esperado                                   |
| -------------------- | ---------------------------- | ------------------------------------------ |
| joia com nome longo   | cliente numa joia de nome longo | a linha quebra o nome sem rolar a página de lado a 390 |
| joia sem foto         | cliente numa joia sem foto   | a linha aparece com nome e número (o marcador da foto não é régua) |
