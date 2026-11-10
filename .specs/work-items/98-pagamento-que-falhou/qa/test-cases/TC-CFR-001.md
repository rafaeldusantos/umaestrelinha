## TC-CFR-001: Registrar e desfazer dão retorno, explicam a falha e preservam o que foi digitado

**Tipo:** cfr
**Prioridade:** P2
**Origem:** exploratório — auditoria de usabilidade, performance percebida e recuperação de erro na maior superfície nova (J-01, J-02)
**Autor:** dev
**Persona:** PER-01 Adri no celular
**Jornada:** J-01 e J-02
**Charter:** CH-07
**Situação:** ativo
**Automação:** target `manual` — status `na`
**Spec:** —
**Nota:** —

### Objetivo

A dona sempre sabe se gravou, e uma falha não a obriga a refazer tudo.

### Pré-condições

- Conta: `admin`
- Massa: M6, M7
- Estado de partida: `/admin/pedidos/:id/pagamento`

### Condições reais

As da persona; rede offline em um passo.

### Categoria

Usabilidade · Performance percebida · Recuperação de erro.

### Metas (observável · alvo · aceitável)

| Observável | Alvo | Aceitável |
| --- | --- | --- |
| Retorno do confirmar | botão trava e mostra que está gravando em < 1 s | < 2 s |
| Envio de três comprovantes | progresso ou "enviando" visível durante a espera | — |
| Falha de rede no confirmar | frase simples, diz que não gravou e como tentar de novo; meio, data, observação e anexos preservados | — |
| Linguagem | nada de código, "Request", "RPC", valor técnico do meio | — |

### Passos

1. Registra com três comprovantes
   - **Esperado:** dentro das metas
2. Corta a rede e confirma
   - **Esperado:** dentro das metas de falha
3. Desfaz com a rede cortada
   - **Esperado:** diz que não desfez; o motivo continua escrito

### Esperado e fonte

Heurísticas de status visível e mensagem útil — fonte: guia de CFR da skill; molde do painel (`ActionButton`, foco por `shared/lib/foco.ts`).

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| Sair sem gravar | voltar com o formulário preenchido | não grava nada; registrar se há aviso de perda |
