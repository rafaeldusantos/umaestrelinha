## TC-CFR-003: Os textos fixos novos do bloco e do editor seguem o tom memorial

**Tipo:** cfr
**Prioridade:** P2
**Origem:** RNF-05
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-01, J-02 (refeitas como auditoria)
**Charter:** CH-07
**Situação:** ativo
**Automação:** target `manual` — status `na`
**Spec:** —
**Nota:** julgamento de texto — os textos novos ficam em `packages/core`, mas a régua aqui é o que a persona lê

### Objetivo

Quem acabou de perder alguém não encontra no bloco nem no painel frase de pressa, escassez ou festa.

### Pré-condições

- Conta: `admin-loja`; a loja sem login
- Massa: a do fim da rodada (B-1, B-2, B-3 nos estados que os charters deixaram)
- Estado de partida: `/admin/home`

### Condições reais

as da persona

### Categoria

Usabilidade — linguagem do usuário, tom do produto

### Metas

| Observável | Alvo | Aceitável |
| ---------- | ---- | --------- |
| texto fixo novo com urgência, contagem regressiva, escassez ou exclamação | nenhum | nenhum |

### Passos

1. Ler os textos fixos novos do editor: dicas do título e da descrição, avisos (sem campanha, agendada, encerrada,
   desligada, prévia de agendada, peças que saíram, que não barateiam, leitura que falhou), recusas
   - **Esperado:** nenhum com "últimas", "corra", "só hoje", contagem regressiva, ou ponto de exclamação
2. Ler a linha de cada bloco na lista
   - **Esperado:** o mesmo
3. Ler a frase dos percentuais do bloco na loja (B-1 com a descrição vazia por um instante, no rascunho, na prévia)
   - **Esperado:** o mesmo; Cancelar

### Esperado e fonte

Os textos fixos novos do bloco e do editor não usam urgência, contagem regressiva, escassez nem exclamação — fonte:
PRD RNF-05; `CLAUDE.md` (registro memorial)

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| texto escrito pela dona | o título ou a descrição que a dona digitou | fora da régua — é conteúdo dela, não texto fixo |
