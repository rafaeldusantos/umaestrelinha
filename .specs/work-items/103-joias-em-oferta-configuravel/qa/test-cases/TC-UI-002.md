## TC-UI-002: O editor do bloco segue os padrões do protótipo: contador ao lado do rótulo, recusa abaixo do campo, lista com subir e descer

**Tipo:** ui
**Prioridade:** P2
**Origem:** exploratório — os padrões do protótipo adotados pela costura (spec.md D-01) para CA-01.6, CA-03.2 e RNF-08
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** n/a
**Charter:** CH-08
**Situação:** ativo
**Automação:** target `manual` — status `na`
**Spec:** —
**Nota:** conferência contra a fonte de design; o protótipo não tem a tela do bloco, só os padrões

### Objetivo

O editor novo fala a mesma língua visual que o protótipo do painel: a dona vê quanto falta no campo, lê a recusa
onde errou e reordena sem precisar arrastar.

### Pré-condições

- Conta: `admin-loja`
- Massa: B-1 com três peças (só leitura)
- Estado de partida: editor de B-1 aberto; o artifact numa aba separada

### Condições reais

as da persona

### Passos

1. No protótipo, localizar o campo com contador, a recusa abaixo do campo e a lista ordenada
   - **Esperado:** os três padrões localizados (o que não for, `blocked` por design)
2. No editor, comparar o contador do título e da descrição
   - **Esperado:** o contador ao lado do rótulo, no formato "n / teto" do protótipo
3. Provocar a recusa do título (61 caracteres)
   - **Esperado:** a recusa abaixo do campo, com o ícone de alerta, como no protótipo
4. Comparar uma linha da lista de peças
   - **Esperado:** os controles de subir, descer e tirar, como na lista do protótipo
5. Cancelar

### Protótipo e tela

Fonte: `link` · https://claude.ai/artifact/SQehnBNiiQmbnjkY3QQpbq ("Painel — Campanhas, faixa de avisos e perfil de
estilo"). Tela: `/admin/home/<B-1>`, FormCards Conteúdo e Peças escolhidas.

### Propriedades a comparar

estrutura (onde o contador, o ícone e os controles ficam), texto do formato do contador, presença do ícone de
alerta, os três controles por linha. Cor, tipografia e espaço só se o protótipo fixar o valor no padrão

### Esperado e fonte

Os três padrões do protótipo estão no editor — fonte: spec.md D-01; protótipo `SQehnBNiiQmbnjkY3QQpbq`

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| foco | Tab até subir/descer | foco visível, como o protótipo desenha (se desenhar) |
