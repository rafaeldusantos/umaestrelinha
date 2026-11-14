# Perfil de estilo da loja (Padrão e Black Friday)

**Protótipo:** `Black Friday - Home.html`, projeto "Uma Estrelinha - Black Friday" no Claude Design
(https://claude.ai/design/p/4abe021d-d77e-4fe7-affd-524180315fa3?file=Black+Friday+-+Home.html).
**Protótipo do painel:** a tela "Configurações · perfil de estilo" em
https://claude.ai/design/p/4abe021d-d77e-4fe7-affd-524180315fa3?file=Painel+-+Campanhas%2C+faixa+e+perfil.html
(escolher a tela no painel do protótipo).
**Estado:** planejamento e protótipo. Nada implementado.

## O problema

A dona quer vestir a loja de Black Friday em novembro e voltar à cara de sempre depois, sem deploy. Hoje as cores da
loja **não trocam em tempo de execução**: o Tailwind recebe `ESTRELINHA_COLORS` com valores hex
(`packages/ui/src/tokens/estrelinha.ts`), então `bg-estrelinha-primary` vira `#34495E` no CSS gerado. Só as poucas
regras de `App.css` leem `var(--estrelinha-*)`. Trocar a paleta hoje é trocar código.

## O que a dona ganha

1. **Uma chave no painel**: "Perfil de estilo da loja: Padrão · Black Friday". Salvou, a loja muda de cor.
2. **Voltar ao Padrão** é a mesma chave, quando quiser.
3. **Nada mais muda**: textos, blocos da Home, preços e menu continuam os mesmos. O perfil é só cor.

## O perfil Black Friday (do protótipo)

Os mesmos papéis de token, com outros valores. Branco, chão (`ground`) e `surface` não mudam: a loja continua clara,
com o peso no cabeçalho, nas faixas escuras e nos detalhes em ouro.

| token | Padrão | Black Friday |
| --- | --- | --- |
| `ink` | #23303A | #161514 |
| `ink-soft` | #54616B | #57524B |
| `primary` | #34495E | #1C1A18 |
| `primary-strong` | #283A4A | #0D0C0B |
| `accent` | #B8945F | #C2A063 |
| `accent-strong` | #A07E4C | #9A7A45 |
| `line` | #E6DFD4 | #E4DDD0 |
| `ground-deep` | #F1EBE1 | #F0EADF |
| `field` | #8C8073 | #857A6C |
| sombras | slate | ink do perfil |

Os demais tons ficam iguais nos dois perfis: o fundo azul claro do palco da Home e das faixas pontuais, o texto claro
sobre fundo escuro, os selos de situação do pedido e o verde do WhatsApp.

Os valores são do protótipo e **passam pelos guardas de contraste antes de valer** (RN-03); se algum reprovar, o valor
muda, a régua não.

## Casos de uso

### UC-01 · Ligar o perfil Black Friday
- Em **Configurações**, um card "Perfil de estilo da loja" com duas opções (Padrão, Black Friday), cada uma com uma
  amostra das cores, e "Salvar".
- Salvo, a próxima página que a cliente abrir já vem com o perfil (RN-04); quem já está com a loja aberta passa a ver o
  perfil novo em alguns minutos, ao trocar de página.
- O card diz o que muda ("só as cores; textos, blocos e preços continuam") e quanto tempo leva para todos verem.

### UC-02 · Voltar ao Padrão
- A mesma chave. Nenhum dado se perde: o perfil não apaga nem regrava conteúdo.

### UC-03 · Conferir antes de ligar
- Ao lado da chave, "Ver a loja com este perfil" abre a loja num iframe (a prévia de `/admin/home`) com o perfil
  escolhido e ainda não salvo.

## Regras

- **RN-01 · O perfil é um conjunto de valores dos MESMOS tokens**, com uma exceção desenhada no protótipo: no Black
  Friday o selo de desconto do cartão, o chip de desconto da sacola e a barra do frete grátis passam a ouro, para o
  desconto continuar se distinguindo dos outros selos. Fora esses três, nenhum componente muda de papel. Quem
  declara os perfis é um dono só (no molde de `packages/ui/src/tokens/estrelinha.ts`), e a loja os aplica como
  variáveis CSS. As classes do Tailwind passam a ler `var(--estrelinha-*)` no formato que preserva a opacidade
  (`/80`, `/70` continuam funcionando).
- **RN-02 · Só a loja.** O painel (`--estrelinha-admin-*`), o app do ateliê (`apps/mobile-adm`) e os e-mails não
  mudam. O app do ateliê lê o mesmo objeto de tokens hoje (`palette.test.ts`, desde a `72`): continua com o Padrão.
- **RN-03 · Os dois perfis passam pelos pisos de legibilidade**: todo texto continua legível sobre os fundos claros e
  escuros em cada perfil, e um perfil que reprova um piso não entra. As regras de uso do ouro ("o ouro forte nunca é
  texto", "o texto sobre o ouro é o escuro de texto") valem nos dois perfis pelo uso, e não reprovam um perfil só porque
  nele o par mede melhor.
- **RN-04 · Sem troca de cor diante da cliente.** A página chega já com o perfil em vigor. Se a página veio do cache com
  o perfil anterior, ela continua nele até a cliente trocar de página dentro da loja; a partir daí vale o perfil salvo.
  A cor nunca muda sozinha com a página parada.
- **RN-05 · O cache do HTML.** Páginas fixas ficam até 1 hora no cache de borda (`s-maxage=3600`), produto e
  categoria 5 minutos. Ligar ou desligar o perfil leva até 1 hora para chegar a todas as páginas no primeiro acesso,
  e o UC-01 diz isso (D-02).
- **RN-06 · `theme-color`, favicon e imagem de compartilhamento não mudam:** são marca, não campanha. A marca desenhada
  nas páginas da loja (rodapé, menu do celular, cabeçalho do checkout, Home) acompanha o perfil, no tom escuro do perfil.
- **RN-07 · Configuração com valor desconhecido ⇒ Padrão**, sem erro (molde de `featuredDisplay`).
- **RN-08 · Celular primeiro.** A prova em navegador é em 390×844 e 1440×900, nos dois perfis, nas telas da cliente:
  Home, categoria, produto, gaveta, checkout, confirmação e conta.

## Fora

- Perfis criados pela dona (cores livres no painel).
- Trocar fonte, raio ou imagens por perfil.
- Ligar e desligar por data. A vigência da campanha (WI 102) pode governar o perfil depois.
- A faixa de avisos (WI 101), que usa os tokens e por isso muda de cor com o perfil sem trabalho próprio.
- O selo da campanha (WI 102): as cores dele são cadastradas na campanha (D-02 do 102) e não dependem do perfil.

## Critérios de aceite

- **CA-01** Com o perfil Padrão, a loja é idêntica à de hoje, medida por captura em 390 e 1440 nas telas de RN-08.
- **CA-02** Com Black Friday salvo no painel, o primeiro HTML servido já traz o perfil: nenhuma pintura com a paleta
  Padrão antes (medido em navegador com rede lenta).
- **CA-03** Voltar ao Padrão no painel devolve a paleta de hoje, sem perder nenhum conteúdo.
- **CA-04** Os guardas de contraste e de ouro passam nos dois perfis; um valor reprovado reprova a suíte.
- **CA-05** O painel e o app do ateliê não mudam de cor com o perfil ligado.
- **CA-06** Valor desconhecido gravado na configuração ⇒ a loja abre no Padrão.
- **CA-07** "Ver a loja com este perfil" mostra o perfil escolhido sem salvar; fechar sem salvar não muda a loja.

## Plano técnico (para a spec)

| Peça | Onde | Nota |
| --- | --- | --- |
| Os perfis | `packages/ui/src/tokens/` | dono único dos valores dos dois perfis; o Padrão continua sendo o objeto que o app do ateliê lê |
| Tailwind da loja | `apps/store/tailwind.config.ts` | cores como `rgb(var(--estrelinha-…) / <alpha-value>)`; `palette.test.ts` muda de "o objeto É o dono" para "as variáveis SÃO as do dono" |
| As variáveis | `apps/store/src/app/App.css` | `:root` com o Padrão, `[data-perfil="black-friday"]` com o outro (nome do atributo na spec) |
| A configuração | `store_settings`, chave nova (ex.: `appearance: { profile }`) | migration aditiva e idempotente; tipo em `packages/supabase/src/types/settings.ts`; `storeSettingsDefaults.test.ts` |
| HTML servido | `apps/store/server/page.ts` (`readSettings`), `packages/core/src/page/head.ts` (`applyHead`) | o atributo no `<html>`; `page.test.ts` prova a leitura |
| No navegador | `RuntimeSettingsLoader.tsx` | aplica o atributo pelo que a configuração devolve |
| Painel | Configurações → Dados da loja (D-01) | um card; a prévia reusa o iframe de `/admin/home`. `settingsSections.test.ts` e `panels.test.tsx` seguem com 4 seções |
| Guardas | `contrast`, `accentText`, `palette`, `arbitraryTextColor` | medem os dois perfis |

## Decisões

Pela recomendação, confirmadas pelo usuário em 2026-11-13.

- **D-01 · A chave fica num card em Configurações → "Dados da loja"**, sem quinta seção.
- **D-02 · A demora do cache é aceita e dita no painel**: até 1 hora para o perfil chegar às páginas fixas no
  primeiro acesso. Encurtar o cache de todas as páginas custaria desempenho o ano inteiro por uma troca que acontece
  duas vezes por ano.
- **D-03 · O perfil não liga sozinho com a campanha** neste item: a chave é manual. Seguir a vigência da campanha
  (WI 102) fica para depois.

## Perguntas em aberto

Nenhuma.

---
Fonte: escrito na sessão de 2026-11-13 a partir do pedido do usuário, do protótipo `Black Friday - Home.html` e da
leitura de `estrelinha.ts`, `tailwind.config.ts`, `App.css`, `RuntimeSettingsLoader.tsx`, `server/page.ts` e
`core/page/head.ts`.

## Histórico de revisões

- 2026-11-14 · PRD Tech Review r1 (decidido na sessão pelas recomendações, a pedido do usuário): UC-01 (loja aberta vê em
  minutos), tons que não mudam, RN-01 (exceção do selo de desconto), RN-03 (pisos + uso do ouro), RN-04 (sem troca de cor
  diante da cliente), RN-06 (a marca desenhada acompanha o perfil). Registro em `prd-review.md`.
