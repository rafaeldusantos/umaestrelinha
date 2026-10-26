# 78 — mobile-adm: Promoções

> **RASCUNHO**: escopo e histórias P1 do programa mobile-adm (`AD-056`). Ao abrir a feature, rodar
> o Specify completo (varredura das dimensões implícitas, portão de fechamento) e o Design. Roteiro e
> decisões comuns: `.specs/features/72-mobile-adm-fundacao/spec.md`. Depende da `72`.
> Telas: Claude Design `a780eec8-…`, `Ateliê Admin.dc.html`. — aba **Descontos** (promoções) e tela **Promoção**.

## Escopo
- Lista com estado (*Valendo*, *Agendada*, *Encerrada*, *Pausada*). Nota fixa: "Promoção desconta
  sozinha, por quantidade de joias na sacola. Não precisa de código."
- Criar e editar: nome, vale para (todas as joias · categorias), como desconta (percentual · preço
  por unidade), **faixas** por quantidade (adicionar e remover, recusa de "Faixa repetida"),
  "Acumula com cupom", validade, ativa.

## Regras que sobem para `core`
`features/promotion-form/model` (196 linhas). O preço da promoção na sacola é calculado por
`core/pricing`. A tela **não** recalcula preço: no máximo mostra a faixa. `packages/core/src/payment/**`
segue intocado.

## P1 — critérios
1. WHEN duas faixas têm a mesma quantidade THEN a tela SHALL recusar com "Faixa repetida", pelo mesmo veredito que o Backoffice usa. (`MPR-01`)
2. WHEN o escopo é categorias e nenhuma foi escolhida THEN a gravação SHALL ser recusada. (`MPR-02`)
3. WHEN ela pausa THEN a loja SHALL deixar de aplicar a promoção na próxima leitura da sacola. (`MPR-03`)
4. WHEN a validade é futura THEN o estado SHALL ser *Agendada*, pelo dia de Brasília. (`MPR-04`)
5. WHEN a gravação é feita THEN ela SHALL ser provada por probe HTTP contra o banco local. (`MPR-05`)

## Perguntas abertas
- Excluir promoção pelo celular, ou só pausar? (O protótipo tem só "Editar".)
- As categorias vêm da árvore inteira ou só das coleções ativas?
