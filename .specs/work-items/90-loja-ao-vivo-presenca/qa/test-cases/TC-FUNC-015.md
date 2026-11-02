## TC-FUNC-015: A sacola guardada de uma visita anterior conta "Com joia na sacola", e esvaziá-la volta a "Olhando joias"

**Tipo:** functional
**Prioridade:** P1
**Origem:** LAV-20
**Autor:** dev
**Persona:** PER-03 Lúcia
**Jornada:** J-05, passos 1 e 5, ramo J-05b
**Charter:** CH-03
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** a sacola guardada se reproduz reabrindo o mesmo contexto (armazenamento preservado)

### Objetivo

Quem volta com a joia na sacola está perto de decidir; a Adri precisa ver isso, e a cliente precisa encontrar a
sacola de antes.

### Pré-condições

- Conta: `anonima` com estatística aceita; a Adri lê `/ao-vivo`
- Massa: ambiente do CH-01
- Estado de partida: Lúcia pôs uma joia na sacola e fechou a aba há mais de 5 min (fora do total)

### Condições reais

as da persona

### Passos

1. Reabre a loja na página inicial, no mesmo navegador
   - **Esperado:** a sacola com a joia de antes; na Loja ao vivo, em até 75 s, "Com joia na sacola" 1 (sem ter tocado na sacola)
2. Remove a joia da sacola
   - **Esperado:** em até 75 s, "Com joia na sacola" 0 e "Olhando joias" 1; total 1
3. Põe de novo
   - **Esperado:** volta a "Com joia na sacola" 1

### Esperado e fonte

"Com joia na sacola" inclui a sacola guardada de visita anterior; a mudança da sacola move a pessoa de linha — fonte: PRD LAV-20 item 2, §6.2 Loja ("na mudança da sacola")

### Variações

| Variação                       | Ação                     | Esperado              |
| ------------------------------ | ------------------------ | --------------------- |
| mudança de quantidade           | 1 → 3 da mesma joia      | continua "Com joia na sacola" 1 (uma pessoa) |
