# 24 · Home gerenciável — Context

**Gathered:** 2026-08-12
**Spec:** `.specs/features/24-home-gerenciavel/spec.md`
**Status:** Ready for design

---

## Feature Boundary

A composição da Home deixa de ser a ordem do JSX e passa a ser dado editável em
`/admin/home`: **quais seções, em que ordem, ligadas ou não, com que textos, imagens e limites**. A
loja lê essa lista; o painel a edita, com prévia. Nada além da Home entra — header, rodapé, outras
páginas, cor e tipografia ficam fora.

---

## O que a medição do código mudou na conversa

A pergunta original supunha uma Home cravada. **Não é o caso, e isso reposicionou a feature.** O
estado do disco (parte em `HomePage.tsx` modificado, parte em dois widgets **untracked**:
`widgets/home-banners` e `widgets/home-collections`) já é uma Home dirigida por dado:

| seção de hoje | de onde o conteúdo vem |
| --- | --- |
| `HeroBanner` | literais no `.tsx` |
| `TrustBar` | `store_settings` (`payment`, `shipping`) — os números saem da fonte que o caixa cobra |
| `HomeBannerGrid` | `categories.banner_url` + `sort_order`, 3 vagas (`HOME_BANNER_SLOTS`) |
| `HomeCollections` | `categories` raiz ativa por `sort_order`, 4 fileiras (`HOME_COLLECTION_ROWS`) |
| `BrandStatement` | literais no `.tsx` |
| `TrendingTags` | `pickTrendingCategories` (folha, `sort_order`) |
| `NewsletterBanner` | literais no `.tsx` |

O print que o usuário enviou (mosaico no celular, três banners empilhados) **é esta implementação**,
não a loja Nuvemshop: as proporções batem com `RATIOS` do `HomeBannerGrid` — `588/510` (1,15:1) no
grande e `588/243` (2,42:1) nas faixas, contra 350×302 e 350×145 medidos no print.

Então o que falta não é dinamismo. É:

1. **ordem e presença** das seções (hoje, a ordem do JSX);
2. **textos** (hero, faixa institucional, newsletter: literais);
3. **limites** (`HOME_BANNER_SLOTS = 3`, `HOME_COLLECTION_ROWS = 4`: constantes);
4. **banner que não é uma coleção** — hoje impossível, porque banner é sempre uma categoria com
   `banner_url`.

---

## Implementation Decisions

### Abrangência

- **A Home inteira entra no painel**, não só as seções novas. Uma lista que mostra 3 de 7 seções
  mentiria: a dona reordena e a página não obedece onde ela esperava. É o mesmo argumento pelo qual
  `menuEntries` não trunca em `MENU_SLOT_LIMIT`.
- **Nada fora da Home.** Header, rodapé, outras páginas: fora.
- **Cor e tipografia não são editáveis pela dona.** A paleta é declarada em dois arquivos com
  `palette.test.ts`, `contrast.test.ts` e `accentText.test.ts` guardando contraste; um seletor de cor
  no painel desmonta os três sem quebrar build nem teste. Diferença deliberada frente ao painel da
  Nuvemshop, que é o referencial da conversa.

### Publicação

- **Um estado só, sem rascunho/publicar.** Seção nova nasce `active = false`; a dona monta, confere
  na prévia e liga. Isso dá o "não publicar pela metade" sem uma segunda cópia do documento e sem a
  loja precisar aceitar modo prévia.
- **Prévia é esquemática, dentro do painel** — blocos empilhados na ordem real, com os textos e as
  imagens reais de cada seção e um selo quando a seção não vai aparecer. Molde do `MenuBarPreview`
  que já existe. Render real dos widgets da loja foi recusado: traria os tokens `--estrelinha-*`
  para dentro do backoffice, que tem paleta própria e um teste guardando a separação.

### Curadoria — override por cima da derivação

- **A derivação de hoje continua sendo o padrão, e continua viva.** Seção nasce com a lista derivada
  (`sort_order` / `banner_url` / `featured`) e funciona sem ninguém tocar nela; categoria nova
  aparece sozinha.
- **Override é opt-in por seção**, com volta ao automático em um clique. A dona só assume a lista
  quando quer sair do padrão.
- Isso reconcilia a resposta do usuário ("seleção explícita") com a decisão já escrita no disco
  (*"a curadoria é a imagem, não uma coluna nova… dois donos do mesmo dado é o 'defeito 01' do
  projeto"*, em `pickHomeBanners`; e *"sem coluna `home_order`"*, em `pickHomeCollections`). **Sem o
  override, `sort_order` seria dono de duas coisas** — a ordem da vitrine e a ordem do menu — e
  reordenar a Home mexeria no menu como efeito colateral.

### Banner livre na grade

- **Banner passa a aceitar arte própria e destino livre**: uma coleção, um produto, ou um caminho da
  própria loja. Cobre campanha de data ("Dia das Mães") que não é categoria nenhuma.
- **Precedência declarada**: banner da própria seção vence; seção sem banner próprio cai na
  derivação por `categories.banner_url`. Mesma forma do override acima, então a regra é uma só na
  feature toda.
- **O destino tem de ser FK de verdade, não id dentro de jsonb.** `menu_promo.category_id` mora em
  jsonb, não tem FK, e por isso apagar o destino não dispara `on delete set null` — foi o que
  obrigou `resolvePromo` a existir. Aqui o desenho pode fazer melhor de origem, e deve.

### O hero

- **Aceita foto da dona, com a arte da marca como fallback.** Sem foto, continua o
  `EstrelinhaSymbol` sobre o palco `serenity`.
- **Textos editáveis**: sobretítulo, as duas linhas do título (a primeira em `ink`, a segunda em
  `primary` — as duas cores são o que dá o pico de contraste sem um terceiro tamanho de fonte),
  parágrafo, rótulo e destino do CTA.
- **O hero é seção única e não pode ser desligado nem removido.** É o que impede a Home de existir
  com zero seções ativas, sem inventar fallback mágico na loja nem uma regra do tipo "o painel
  recusa desligar a última".
- Nota: isto **reabre** parcialmente a recusa da feature 20 (nada de desenho de joia genérica no
  hero, porque prometeria um modelo que o catálogo pode não ter). Foto de **peça real** não tem esse
  defeito — é a peça que existe. A recusa segue valendo para ilustração inventada.

### Imagem

- **`alt` é obrigatório**, não opcional. Numa loja em que a peça é a homenagem de alguém, imagem sem
  descrição é a página inteira muda no leitor de tela — e o texto do banner está **dentro** da arte,
  então sem `alt` não existe texto nenhum para ler.
- **Nunca recortar em silêncio.** A arte do banner traz o texto embutido (confirmado no print:
  "CONHEÇA" em pílula, "NOVIDADES" girado na borda, tudo JPG). `object-cover` numa proporção
  diferente da do arquivo corta esse texto. Então: a proporção é declarada pela fileira, o painel
  mostra o tamanho recomendado em pixels e **avisa** quando o arquivo enviado tem proporção diferente.
- Reuso da compressão que o cadastro de produto já tem (`compressImage` / `uploadImageBlob`, teto de
  1600px no maior lado, WebP 0,82), **em bucket próprio** — limpar imagem órfã da Home não pode
  varrer imagem de produto.

### Mosaico no celular

- **Empilha em coluna, largura cheia, na ordem da fileira. É mosaico só no desktop.** Confirmado no
  print e já implementado assim.
- O número medido que fechou a decisão: container da loja tem `padding: 1rem`, então em 390px sobram
  **358px**; com `gap-2.5`, um mosaico proporcional de 4 daria **82px** por célula, e texto embutido
  numa arte de 82px de largura é ilegível — em 90% dos acessos.

### Referência morta

- Item escolhido a dedo que saiu do ar (despublicado ou apagado): **a loja pula o item, o painel
  avisa na linha** ("2 de 6 escolhidos saíram do ar"). Nunca vazio na vitrine, nunca link quebrado,
  e a dona vê o que consertar quando puder.
- **Não completa com o automático** para manter a contagem: entraria na Home item que a dona não
  escolheu, exatamente na seção em que ela pediu para escolher.

### Agent's Discretion

- Onde o item entra na sidebar: **grupo `Loja`**, ao lado de "Menu da loja". O CLAUDE.md já reservou
  o lugar — *"É o grupo onde entram banners da home, destaques e faixa de avisos."* A ordem das rotas
  em `App.tsx` tem de acompanhar, porque `navItems.test.ts` lê o arquivo do disco e compara.
- Desempate determinístico de ordem (`position`, depois `id`), pelo mesmo motivo que `bySortOrder`
  desempata por nome: sem isso a Home muda entre dois carregamentos.
- Quais seções são únicas e quais repetem: único para hero, faixa de vantagens, fileiras de coleção,
  chips de tema, faixa institucional e newsletter; repetível para grade de banners, destaque em
  coleção e carrossel de produtos.
- Modelagem de tabelas, RLS e forma do `config` — decisões da Design.

---

## Decisões que saíram do desenho no Paper (2026-08-12)

Página **`24 · Home gerenciável`** no arquivo `Uma Estrelinha`, cinco boards. O desenho fechou seis
coisas que a spec deixava em aberto:

1. **O editor de seção é ROTA, e a rota mantém a prévia.** Segue o precedente dos descontos
   (*"editor é TELA, não modal"*, sobrevive ao F5, é compartilhável) sem pagar o preço dele: a rota
   troca **só a coluna da lista** e conserva a prévia à direita, com o bloco editado contornado. Modal
   e inspetor lateral foram descartados — o formulário do hero tem seis campos e um upload.

2. **A faixa institucional aparece ANINHADA sob "Fileiras de coleção", com o rótulo "depois da 1ª
   fileira".** Isso não é enfeite: hoje ela é `interlude` **dentro** de `HomeCollections`, entre a 1ª
   e a 2ª fileira. Se a lista do painel a mostrasse como irmã das outras seções, a ordem exibida
   mentiria; e movê-la para depois de todas as fileiras violaria `HOME-04`. Então o modelo precisa de
   um campo do tipo `interlude_after` na seção de fileiras, e a lista o desenha como filho recuado.

3. **Borda de campo escurecida para ~3:1** (`#9086B4` no desenho). A borda que o painel usa hoje
   (`#F0EAF5`) mede ~1,1:1 sobre branco — contorno de controle invisível. É a mesma regra que a loja
   já força via `fieldBorder.test.ts`, aplicada aqui de propósito. **É desvio consciente do painel
   atual**, não descuido: se for recusado, o desenho volta, mas registre o motivo.

4. **No celular a tela alterna `Seções | Prévia`** — não cabem lado a lado em 390px. Cada controle da
   linha (arrastar, ligar, abrir) mora num alvo de 44px próprio, e a linha inteira mostra nome +
   resumo em duas linhas, sem a coluna de estado do desktop.

5. **A bandeja "Blocos que você pode acrescentar" vive DENTRO do cartão da lista**, no rodapé dele —
   não num modal do botão "Adicionar seção". Ela também é onde se lê quais tipos são únicos e já
   estão na lista, o que responde à pergunta antes de a dona clicar e ser recusada.

6. **`Home` entra ACIMA de `Menu da loja`** no grupo `Loja`. A Home é a superfície maior e a mais
   curada; a barra do topo é ajuste pontual.

Estados desenhados (cobrem o que seria um board de estados): seção desligada (na lista **e** na
prévia, com o motivo), seção que não vai aparecer, `Alterações não salvas`, aviso de proporção de
arquivo, destino de banner perdido, vaga de banner vazia, e coleção escolhida que saiu do ar.

---

## Specific References

- **Referencial declarado pelo usuário**: painel de temas da Nuvemshop
  (`/admin/themes/settings/active`) — lista de seções com liga/desliga, reordenação e configuração
  por seção. Adotado o modelo de composição; **recusadas** as partes de tema (cor, fonte) e o
  rascunho/publicar.
- **Print do usuário** (2026-08-12): mosaico no celular, três banners empilhados em largura cheia,
  texto embutido na arte, pílula "CONHEÇA" como parte do JPG.
- **Board do Paper `7CF-0`** ("Loja — Home (Desktop)") — a fonte de desenho que a implementação atual
  já seguiu.

---

## Deferred Ideas

- **Rascunho e Publicar de verdade**, com prévia em iframe da loja em 390px. Recusado nesta v1 por
  custo (toda leitura escolhendo entre duas versões + modo prévia na loja); volta a fazer sentido
  quando mais de uma pessoa editar a Home.
- **Agendar seção por data** (campanha que liga na sexta e desliga na segunda). Desejável para banner
  de data comemorativa; é máquina de estado nova e fica fora.
- **Faixa rolante (`MarqueeBar`) de volta ao catálogo de blocos.** Ela existe no código e está sem
  uso, mas trazia quatro números **cravados no JSX** e três já não batiam com as settings — devolvê-la
  como texto livre reintroduz o defeito por outra porta. Só entraria com tokens resolvidos na leitura
  (`{frete_gratis}`, `{pix_desconto}`).
- **Limpeza de imagem órfã no Storage** quando uma seção é apagada. Fica como dívida declarada.
- **Duplicar seção** e **biblioteca de imagens reutilizáveis**.
