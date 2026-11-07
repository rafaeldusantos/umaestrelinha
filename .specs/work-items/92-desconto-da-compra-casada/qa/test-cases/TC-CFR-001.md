## TC-CFR-001: As frases novas do desconto seguem o tom memorial: sem exclamação, sem "economize", sem urgência

**Tipo:** cfr
**Prioridade:** P1
**Origem:** RNF-06
**Autor:** dev
**Persona:** PER-05 Sônia
**Jornada:** J-01, J-03
**Charter:** CH-08
**Situação:** ativo
**Automação:** target `manual` — status `na`
**Spec:** —
**Nota:** o guarda `tomDoCompreJunto.test.ts` lê o fonte; a sessão lê o que chega à tela e ao e-mail

### Objetivo

Quem acabou de perder alguém não encontra linguagem de liquidação.

### Pré-condições

- Conta: `anonima`
- Massa: M-01; um aviso "o valor mudou" provocado
- Estado de partida: página de P

### Condições reais

As da persona.

### Categoria

Usabilidade (linguagem do usuário, minimalismo).

### Metas (observável · alvo · aceitável)

| Observável | Alvo | Aceitável |
| --- | --- | --- |
| frases novas no bloco, sacola, checkout, avisos, confirmação, Minha conta, e-mail, painel | zero exclamação, "economize", urgência, contagem, emoji | zero |

### Passos

1. Ler cada frase nova em cada superfície
   - **Esperado:** nenhuma exclamação, nenhum "economize/economia", nada de "últimas", "só hoje", contagem ou emoji

### Esperado e fonte

Fonte: `prd.md` RNF-06; `CLAUDE.md` › registro memorial.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| o "Economize" do `compare_price` | aparece na página do produto | pré-existente (D-09), fora |
