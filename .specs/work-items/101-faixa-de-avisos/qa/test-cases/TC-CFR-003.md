## TC-CFR-003: Com movimento reduzido, a faixa não gira sozinha e nenhum aviso entra sumido

**Tipo:** cfr
**Prioridade:** P1
**Origem:** CA-02, UC-01, RN-05
**Autor:** dev
**Persona:** PER-03 Marta
**Jornada:** J-04, passo 5
**Charter:** CH-07
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** `reducedMotion: reduce` é determinístico; pedido de automação E2E

### Objetivo

A Marta ligou "reduzir movimento" no sistema: texto que se mexe sozinho a deixa enjoada e ela não consegue ler.

### Pré-condições

- Conta: `anonima`
- Massa: a faixa do manifesto (só leitura)
- Estado de partida: emulação `prefers-reduced-motion: reduce` antes de abrir a loja

### Condições reais

| Dimensão | Valor |
| --- | --- |
| Dispositivo | 1440 × 900, depois 390 × 844 |
| Modalidade | movimento reduzido |

### Categoria

Acessibilidade (movimento) e Compatibilidade

### Metas

| Observável | Alvo | Aceitável |
| --- | --- | --- |
| giro em 1440 | nenhuma troca em 20 s; as setas continuam trocando | — |
| giro em 390 | só o A1, nenhuma troca em 20 s | — |
| entrada | nenhum quadro com o aviso em opacidade 0; com movimento reduzido, troca sem deslocamento | — |

### Passos

1. Em 1440, observa a faixa por 20 s
   - **Esperado:** nenhuma troca
2. Usa "Próximo aviso"
   - **Esperado:** o A2 aparece de imediato, legível
3. Em 390, recarrega e observa 20 s
   - **Esperado:** só o A1, sem troca e sem setas
4. Sem a emulação, em 1440, tira screenshots a cada 50 ms durante uma troca de aviso
   - **Esperado:** o aviso novo entra deslocado (6 px), nunca invisível

### Esperado e fonte

Fonte: PRD UC-01 (`prefers-reduced-motion`), CA-02, RN-05; spec Design (entrada de 6 px em 300 ms, só sem redução de movimento)

### Variações

| Variação | Ação | Esperado |
| --- | --- | --- |
| trocar a preferência com a página aberta | liga a redução com a faixa girando | registrar se para de girar sem recarregar |
