## TC-INT-001: Um documento de menu com cor fora do formato, ou sem o campo de cor, desenha o rótulo como hoje

**Tipo:** integration
**Prioridade:** P1
**Origem:** C-05, C-07
**Autor:** dev
**Persona:** PER-01 Adri, a dona
**Jornada:** n/a
**Charter:** n/a — conferido abaixo da tela, na suíte do Dev (Validation); a sessão no browser não grava documento por fora do painel
**Situação:** ativo
**Automação:** target `integration` — status `missing`
**Spec:** —
**Nota:** leitura tolerante do contrato entre camadas (`menuLabelColorsOf`, `parseRoot`, `legacyMenuDocument`); o probe de gravação no Supabase local é obrigação das tarefas 01 e 02

### Objetivo

Um documento chegado por SQL, importação ou versão antiga do painel nunca quebra a loja nem o painel da dona por causa da cor.

### Pré-condições

- Conta: `admin` (para o painel)
- Massa: `store_settings.menu` com um item principal cuja cor é `"vermelho"` ou `"#12"`; e um documento v2 sem o campo de cor; e o menu legado (sem v2)
- Estado de partida: Supabase local

### Condições reais

as da persona.

### Passos

1. A loja lê o documento com a cor malformada
   - **Esperado:** o rótulo desse item como hoje; nenhum erro
2. O painel lê o mesmo documento
   - **Esperado:** o item sem cor no editor; gravar outro campo não quebra
3. A loja e o painel leem o documento sem o campo e o legado
   - **Esperado:** rótulos como hoje
4. Gravar pelo painel um item com chave `etiqueta` e as duas cores, e reler
   - **Esperado:** loja, painel e prévia leem a mesma chave e as mesmas cores

### Esperado e fonte

Um valor fora do formato `#RRGGBB` é lido como "sem cor"; a chave do sistema é lida igual pela loja e pelo painel — fonte: `plan.md` C-05, C-07; `tasks/02` › Testes (leitura tolerante, `legacy.test.ts`).

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| uma superfície válida e outra não | barra `#E8C77A`, lista `"x"` | barra com a cor, lista como hoje |
