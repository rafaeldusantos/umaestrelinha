## TC-FUNC-003: O voltar do Android recua um passo, fecha a folha aberta e o indicador só leva até o passo já alcançado

**Tipo:** functional
**Prioridade:** P1
**Origem:** UC-02 (D-12, D-43)
**Autor:** dev
**Persona:** PER-02 Adri interrompida
**Jornada:** J-03, passo 5
**Charter:** CH-04
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** o voltar do Android se simula por `history.back`; o gesto real fica fora. A variação "voltar depois de 'Criar link'" é esperado P1 decidido pelo humano (Q-01, 2026-11-08; D-43): o código de hoje cai na montagem vazia — essa saída é falha esperada, registrada como bug na rodada

### Objetivo

O voltar, que a Adri usa como navegação principal, nunca a tira da montagem de uma vez.

### Pré-condições

- Conta: `admin-atelie`
- Massa: uma cliente; uma peça
- Estado de partida: `/pedidos` → "Montar pedido"

### Condições reais

As da persona.

### Passos

1. Avança até o passo 3 e volta
   - **Esperado:** passo 2, com a sacola intacta; a URL continua `/pedidos/montar`
2. Abre a folha da variação e volta
   - **Esperado:** a folha fecha, ainda no passo 2
3. Volta até o passo 1, sem nada preenchido, e volta de novo
   - **Esperado:** sai para `/pedidos`
4. Com algo preenchido no passo 1, volta
   - **Esperado:** a folha "Sair sem criar o link?" (TC-FUNC-004), não a saída
5. Do passo 2, toca no segmento "Passo 4: Revisar" do indicador sem ter chegado lá
   - **Esperado:** nada acontece; os segmentos até o passo mais alto alcançado navegam

### Esperado e fonte

"o voltar do Android volta um passo (ou fecha a folha aberta), e no primeiro passo pede a mesma confirmação de fechar" — fonte: PRD › O que é novo 1; spec D-12, Design › casca (indicador). Depois de "Criar link", o voltar leva a Montados com a montagem fora do histórico — fonte: spec D-43 (humano, Q-01 do plano, 2026-11-08).

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| F5 no passo 3 | recarrega | recomeça no passo 1 (com o rascunho, se houver) |
| abrir `/pedidos/montar` direto numa aba nova | volta no passo 1 | cai em `/pedidos` |
| voltar depois de "Criar link" (P1) | volta | volta a Montados (`/pedidos?visao=montados`), com o cartão novo; a montagem não está mais no histórico — um segundo voltar não reabre passo nenhum (Q-01, D-43). Cair na montagem vazia é bug |
