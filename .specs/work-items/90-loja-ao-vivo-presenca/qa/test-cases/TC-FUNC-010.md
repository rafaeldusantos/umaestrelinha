## TC-FUNC-010: Quem está no Guia de envio do material aparece numa linha própria, junto das joias

**Tipo:** functional
**Prioridade:** P1
**Origem:** LAV-31
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-02, passo 3
**Charter:** CH-04
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** —

### Objetivo

Quem lê o Guia está perto de enviar o material de alguém que perdeu; a Adri quer ver isso.

### Pré-condições

- Conta: `admin-atelie`
- Massa: ambiente do CH-01; 5 joias com foto
- Estado de partida: `/ao-vivo`, ninguém na loja

### Condições reais

as da persona

### Passos

1. Uma cliente só, no Guia de envio do material
   - **Esperado:** em "Joias sendo vistas agora", uma linha "Guia de envio do material" com o ícone de envio e "1 pessoa"; a frase "Ninguém olhando uma joia agora." não aparece
2. Mais duas clientes numa joia
   - **Esperado:** a joia ("2 pessoas") acima do Guia ("1 pessoa")
3. Clientes em cinco joias diferentes + a do Guia
   - **Esperado:** as cinco joias e a linha do Guia (seis linhas), ordenadas juntas pelo número de pessoas

### Esperado e fonte

O Guia como linha própria, com o ícone de envio, além das até 5 joias, ordenado junto — fonte: PRD LAV-31

### Variações

| Variação             | Ação                                   | Esperado                         |
| -------------------- | -------------------------------------- | -------------------------------- |
| Guia empata com joia  | 1 no Guia e 1 numa joia                 | as duas linhas aparecem; a ordem do empate é observação, não régua |
