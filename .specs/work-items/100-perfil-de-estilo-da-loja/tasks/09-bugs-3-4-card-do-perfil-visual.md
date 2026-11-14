## 09 · [apps/backoffice] BUG-003, BUG-004 — Configurações › Dados da loja · card "Perfil de estilo da loja" (opções e aviso do prazo)

**Status:** done

`BUG-003, BUG-004` — 100 · fix task da QA (rodada 1)

**Objetivo.** as opções do perfil e o aviso do prazo seguem as proporções e as cores do protótipo do Claude Design.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › Comandos · O "defeito 01" · Convenções que valem em todo o repositório · Os guardas · Baselines; `apps/backoffice/CLAUDE.md` › Molde dos formulários · Configurações · O movimento do painel. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Depende de.** 07 (o card `StyleProfileCard`, `done`); 08 (mesmo arquivo — rode depois dela e parta da árvore que ela deixou).

### Critérios de aceite

O corpo de cada bug, íntegro — é a definição de pronto e o que o QA vai retestar.

### BUG-003 — [Perfil de estilo] As opções Padrão e Black Friday fogem das proporções do protótipo

##### Resumo

Adri abre o card "Perfil de estilo da loja" para escolher entre Padrão e Black Friday. As duas opções aparecem com a
estrutura certa (miniatura, rádio, nome, "Em uso", descrição e amostras), mas não com as medidas do protótipo
aprovado: a borda é mais fina, a miniatura da loja é mais baixa e não tem hachura, as amostras têm outro raio e outro
espaçamento, e o nome tem outro peso. A escolha continua clara.

**Origem:** sessão CH-07 (design-check)

##### Impacto

- **Nível:** Cosmético
- **Persona mais atingida:** PER-01 Adri (a dona) — outras: nenhuma
- **Jornada e passo:** J-01 Vestir a loja de Black Friday, passo 3 (escolhe "Black Friday")
- **Frequência:** sempre (2 de 2: Black Friday marcado e Padrão marcado)
- **Contorno:** nenhum necessário: a escolha funciona
- **Gravidade proposta na sessão:** low — mantida. Painel de configuração, não é superfície de primeira impressão

##### Ambiente

- **URL:** http://localhost:8083/admin/configuracoes/dados-da-loja
- **Tela:** Configurações › Dados da loja · **Componente:** card "Perfil de estilo da loja" — opções do perfil
  (Padrão / Black Friday)
- **Branch / build:** `feature/100` @ `b244cebc`, dev server do worktree (painel :8083)
- **Browser:** Chromium (agent-browser 0.39.1) · **Viewport:** 1440 × 900
- **Rede:** normal · **Idioma:** pt-BR

##### Passos

1. Entre no painel como Adri (conta `admin-loja`) e abra `http://localhost:8083/admin/configuracoes/dados-da-loja`
2. Role até o card "Perfil de estilo da loja"
3. Compare as duas opções com a tela "Configurações · perfil de estilo" do protótipo

##### Esperado

Cada opção com borda de 2 px (a marcada em `violet`, com fundo `#fbf9fe`), uma miniatura com faixa do cabeçalho de
22 px, faixa de departamentos de 12 px, blocos de 34 px com hachura e botão de 14 px, amostras com raio de 6 px e gap
de 4 px, e o nome com peso 600.

**Fonte:** protótipo Claude Design `4abe021d-d77e-4fe7-affd-524180315fa3`, `Painel - Campanhas, faixa e perfil.html` ›
"Configurações · perfil de estilo" (`adm-bf.css`: `.perfil`, `.perfil-mini`, `.amostras`, `.perfil-tt b`); TC-UI-001

##### Observado

Borda de 1 px (a marcada em `primary` `#6436ec`, com fundo `primary` a 5 %). Miniatura com 12 / 8 / 32 px (blocos
tracejados, sem hachura) / 10 px. Amostras com raio de 4 px e gap de 6 px. Nome com peso 700. Os textos, a ordem e os
valores das amostras, o selo "Em uso" e o empilhamento abaixo de 1024 px conferem.

##### Evidência

- `screenshots/CH-07-01-card-bf-em-uso.png` — as duas opções, com Black Friday marcado e em uso
- `screenshots/CH-07-02-padrao-marcado-nao-salvo.png` — as duas opções, com Padrão marcado e não salvo

##### Design × implementado

| Propriedade                                                 | Protótipo                                  | Observado                                   | Confere |
| ----------------------------------------------------------- | ------------------------------------------ | ------------------------------------------- | ------- |
| Borda da opção                                              | 2 px; marcada `violet`, fundo `#fbf9fe`    | 1 px; marcada `primary` `#6436ec`, fundo `primary` a 5 % | não |
| Miniatura — cabeçalho · departamentos · blocos · botão      | 22 · 12 · 34 · 14 px, blocos com hachura   | 12 · 8 · 32 · 10 px, blocos tracejados      | não     |
| Amostras — raio · gap                                       | 6 px · 4 px                                | 4 px · 6 px                                 | não     |
| Nome do perfil — peso                                       | 600                                        | 700                                         | não     |
| Amostras — ordem e valores                                  | primary-strong, primary, accent, ground-deep | iguais                                    | sim     |
| Empilhamento abaixo de 1024 px                              | uma coluna                                 | uma coluna (900 px)                         | sim     |

##### Relacionados

- **TC:** TC-UI-001
- **Charter:** CH-07
- **Critério:** UC-01
- **Protótipo:** Claude Design `4abe021d-…` · `Painel - Campanhas, faixa e perfil.html` › Configurações · perfil de
  estilo
- **Bugs:** BUG-004 (o aviso do prazo, no mesmo card)

### BUG-004 — [Perfil de estilo] O aviso do prazo sai em laranja com borda, não no cinza-lilás do protótipo

##### Resumo

No card "Perfil de estilo da loja", Adri lê o aviso de quanto tempo a loja leva para mostrar o perfil novo. O texto
está certo, mas a caixa sai branca, com borda fina e texto laranja. No protótipo ela é cinza-lilás, sem borda, com
texto em cinza. O aviso continua legível.

**Origem:** sessão CH-07 (design-check)

##### Impacto

- **Nível:** Cosmético
- **Persona mais atingida:** PER-01 Adri (a dona) — outras: nenhuma
- **Jornada e passo:** J-01 Vestir a loja de Black Friday, passo 2 (lê o card)
- **Frequência:** sempre (2 de 2)
- **Contorno:** nenhum necessário: o aviso se lê
- **Gravidade proposta na sessão:** low — mantida

##### Ambiente

- **URL:** http://localhost:8083/admin/configuracoes/dados-da-loja
- **Tela:** Configurações › Dados da loja · **Componente:** card "Perfil de estilo da loja" — aviso do prazo ("Depois
  de salvar, quem abrir a loja…")
- **Branch / build:** `feature/100` @ `b244cebc`, dev server do worktree (painel :8083)
- **Browser:** Chromium (agent-browser 0.39.1) · **Viewport:** 1440 × 900
- **Rede:** normal · **Idioma:** pt-BR

##### Passos

1. Entre no painel como Adri (conta `admin-loja`) e abra `http://localhost:8083/admin/configuracoes/dados-da-loja`
2. Role até o card "Perfil de estilo da loja"
3. Olhe o aviso com o relógio, "Depois de salvar, quem abrir a loja…", abaixo das opções

##### Esperado

Uma caixa com fundo `elev` `#f3eff8`, sem borda, raio de 10 px, texto `text2` `#5a4e6f` a 12,5 px e o ícone de
relógio.

**Fonte:** protótipo Claude Design `4abe021d-d77e-4fe7-affd-524180315fa3`, `Painel - Campanhas, faixa e perfil.html` ›
"Configurações · perfil de estilo" (`adm-bf.css` › `.cache`); TC-UI-001 ("o aviso com relógio")

##### Observado

Uma caixa de fundo branco, com borda fina, o ícone de relógio, e o texto em laranja `#a2490a` a 12 px. O texto é o
literal esperado (com a frase a mais de H7, que já foi decidida).

##### Evidência

- `screenshots/CH-07-01-card-bf-em-uso.png` — o aviso abaixo das opções
- `screenshots/CH-07-02-padrao-marcado-nao-salvo.png` — o mesmo aviso, com Padrão marcado

##### Design × implementado

| Propriedade     | Protótipo               | Observado         | Confere |
| --------------- | ----------------------- | ----------------- | ------- |
| Fundo           | `#f3eff8` (`elev`)      | `#ffffff`         | não     |
| Borda           | nenhuma                 | fina              | não     |
| Cor do texto    | `#5a4e6f` (`text2`)     | `#a2490a`         | não     |
| Tamanho do texto | 12,5 px                | 12 px             | não     |
| Ícone de relógio | sim                    | sim               | sim     |
| Texto           | o do design + frase H7  | o do design + frase H7 | sim |

##### Relacionados

- **TC:** TC-UI-001
- **Charter:** CH-07
- **Critério:** UC-01 (o card diz quanto tempo leva), RN-05
- **Protótipo:** Claude Design `4abe021d-…` · `Painel - Campanhas, faixa e perfil.html` › Configurações · perfil de
  estilo
- **Bugs:** BUG-003 (as opções, no mesmo card)

### Decisões já tomadas

- **Classificação**: qa-issue
- **Bug**: BUG-003 · [Perfil de estilo] As opções Padrão e Black Friday fogem das proporções do protótipo · low
- **Bug**: BUG-004 · [Perfil de estilo] O aviso do prazo sai em laranja com borda, não no cinza-lilás do protótipo · low
- **Lote**: mesmo componente `apps/backoffice/src/features/style-profile/ui/StyleProfileCard.tsx` · mesma tela `/admin/configuracoes/dados-da-loja` · a conferência visual do card contra o mesmo frame do protótipo
- **Fechamento**: a tarefa fecha com o fix de todos os bugs dela; cada bug segue `open` até o reteste do QA
- **Posse (arquivos onde o bug mora)**: `apps/backoffice/src/features/style-profile/ui/StyleProfileCard.tsx`, `apps/backoffice/src/features/style-profile/ui/__tests__/StyleProfileCard.test.tsx`; se precisar, variante aditiva em `apps/backoffice/src/shared/ui/InfoBanner.tsx`

### Siga a forma de

| O que você vai escrever | Imite |
| ----------------------- | ----- |
| opção do perfil (borda, miniatura, amostras, nome) | o próprio `StyleProfileCard.tsx` (partindo da árvore da 08) e os valores citados nos bugs (protótipo `adm-faixa-perfil.jsx`, `adm-base.css`) |
| aviso neutro em cinza-lilás | tokens `estrelinha-admin-*` do preset (`packages/ui`), lidos em `adminTokens.test.ts` |

Abra o arquivo antes de escrever o seu.

### Testes

- Componente: a opção tem borda de 2 px, a miniatura e as amostras nas medidas do protótipo e o nome em peso 600, por token exato de classe (BUG-003).
- Componente: o aviso do prazo sai no tom neutro do protótipo (fundo `elev`, sem borda, texto `text2`), por token exato, e o `InfoBanner` das outras telas continua igual (BUG-004).

Escrever estes testes é parte da tarefa — cada um vermelho antes do conserto.

### Obrigações

- Nada de `grid-cols-*` sem breakpoint dentro do painel da seção (`AdminSettingsPage.test.tsx`); alvo de toque ≥ 44 px; `motion-reduce:` em toda transição nova; não chamar seção de "aba".
- Rode a suíte do painel e a da loja (os guardas da loja varrem `apps/**`), `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` (baseline 7 herdados, `ProposalStateBadge.test.tsx`) e `npx eslint .` em `apps/backoffice` (baseline 23/5).
- `InfoBanner` é compartilhado (`@/shared/ui`): o aviso do prazo muda só no card — por uma variante/prop aditiva ou um aviso local —, sem mudar a cara do `InfoBanner` nas outras telas.

### Não faça

- Não mude o comportamento das outras seções de Configurações nem a frase compartilhada de `useSettingsSave.ts:30`.
- Não toque em `apps/store/**`, nem em `packages/core/src/appearance/**` além do que o bug exigir (e, se exigir, registre no retorno).
- Não crie seção nova; não abra escopo novo (a segunda aba desatualizada, anotada pela QA como sugestão de backlog, só entra se o conserto do BUG-001 a cobrir de graça — registre no retorno se cobriu).
- Não use hex literal fora dos tokens do painel (`adminTokens.test.ts`).

### Pronto quando

- [ ] cada passo de reprodução do BUG-003 e do BUG-004 dá o esperado do bug (teste que reprovava antes)
- [ ] testes dos arquivos que você alterou, passando — só deles
- [ ] suíte do painel e da loja, `tsc` do painel sem erro novo contra a baseline (7) e `eslint` do painel em 23/5

---

### Confira cada citação desta tarefa quando for usá-la

Todo `caminho:linha` daqui — `Siga a forma de`, `Contrato`, `Obrigações`, `Design` — foi
escrito antes de qualquer tarefa rodar, e as tarefas anteriores mexeram na mesma árvore. Abra
cada um no momento em que ele é usado — o exemplar antes de escrever o artefato, o contrato
quando a fatia o consome —, e nenhuma linha se escreve apoiada em citação não conferida: a
linha deslocou, relocalize pelo alvo que a citação nomeia e siga, registrando no retorno; o
arquivo não está mais lá, é `citação morta` — a regra abaixo manda concluir e propagar sempre
que dê para concluir, e o histórico do Git ainda serve de exemplar.

### Se algo aqui não bater com o repositório

A rota `JÁ EXISTE` não está lá, o exemplar sumiu, a tabela tem outra forma. Dá para concluir
mesmo assim: siga, feche e propague. Não dá: pare e relate até onde chegou. Não conserte
contrato por conta, não improvise, não crie o que era de outra tarefa.

**Propagar** é corrigir, nos arquivos seguintes de `tasks/`, cada afirmação que a sua descoberta
tornou falsa — só a afirmação, e nada mais do arquivo. Feito isso, a divergência está resolvida:
ela vai no seu retorno como registro, não como pendência para alguém decidir.

**Propagar é só para frente.** Afirmação de tarefa de número MENOR, já fechada, que a sua
mudança tornou falsa **não se reescreve**: reescrever o `Pronto quando` de tarefa encerrada
apaga o registro do que de fato foi verificado quando ela fechou. Registre a caducidade na
linha `Caducou` do seu retorno — a tarefa, a afirmação e o que a tornou falsa — e siga.

### Se a verificação não fechar

Leia o erro, corrija, rode de novo. Continuando sem passar, não declare pronto: relate o que
falha, com a saída. Nunca desative teste, marque skip, afrouxe asserção, ignore lint ou
silencie erro de tipo.

### O que devolver no fim

```
Tarefa: <nn>
Caso: fechou limpo | fechou com divergência | parou
Instruções lidas: <os caminhos, raiz e módulos>
Testes escritos: <um por comportamento do bloco `Testes`, com o arquivo; o que ficou sem
  cobertura, e por quê>
Verificações: <o que rodou, e o resultado>
Árvore de trabalho: <o que você alterou; nada é commitado por você>
Citações conferidas: <quantas você abriu ao usá-las; a que deslocou, e a que estava morta>
Propagado: <a tarefa, e o que você corrigiu no arquivo dela>   (só se houve divergência)
Caducou: <tarefa já fechada · a afirmação dela que ficou falsa · o que a tornou falsa>
                                                               (só se houve; não se reescreve)
Bloqueio: <motivo · até onde você chegou>                      (só se parou)
```
