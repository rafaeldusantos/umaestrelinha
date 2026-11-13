# CH-01 · A dona monta a faixa da Black Friday

| Campo        | Valor |
| ------------ | ----- |
| Tipo         | exploratório |
| Prioridade   | P0 |
| Persona      | PER-01 Adri |
| Tour         | Feature |
| Modo         | por cenário (J-01) |
| Time-box     | 60 min · orçamento: 50 ações |
| Mudança      | a tela nova `/admin/faixa-de-avisos` no grupo Loja: interruptor com o aviso do atraso, até 5 avisos de texto ou imagem, ordem, prévia que é a loja num iframe (UC-02, UC-03, CA-01, RN-03, CA-08) |
| Viewport     | 1440 × 900 |
| Massa        | **cria** a faixa do manifesto (Ambiente da execução › Massa): A1, A2, A3 de texto, A4 de imagem, ligada. Termina com exatamente isso gravado |
| Driver       | — |
| Entrada      | `http://localhost:8083/admin` · logada como `admin-loja`; a faixa nunca configurada |
| Jornadas     | J-01 |
| TC           | TC-FUNC-001, TC-FUNC-002, TC-FUNC-005, TC-FUNC-006, TC-FUNC-007 |

## Missão

Confirmar que a Adri, sozinha e sem ajuda, monta os quatro avisos da Black Friday, confere a prévia e põe a faixa no ar, e que o que ela salvou é o que a loja mostra.

## Deve tentar

1. Achar a tela pela navegação (grupo **Loja**), sem digitar a URL.
2. Montar os quatro avisos do manifesto, com as duas artes do `Uploads`, conferindo a prévia em Celular e Computador antes de salvar.
3. Salvar, recarregar o painel e abrir a loja numa aba nova (`http://localhost:8082/`).
4. Passar por "5 de 5" e voltar a 4 (o "+ Adicionar aviso" some e volta).

## Edge cases sugeridos

- Duplo clique no Salvar
- Recarregar logo depois de salvar
- Voltar no meio do formulário (sair da tela com alteração não salva)
- Enviar arquivo que não é imagem (`arte-errada.txt`)
- Reordenar só pelo teclado
- Trocar o tipo de um aviso de Imagem para Texto com as artes enviadas

## Fora do escopo

- Recusas de texto colado de fora (destino externo, rótulo sem destino, teto de 90): CH-04
- Desligar a faixa: CH-05
- Agendamento por data, faixa por página ou categoria, botão de fechar, contador de tempo (PRD › Fora)
- O link "Black Friday" dos departamentos (H-16, WI 102)
- O banner de erro de leitura (`InfoBanner`) que nunca aparece: conhecido, registrado em `apps/backoffice/CLAUDE.md` — não é achado
- O corpo da Home vazio dentro da prévia: combinado (H-22)
- As outras telas do grupo Loja (Home, Menu da loja), o resto do painel e o app do ateliê
- A tela do painel em 390 (a costura não a pede)
