## TC-FUNC-014: Com a aba da loja escondida, a cliente deixa de contar, e volta a contar ao reabri-la

**Tipo:** functional
**Prioridade:** P1
**Origem:** LAV-12
**Autor:** dev
**Persona:** PER-03 Lúcia
**Jornada:** J-05, passos 2–3
**Charter:** CH-03
**Situação:** ativo
**Automação:** target `manual` · status `na`
**Spec:** —
**Nota:** a troca de aba em segundo plano é instável de emular no headless; fica manual

### Objetivo

A cliente que trocou de app não está na loja; contá-la inflaria o número e gastaria a bateria dela.

### Pré-condições

- Conta: `anonima` com estatística aceita; a Adri lê `/ao-vivo` noutro contexto
- Massa: ambiente do CH-01
- Estado de partida: Lúcia numa joia, contada

### Condições reais

as da persona

### Passos

1. Abre outra aba e a traz para a frente (a da loja fica escondida); espera 6 min
   - **Esperado:** a Lúcia sai do total
2. Volta à aba da loja
   - **Esperado:** em até 75 s, volta ao total, no mesmo estado (olhando a joia)

### Esperado e fonte

A loja avisa só com a aba visível; quem não avisa há 5 min sai do total — fonte: PRD §3 Opção A, §6.2 Loja, LAV-12

### Variações

| Variação                     | Ação                                | Esperado               |
| ---------------------------- | ----------------------------------- | ---------------------- |
| esconde por 2 min só          | volta antes dos 5 min               | não chega a sair do total |
