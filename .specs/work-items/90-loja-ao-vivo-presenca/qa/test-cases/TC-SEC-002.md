## TC-SEC-002: Recusar estatística numa aba tira a cliente da contagem também na outra aba aberta

**Tipo:** security
**Prioridade:** P1
**Origem:** §10.3
**Autor:** dev
**Persona:** PER-04 Helena
**Jornada:** J-04, ramo J-04a
**Charter:** CH-02
**Situação:** ativo
**Automação:** target `manual` · status `na`
**Spec:** —
**Nota:** duas abas no mesmo contexto alternando visibilidade; fica manual

### Objetivo

Helena mudou de ideia; a escolha vale para a loja inteira, não só para a aba onde ela clicou.

### Pré-condições

- Conta: `anonima`; a Adri com `/ao-vivo` aberta noutro contexto
- Massa: ambiente do CH-01
- Estado de partida: Helena aceitou estatística, tem duas abas da loja abertas e aparece como 1 pessoa

### Condições reais

as da persona

### Passos

1. Na aba A, abre as preferências e recusa "Estatísticas"
   - **Esperado:** a loja segue normal
2. Passa para a aba B (que continuava aberta numa joia) e navega por 3 min
   - **Esperado:** em até 5 min da recusa, Helena sai do total e nunca volta enquanto a recusa vale
3. Reaceita na aba B
   - **Esperado:** volta a aparecer

### Esperado e fonte

A mesma decisão do contador de visitas, relida no instante de cada aviso — fonte: PRD §3 Opção A ("mesmo consentimento e as mesmas recusas do VisitCounter"), §10.3

### Variações

| Variação                  | Ação                          | Esperado            |
| ------------------------- | ----------------------------- | ------------------- |
| aba B em segundo plano     | recusa na A com a B escondida e depois volta à B | a B não volta a contar |
