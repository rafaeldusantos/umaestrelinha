## TC-<PREFIXO>-NNN: <comportamento, em linguagem de usuário — sem ID de processo>

**Tipo:** functional · ui · journey · persona · regression · smoke · cfr · integration · security · charter · tour
**Prioridade:** P0 · P1 · P2 · P3
**Origem:** <P1-AC01 · C-03 · R-nn · BUG-N · exploratório — motivo>
**Autor:** dev   <!-- `e2e` quando o caso nasceu na automação E2E -->
**Persona:** PER-NN <nome>
**Jornada:** J-NN, passo <N> — ou `n/a`
**Charter:** CH-NN
**Situação:** ativo
**Automação:** target `e2e` · `integration` · `manual` — status `existing` · `missing` · `blocked` · `na`
**Spec:** <caminho do teste existente, ou —>
**Nota:** <por que automatizar, por que fica manual, ou o que bloqueia>

<!--
target manual ⇒ status na. existing só com o arquivo do teste achado.
Situação "obsoleto — <motivo>" tira o caso do cases[] sem liberar o número.
Apague este comentário.
-->

### Objetivo

<O que se valida, do ponto de vista da persona, e por que importa a ela.>

### Pré-condições

- Conta: <anonima · slug do perfil>
- Massa: <dados necessários>
- Estado de partida: <onde a persona está antes do passo 1>

### Condições reais

<Só o que difere da persona; senão, "as da persona".>

| Dimensão    | Valor                                            |
| ----------- | ------------------------------------------------ |
| Dispositivo | desktop (1280) · tablet (768) · celular (375)    |
| Rede        | rápida · lenta · instável                        |
| Locale      | <pt-BR>                                          |
| Modalidade  | mouse-teclado · toque · só-teclado · leitor-de-tela |

### Passos

1. <verbo de usuário>
   - Entrada: <dado, se houver>
   - **Esperado:** <o que a persona vê, dentro da paciência dela>
2. <verbo de usuário>
   - **Esperado:** <observável>

### Esperado e fonte

<O resultado que prova o critério> — fonte: <PRD §… · plan.md C-nn · protótipo <tela>>

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| <recarregar no envio>    | <envia e recarrega antes da resposta>   | <sem envio duplicado, retorno claro> |

<!--
Seções extras por tipo — inclua só a do tipo do caso:
  persona     → ### Hipóteses de fricção (3) · aprovação = objetivo dentro da paciência
  journey     → ### Entrada · ### Passos com tempo · ### Objetivo e efeitos · ### Caminho de abandono
  ui          → ### Protótipo e tela · ### Propriedades a comparar · viewports 375 · 768 · 1280
  regression  → ### O que mudou · ### Pontos de contato com outras jornadas
  cfr         → ### Categoria · ### Metas (observável · alvo · aceitável)
  smoke       → no máximo três passos, 2 minutos
Apague este comentário.
-->
