## TC-FUNC-012: Os avisos trocam sozinhos a cada 6 segundos e param enquanto o dedo está na faixa

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-02, UC-01, RN-06
**Autor:** dev
**Persona:** PER-02 Bia
**Jornada:** J-02, passo 2
**Charter:** CH-02
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** tempo por relógio da página; o toque prolongado depende do driver

### Objetivo

A Bia começa a ler o aviso e ele troca no meio da frase: ela perde a oferta. O ritmo tem de ser o do Banner principal e o dedo tem de segurar.

### Pré-condições

- Conta: `anonima`
- Massa: a faixa do manifesto (só leitura)
- Estado de partida: num produto de C1, no topo da página

### Condições reais

as da persona

### Passos

1. Observa a faixa por 20 s, anotando o instante de cada troca
   - **Esperado:** A1 → A2 → A3 → A4, uma troca a cada ~6 s; cada aviso entra com um deslocamento curto, sem sumir antes
2. Mantém o dedo pressionado sobre a faixa por 15 s (toque prolongado, sem soltar)
   - **Esperado:** o aviso não troca enquanto o dedo está lá
3. Solta o dedo
   - **Esperado:** volta a trocar no ritmo de ~6 s

### Esperado e fonte

Troca a cada 6 s, o mesmo ritmo do Banner principal; pausa enquanto há toque — fonte: PRD UC-01, CA-02, RN-06; spec PR-4

### Variações

| Variação | Ação | Esperado |
| --- | --- | --- |
| um aviso só | — | sem massa de um aviso nesta rodada; fica para a prévia (TC-FUNC-006) |
| driver sem toque prolongado | o driver só sabe tocar e soltar | `skip` do passo 2, com o motivo no log |
| aba em segundo plano | troca de aba por 20 s e volta | o aviso visível ao voltar está inteiro, sem trocas em rajada |
