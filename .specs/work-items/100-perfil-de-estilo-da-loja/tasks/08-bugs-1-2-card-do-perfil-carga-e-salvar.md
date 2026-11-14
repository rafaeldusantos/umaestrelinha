## 08 · [apps/backoffice] BUG-001, BUG-002 — Configurações › Dados da loja · card "Perfil de estilo da loja" (carga e salvar)

**Status:** done

`BUG-001, BUG-002` — 100 · fix task da QA (rodada 1)

**Objetivo.** o card do perfil não afirma um perfil salvo que ele não conseguiu ler, e salvar sem conexão diz à dona o que aconteceu.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › Comandos · O "defeito 01" · Convenções que valem em todo o repositório · Os guardas · Baselines; `apps/backoffice/CLAUDE.md` › Molde dos formulários · Configurações · O movimento do painel. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Depende de.** 07 (o card `StyleProfileCard`, `done`).

### Critérios de aceite

O corpo de cada bug, íntegro — é a definição de pronto e o que o QA vai retestar.

### BUG-001 — [Perfil de estilo] Leitura que falha mostra “Padrão · Em uso” com a loja em Black Friday — a dona

##### Resumo

Adri volta a Configurações › Dados da loja para desligar a Black Friday. A configuração da loja não chega ao painel
nessa carga, e o card "Perfil de estilo da loja" não avisa nada: mostra "Padrão" marcado com o selo "Em uso", as
opções habilitadas e "Salvar alterações" desabilitado. Ela lê que a loja já está no Padrão e encerra o assunto. A loja
continua em preto e ouro. Daquele estado, ela também não consegue salvar o Padrão, porque o card acha que ele já está
salvo. O esperado era o card segurar as opções desabilitadas enquanto não sabe o perfil salvo, e não exibir um "Em uso"
falso.

**Origem:** sessão CH-05

##### Impacto

- **Nível:** Bloqueia a conclusão
- **Persona mais atingida:** PER-01 Adri (a dona) — outras: nenhuma
- **Jornada e passo:** J-02 Devolver a loja ao Padrão, passo 2 (marca "Padrão" e salva); também J-01, passo 1 (abre o
  card)
- **Frequência:** sempre que a leitura da configuração falha na carga da seção (2 de 2 na sessão)
- **Contorno:** recarregar a seção com a rede de volta — mas nada no card diz que é preciso
- **Gravidade proposta na sessão:** high — elevada a critical. Pela definição do nível, a persona "contorna e chega a um
  estado errado": ela sai convencida de que a loja voltou ao Padrão, e a loja segue em Black Friday. Do estado
  mostrado, o card não deixa salvar o Padrão. O fato de depender de uma leitura que falha mexe na frequência, não no
  nível. Pelo guia, o nível só desceria se a jornada fosse P2/P3, e a J-02 é P0

##### Ambiente

- **URL:** http://localhost:8083/admin/configuracoes/dados-da-loja
- **Tela:** Configurações › Dados da loja · **Componente:** card "Perfil de estilo da loja" — opções do perfil e selo
  "Em uso"
- **Branch / build:** `feature/100` @ `b244cebc`, dev server do worktree (painel :8083, loja :8082)
- **Browser:** Chromium (agent-browser 0.39.1) · **Viewport:** 1440 × 900
- **Rede:** normal, com a leitura `GET /rest/v1/store_settings?select=key,value` abortada · **Idioma:** pt-BR

##### Passos

1. Entre no painel como Adri (conta `admin-loja`), abra Configurações › Dados da loja, marque "Black Friday" no card
   "Perfil de estilo da loja" e clique em "Salvar alterações". Abra `http://localhost:8082/` numa aba nova e confira
   que a loja está em preto e ouro (cabeçalho `#0D0C0B`)
2. Bloqueie só a leitura da configuração, `GET /rest/v1/store_settings?select=key,value` (DevTools › Network request
   blocking). Na vida real, isso é a rede caindo nessa requisição
3. Recarregue Configurações › Dados da loja e role até o card "Perfil de estilo da loja"
4. Olhe as opções, o selo "Em uso" e o botão "Salvar alterações" do card

##### Esperado

Enquanto a configuração não chega, as opções do card ficam desabilitadas, e o card não mostra um perfil "Em uso" que
não sabe qual é. "Em uso" só aparece no perfil de fato salvo.

**Fonte:** spec H9 ("Carregando: o card desenha as opções desabilitadas até a configuração chegar"); TC-FUNC-013,
variação "carregando" ("abre a seção com a rede lenta ou cortada → as opções desabilitadas até a configuração
chegar"); charter CH-05, "Deve tentar" 3 ("o card não mostra 'Em uso' errado")

##### Observado

O card mostra "Padrão" marcado com o selo "Em uso", "Black Friday" sem selo, as duas opções habilitadas e "Salvar
alterações" desabilitado. Nenhuma mensagem diz que a configuração não carregou. Numa aba nova, a loja está em Black
Friday (`data-perfil="black-friday"`, cabeçalho `rgb(13, 12, 11)`). Repetido: o mesmo resultado.

##### Evidência

- `screenshots/CH-05-09-carga-sem-config.png` — a seção Dados da loja recarregada com a leitura abortada. O card fica
  abaixo da dobra nesta captura; o estado dele ("Padrão · Em uso", opções habilitadas, Salvar desabilitado) foi lido
  pelo snapshot da página na sessão
- `screenshots/CH-05-08-loja-bf-nova-aba.png` — a loja em Black Friday com o mesmo perfil salvo

##### Relacionados

- **TC:** TC-FUNC-013 (variação "carregando")
- **Charter:** CH-05
- **Critério:** UC-02, CA-03 (voltar ao Padrão); spec H9
- **Bugs:** BUG-002 (o mesmo card, o estado de salvar sem conexão)

### BUG-002 — [Perfil de estilo] Salvar sem conexão gira sem fim e sem aviso — a dona não sabe se salvou

##### Resumo

Adri marca Black Friday e clica em "Salvar alterações" num momento em que a conexão caiu. O botão fica desabilitado,
com um ícone girando, e nenhuma mensagem aparece, nem de erro nem de "sem conexão". Pelo menos 46 s depois, continua
assim. Ela não sabe se a campanha entrou. Se fecha a aba, nada foi salvo. Se espera e a rede volta, a gravação sai
sozinha, minutos depois. Ela esperava que a falha fosse dita, como o painel diz quando a gravação falha.

**Origem:** sessão CH-05

##### Impacto

- **Nível:** Dano à confiança, descido um degrau (ver abaixo)
- **Persona mais atingida:** PER-01 Adri (a dona) — outras: nenhuma
- **Jornada e passo:** J-01 Vestir a loja de Black Friday, ramo J-01b, passo 5 (salva)
- **Frequência:** sempre que a rede está fora ao salvar (2 de 2 na sessão)
- **Contorno:** esperar a rede voltar com a aba aberta, ou recarregar e salvar de novo
- **Gravidade proposta na sessão:** medium — mantida. O ponto de partida é Dano à confiança: um spinner sem fim, sem
  dizer nada. Desce um degrau porque o produto se corrige sozinho: com a rede de volta e a aba aberta, ele salva e
  avisa "Perfil salvo…" sem a dona fazer nada. Nada diz sucesso falso, e "Em uso" segue certo

##### Ambiente

- **URL:** http://localhost:8083/admin/configuracoes/dados-da-loja
- **Tela:** Configurações › Dados da loja · **Componente:** card "Perfil de estilo da loja" — botão "Salvar
  alterações"
- **Branch / build:** `feature/100` @ `b244cebc`, dev server do worktree (painel :8083)
- **Browser:** Chromium (agent-browser 0.39.1) · **Viewport:** 1440 × 900
- **Rede:** offline (modo offline do browser) no clique em salvar · **Idioma:** pt-BR

##### Passos

1. Entre no painel como Adri (conta `admin-loja`) com rede normal e abra Configurações › Dados da loja
2. No card "Perfil de estilo da loja", marque o perfil que não está "Em uso"
3. Corte a rede (modo offline do browser) e clique em "Salvar alterações" do card
4. Espere (testado até 46 s)

##### Esperado

Nenhuma "Perfil salvo…" enquanto não salvou, uma indicação de falha no molde do painel, e "Em uso" no perfil anterior.
A falha precisa ser dita: a ausência de qualquer aviso é o caso que o TC chama de achado.

**Fonte:** TC-FUNC-013, passo 1 ("uma indicação de falha (molde do painel)"; "só é achado se disser sucesso, se não
disser nada, ou se culpar a pessoa"); spec H9 (salvando/erro no molde `SettingsSaveButton`/`useSettingsSave`); J-01,
ramo J-01b ("a falha é dita")

##### Observado

O botão fica desabilitado (opacidade 0,5), com um ícone girando. O rótulo continua "Salvar alterações", e nenhuma
mensagem aparece por pelo menos 46 s. "Em uso" segue no perfil anterior, e isso está certo. Nenhum `POST` sai enquanto
a rede está fora. Ao devolver a rede, a mesma gravação sai sozinha (`POST /rest/v1/store_settings?on_conflict=key →
200`), e aparece "Perfil salvo. Quem abrir a loja vê o perfil novo em até 1 hora.".

Para comparar: quando a gravação falha de imediato (requisição abortada), o card mostra certo "Erro ao salvar — Tente
novamente." e devolve o botão. O defeito é só a espera sem fim com a rede fora.

##### Evidência

- `screenshots/CH-05-04-offline-salvar.png` — spinner no botão, nenhuma mensagem, "Em uso" no Padrão
- `screenshots/CH-05-05-offline-45s-sem-aviso.png` — o mesmo estado depois de 46 s
- `screenshots/CH-05-06-gravacao-abortada-erro.png` — para comparar: a falha imediata mostra "Erro ao salvar — Tente
  novamente."

##### Relacionados

- **TC:** TC-FUNC-013 (passo 1)
- **Charter:** CH-05
- **Critério:** UC-01; spec H8, H9
- **Bugs:** BUG-001 (o mesmo card, o estado de carga)

### Decisões já tomadas

- **Classificação**: qa-issue
- **Bug**: BUG-001 · [Perfil de estilo] Leitura que falha mostra “Padrão · Em uso” com a loja em Black Friday — a dona · critical
- **Bug**: BUG-002 · [Perfil de estilo] Salvar sem conexão gira sem fim e sem aviso — a dona não sabe se salvou · medium
- **Lote**: mesmo componente `apps/backoffice/src/features/style-profile/ui/StyleProfileCard.tsx` · mesma tela `/admin/configuracoes/dados-da-loja` · os estados que a spec H9 decide (carregando, salvando, erro), lidos do mesmo par botão/configuração do card
- **Fechamento**: a tarefa fecha com o fix de todos os bugs dela; cada bug segue `open` até o reteste do QA
- **Posse (arquivos onde o bug mora)**: `apps/backoffice/src/features/style-profile/ui/StyleProfileCard.tsx`, `apps/backoffice/src/features/style-profile/ui/__tests__/StyleProfileCard.test.tsx`; possível leitura do erro em `packages/core/src/hooks/useStyleProfile.ts` (aditivo)

### Siga a forma de

| O que você vai escrever | Imite |
| ----------------------- | ----- |
| estado de leitura que falhou, com "Tentar de novo" | o molde de erro de leitura do painel (procure `Tentar de novo` em `apps/backoffice/src/features/**`) |
| salvar pelo molde de Configurações | `apps/backoffice/src/features/settings/model/useSettingsSave.ts` · `SettingsSaveButton` |

Abra o arquivo antes de escrever o seu.

### Testes

- Componente: a leitura da configuração em erro (o hook do perfil devolve erro) ⇒ nenhum selo "Em uso", opções e Salvar desabilitados, e um aviso com saída ("Tentar de novo" relendo) — o par: com a leitura boa, "Em uso" no salvo (BUG-001).
- Componente: com a leitura ainda carregando ⇒ nenhum "Em uso" e opções desabilitadas (H9).
- Componente: salvar sem conexão (mutação que não resolve / rede fora) ⇒ a dona vê aviso de que não salvou ou de que está esperando a conexão em tempo finito, e o botão não gira sem fim calado (BUG-002); com a rede, a frase de sucesso de H8 continua.

Escrever estes testes é parte da tarefa — cada um vermelho antes do conserto.

### Obrigações

- Nada de `grid-cols-*` sem breakpoint dentro do painel da seção (`AdminSettingsPage.test.tsx`); alvo de toque ≥ 44 px; `motion-reduce:` em toda transição nova; não chamar seção de "aba".
- Rode a suíte do painel e a da loja (os guardas da loja varrem `apps/**`), `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` (baseline 7 herdados, `ProposalStateBadge.test.tsx`) e `npx eslint .` em `apps/backoffice` (baseline 23/5).

### Não faça

- Não mude o comportamento das outras seções de Configurações nem a frase compartilhada de `useSettingsSave.ts:30`.
- Não toque em `apps/store/**`, nem em `packages/core/src/appearance/**` além do que o bug exigir (e, se exigir, registre no retorno).
- Não crie seção nova; não abra escopo novo (a segunda aba desatualizada, anotada pela QA como sugestão de backlog, só entra se o conserto do BUG-001 a cobrir de graça — registre no retorno se cobriu).

### Pronto quando

- [ ] cada passo de reprodução do BUG-001 e do BUG-002 dá o esperado do bug (teste de componente que reprovava antes)
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
