-- =====================================================================
-- Feature 46 — Perguntas frequentes da loja
-- FAQL-26, FAQL-27, FAQL-29
-- =====================================================================
--
-- A loja ganha `/perguntas-frequentes`. O conteúdo NÃO é uma tabela nova: é a biblioteca `faqs` da
-- feature 28. O que nasce aqui é o SEGUNDO tipo de vínculo sobre ela — o primeiro é `product_faqs` —,
-- e a simetria entre os dois é o desenho inteiro.
--
-- Duas tabelas de pergunta e resposta no mesmo projeto seriam o "defeito 01" nascendo dentro do
-- corpus que o agente de IA vai ler depois. Com a biblioteca única a deduplicação vem de graça:
-- `faqs.question_key` já é `unique`, e a pergunta que hoje está em dezenas de produtos entra na
-- página sem virar uma segunda.
--
-- ⚠️ **A migration da 28 NÃO é editada, e isso é regra e não preferência.** `AD-017` venceu em
-- 2026-08-17: migration aplicada é imutável. O `db push` compara a LISTA de arquivos com o que já foi
-- aplicado e **não reexamina o conteúdo do que passou** — reescrever o `check` lá deixaria o banco
-- local (que vem de `db reset`) e o hospedado divergindo sem que nada acusasse: nem o push, nem o
-- build, nem o teste. Correção vem em migration nova, e ela é este arquivo.

-- ---------------------------------------------------------------------
-- 1 · O teto da resposta sobe de 600 para 4000 (FAQL-26)
-- ---------------------------------------------------------------------
--
-- Medido no conteúdo escrito pela dona: a resposta de "Quais materiais são utilizados na fabricação
-- das joias afetivas?" tem ~1.350 caracteres e **não cabe** em 600. O modo de falhar é ruim: o insert
-- sai com 23514, que na tela do painel vira "falha ao salvar" sem dizer o motivo.
--
-- A direção é de **afrouxamento**, e é isso que torna o `drop`+`add` seguro numa tabela com 67 linhas
-- em produção: nenhuma linha existente pode violar um limite MAIOR que o que ela já respeita. O `add`
-- revalida a tabela inteira, e com 67 linhas é instantâneo.
--
-- ⚠️ **Os dois `check` sobem JUNTOS, de propósito.** O teto é compartilhado: `FAQ_ANSWER_MAX` é o
-- mesmo número em `faqRefusal` (o editor da biblioteca) e no `maxLength` da resposta própria do
-- produto (`FaqTab.tsx`). Subir só o de `faqs` faria a tela do produto aceitar 4000 caracteres que o
-- banco recusa em 601 — exatamente a divergência que `faqSchema.test.ts` existe para impedir.

alter table public.faqs drop constraint if exists faqs_answer_len;
alter table public.faqs add constraint faqs_answer_len
	check (char_length(btrim(answer)) between 1 and 4000);

alter table public.product_faqs drop constraint if exists product_faqs_override_len;
alter table public.product_faqs add constraint product_faqs_override_len
	check (answer_override is null or char_length(btrim(answer_override)) between 1 and 4000);

-- ---------------------------------------------------------------------
-- 2 · faq_page_items — a colocação na página (FAQL-27)
-- ---------------------------------------------------------------------
--
-- Colunas em `faqs` (`show_on_faq_page`, `faq_page_position`, `category`) foram recusadas: confundem
-- CONTEÚDO com COLOCAÇÃO. A ordem na página não é propriedade da pergunta — é propriedade de onde ela
-- está, como `product_faqs.position` já demonstra. E uma flag booleana onde cabe presença de linha é
-- o que `/admin/home` já recusou uma vez ("curadoria é a PRESENÇA de itens, não uma flag").

create table if not exists public.faq_page_items (
	-- **`faq_id` é a PK, e não uma coluna a mais.** A página é UMA, então a mesma pergunta não pode
	-- estar duas vezes nela. Em `product_faqs` a PK é composta porque existem 680 produtos; aqui o
	-- "produto" é singular e some da chave.
	--
	-- `on delete restrict`, igual à irmã e pelo mesmo motivo: apagar uma entrada em uso removeria a
	-- resposta da página (e das até 453 páginas de produto) em silêncio. O caminho reversível é
	-- `faqs.is_active = false`, que tira de todas de uma vez e volta com um clique.
	faq_id uuid primary key references public.faqs(id) on delete restrict,
	-- O assunto é propriedade da COLOCAÇÃO. Gravado na pergunta, ele viajaria junto para qualquer
	-- outra superfície que a reusasse — a página do produto inclusive, que não tem assunto nenhum.
	--
	-- O vocabulário é FECHADO e espelhado por `FAQ_PAGE_CATEGORIES` (`@estrelinha/core/faq`);
	-- `faqPageSchema.test.ts` lê este arquivo do disco e compara os dois lados, item a item.
	category text not null,
	position integer not null default 0,
	-- `null` = usa a resposta da biblioteca. Mesmo molde de `product_faqs.answer_override`, e mesma
	-- regra de gravação: override idêntico ao padrão grava `null` (`faqOverrideOf`), senão o mesmo
	-- texto passaria a ter dois donos e editar a biblioteca deixaria de alcançar a página.
	answer_override text,
	created_at timestamptz not null default now(),
	constraint faq_page_items_category_check
		check (category in ('sobre','o-processo','envio-do-material','materiais-e-acabamentos','personalizacao','cuidados')),
	constraint faq_page_items_override_len
		check (answer_override is null or char_length(btrim(answer_override)) between 1 and 4000)
);

-- Sem `updated_at` e sem trigger: nada aqui tem histórico de edição. O texto mora em `faqs`, que já
-- carrega o `set_faqs_updated_at` da feature 28.

-- A ordem em que a página desenha: assunto, depois posição. A PK indexa `faq_id` e não serve a esta
-- leitura, que é a única que a loja faz.
create index if not exists faq_page_items_order_idx on public.faq_page_items (category, position);

comment on table public.faq_page_items is
	'Quais perguntas da biblioteca aparecem em /perguntas-frequentes, sob que assunto, em que ordem, e com que resposta quando ela difere do padrão (feature 46). É o segundo tipo de vínculo sobre faqs; o primeiro é product_faqs.';

comment on column public.faq_page_items.category is
	'O assunto sob o qual a página agrupa a pergunta. Vocabulário fechado, espelhado por FAQ_PAGE_CATEGORIES em @estrelinha/core/faq — a ORDEM daquela constante é a ordem em que a página exibe os grupos.';

-- ---------------------------------------------------------------------
-- 3 · RLS (FAQL-29)
-- ---------------------------------------------------------------------
--
-- **Habilitar RLS aqui é obrigatório, e não zelo.** `20260801130000_public_schema_grants.sql` concede
-- privilégio de tabela a `anon`/`authenticated` e repete o mesmo default privilege para toda tabela
-- nova — a postura padrão do Supabase, em que o portão é o RLS. Tabela nova que nascesse sem RLS
-- estaria escancarada, com escrita anônima inclusive.

alter table public.faq_page_items enable row level security;

-- ⚠️ **A colocação é lida publicamente SEM CONDIÇÃO, e é deliberado** — a mesma decisão de
-- `product_faqs`, pelo mesmo motivo.
--
-- A alternativa óbvia seria condicionar à entrada ativa. Ela é pior por um motivo concreto: o vínculo
-- para uma entrada desativada não chegaria ao navegador, e o ramo "pular a vaga" de `resolveFaqPage`
-- NUNCA rodaria em produção — o código existiria sem nada exercitá-lo. Com a leitura aberta, o embed
-- do PostgREST devolve `faq: null` com o `faq_id` intacto.
--
-- Não há vazamento: o conteúdo mora em `faqs`, que continua filtrando por `is_active`. O que fica
-- legível é um uuid, um assunto e uma posição.
drop policy if exists "public read faq page items" on public.faq_page_items;
create policy "public read faq page items" on public.faq_page_items
	for select to public
	using (true);

-- `to authenticated` + `has_role` no `using` **e** no `with check`.
--
-- Os dois lados testam coisas diferentes: o `using` decide quais linhas a pessoa ALCANÇA
-- (update/delete), o `with check` decide o que ela pode DEIXAR GRAVADO (insert/update). Só o `using`
-- deixaria um não-admin inserir livremente, porque `insert` não tem linha antiga para filtrar.
drop policy if exists "admin full faq page items" on public.faq_page_items;
create policy "admin full faq page items" on public.faq_page_items
	for all to authenticated
	using (public.has_role(auth.uid(), 'admin'))
	with check (public.has_role(auth.uid(), 'admin'));

-- Esta migration não emite privilégio de tabela nenhum, e a policy de escrita é `to authenticated` —
-- `anon` não é `authenticated`. `faqPageSchema.test.ts` assere as duas coisas lendo este arquivo do
-- disco.

-- ---------------------------------------------------------------------
-- 4 · As 26 perguntas da loja (FAQL-28)
-- ---------------------------------------------------------------------
--
-- **Aditiva e idempotente: nenhum `update`, nenhum `delete`.** O projeto já pagou três vezes por tela
-- que nasce vazia — o menu da 39, o frete grátis da 37 e o banner da 41 —, e as três viraram dívida
-- escrita no `CLAUDE.md`. Aqui a página nasce respondendo.
--
-- O preço de semear é o risco oposto: um `db push` que sobrescrevesse o texto apagaria a edição da
-- dona em silêncio. Por isso `on conflict … do nothing` nas duas pontas, e por isso este arquivo não
-- tem um `update` nem um `delete` sequer — `faqPageSchema.test.ts` assere a ausência dos dois.
--
-- ⚠️ **`question_key` é LITERAL, pré-computada por `faqQuestionKey`** (`scripts/_gen-faq-seed.mjs`).
-- Calculá-la em SQL exigiria `unaccent` marcado como `immutable` e criaria a SEGUNDA normalização que
-- a feature 28 recusou de propósito. Digitá-la seria pior: um acento esquecido produz uma chave que
-- não deduplica nada, e nada quebra — a pergunta só entra duas vezes. O guarda roda a função REAL
-- sobre cada `question` daqui e compara com a `question_key` ao lado, nas 26 linhas, uma a uma.
--
-- **Uma lista só, e não duas.** O caminho óbvio seriam dois `insert` sobre o mesmo `values` repetido:
-- 26 chaves escritas duas vezes, que é o "defeito 01" dentro da própria migration que existe para
-- evitá-lo. O que torna a lista única possível é o `returning` do CTE — uma statement que modifica
-- dados dentro de um `with` **não enxerga o próprio efeito** no resto da query (todas compartilham o
-- mesmo snapshot), então a linha recém-inserida só é alcançável por ele. O `coalesce` junta as duas
-- origens: `inseridas` traz a pergunta nova e o `left join` em `public.faqs` traz a que JÁ EXISTIA na
-- biblioteca — é assim que "Quanto tempo demora", hoje em dezenas de produtos, entra na página sem
-- virar uma segunda pergunta.

with semente (question, answer, question_key, category, position) as (
	values
		('O que são joias afetivas?',
		 'Joias afetivas são peças criadas para eternizar histórias, sentimentos e momentos especiais.

Elas podem guardar pequenos fragmentos de momentos que têm um significado único para você, como leite materno, cabelos, pelos de pets, cinzas de cremação, dentes de leite, cordão umbilical, flores, tecidos, desenhos, assinaturas e outros materiais afetivos.

Mais do que uma joia, é uma forma de carregar uma história sempre perto de você.',
		 'o que sao joias afetivas', 'sobre', 1),
		('Quais materiais podem ser eternizados em uma joia?',
		 'Trabalhamos com diversos tipos de materiais afetivos, entre eles:

- Leite materno
- Cabelos
- Pelos de pets
- Bigodes
- Unhas
- Crina
- Cinzas de cremação
- Dentes de leite
- Cordão umbilical
- Flores
- Pequenos pedaços de tecido
- Desenhos
- Assinaturas

Cada material possui suas próprias características e técnicas de preparação.

Se você possui algo especial que não aparece nessa lista, entre em contato comigo. Podemos avaliar juntos a possibilidade de eternizá-lo.',
		 'quais materiais podem ser eternizados em uma joia', 'sobre', 2),
		('Não uso joias. Posso fazer outro tipo de peça?',
		 'Claro!

Na Uma Estrelinha, além de joias afetivas, também criamos peças para quem prefere guardar sua lembrança de outra maneira.

Podemos trabalhar com opções como pirâmides, peças decorativas e outros formatos personalizados, dependendo do material e da ideia que você deseja realizar.

Você não precisa usar uma joia para manter uma lembrança perto de você.

Podemos encontrar juntos uma forma que faça sentido para a sua história.',
		 'nao uso joias. posso fazer outro tipo de peca', 'sobre', 3),
		('Por que escolher a Uma Estrelinha para eternizar a minha história?',
		 'Porque aqui, a sua história é tratada com o mesmo carinho e cuidado que eu teria com a minha própria.

Eu sei que o material que você envia não é apenas um cabelo, um pelo, um pouco de leite materno ou uma pequena quantidade de cinzas.

É uma parte da sua história.

Por isso, cada material que chega até mim é tratado com muito respeito, cuidado e responsabilidade.

Meu compromisso é criar joias afetivas delicadas, bonitas e confortáveis para o uso no dia a dia, sempre buscando preservar a essência e o significado do material que você confiou a mim.

Cada peça é produzida artesanalmente e acompanhada de perto por mim, desde o recebimento do material até a finalização da joia.

Na Uma Estrelinha, você não está apenas comprando uma joia. Está confiando a mim uma lembrança que é única e insubstituível.

E é justamente por isso que cada história importa.',
		 'por que escolher a uma estrelinha para eternizar a minha historia', 'sobre', 4),
		('Ainda tenho dúvidas. Como posso falar com a Uma Estrelinha?',
		 'Se você chegou até aqui e ainda ficou com alguma dúvida, pode falar comigo.

Cada história é única e nem sempre conseguimos responder tudo em uma página de perguntas frequentes.

Se quiser conversar sobre seu material, escolher uma joia ou criar uma peça personalizada, me chame pelo WhatsApp.

Vou ficar feliz em conhecer a sua história e ajudar você a encontrar a melhor forma de eternizá-la.',
		 'ainda tenho duvidas. como posso falar com a uma estrelinha', 'sobre', 5),
		('Como funciona o processo para fazer uma joia afetiva?',
		 'É muito simples.

Primeiro, você escolhe o material que deseja eternizar e o modelo da peça.

Se você encontrar no site uma joia que goste, pode fazer a compra diretamente por aqui. Após a compra, você receberá todas as orientações necessárias para preparar e enviar o seu material.

Se ainda estiver em dúvida sobre qual peça escolher ou quiser entender melhor o processo antes de comprar, fale comigo pelo WhatsApp. Vou te ajudar a encontrar a opção que mais combina com a sua história.',
		 'como funciona o processo para fazer uma joia afetiva', 'o-processo', 1),
		('Quanto tempo demora para minha joia ficar pronta?',
		 'O prazo depende do modelo escolhido e do tipo de peça.

Para a maioria das joias afetivas, o prazo de produção é de aproximadamente 15 dias.

Alguns modelos podem ter prazos maiores, de 30, 45 ou até 50 dias, especialmente quando envolvem peças em prata que são produzidas especialmente após a compra.

Para pirâmides e peças decorativas, o prazo médio é de 25 a 35 dias.

O prazo de cada produto estará informado na página da peça antes da compra.',
		 'quanto tempo demora para minha joia ficar pronta', 'o-processo', 2),
		('Quais são as formas de pagamento?',
		 'O pagamento é realizado diretamente pelo site.

Você pode pagar via PIX, com desconto, ou optar pelo pagamento com cartão de crédito.

No cartão, é possível parcelar em até 4 vezes sem juros ou em mais parcelas, com os acréscimos da operadora do cartão.',
		 'quais sao as formas de pagamento', 'o-processo', 3),
		('Como devo enviar o material que quero eternizar?',
		 'Depois da compra, você receberá todas as orientações sobre como preparar e enviar o seu material.

O envio pode ser feito por Carta Registrada, PAC ou SEDEX.

Se você mora em Porto Alegre, também pode entregar o material pessoalmente ou solicitar o envio por motoboy.

Se preferir saber a quantidade e a forma de envio antes de comprar, consulte o guia de material da loja, com as orientações para cada tipo.',
		 'como devo enviar o material que quero eternizar', 'envio-do-material', 1),
		('Qual quantidade de material preciso enviar?',
		 'A quantidade necessária depende do material escolhido.

Para facilitar:

- Cinzas de cremação: um copinho de aproximadamente 50 ml, como aqueles utilizados para café, é mais do que suficiente para a confecção da joia.
- Leite materno: recomendamos o envio de 10 ml. Caso você não consiga essa quantidade, não se preocupe: podemos avaliar quantidades menores.
- Cabelos e pelos: uma pequena mecha já é suficiente.

Cada material possui suas próprias características e necessidades. O guia de material da loja traz a quantidade recomendada para cada tipo.',
		 'qual quantidade de material preciso enviar', 'envio-do-material', 2),
		('O envio do material é por minha conta?',
		 'Sim. O envio do material até a Uma Estrelinha é de responsabilidade do cliente.

Você pode escolher a modalidade de envio que preferir entre as opções disponíveis, como Carta Registrada, PAC ou SEDEX.

Se você mora em Porto Alegre, também existe a possibilidade de entrega em mãos ou envio por motoboy.',
		 'o envio do material e por minha conta', 'envio-do-material', 3),
		('O que acontece com o material que sobra?',
		 'Todo material que não for utilizado na confecção da peça será devolvido junto com a sua joia.

Sabemos que cada pedacinho enviado para nós possui um significado especial. Por isso, tratamos todo material com muito cuidado e respeito.',
		 'o que acontece com o material que sobra', 'envio-do-material', 4),
		('O material pode mudar de cor depois de colocado na resina?',
		 'Sim.

Alguns materiais podem apresentar alterações de tonalidade quando entram em contato com a resina. Isso faz parte das características naturais do processo de preservação.

Por isso, o resultado final pode apresentar pequenas diferenças em relação à aparência original do material.

E é justamente isso que torna cada peça tão especial: cada joia é única, assim como a história que ela carrega.',
		 'o material pode mudar de cor depois de colocado na resina', 'materiais-e-acabamentos', 1),
		('Qual será a cor das cinzas de cremação na joia?',
		 'As cinzas de cremação não possuem uma cor padrão.

Cada pessoa e cada pet terão cinzas com características diferentes, e isso pode influenciar diretamente no resultado da joia.

A tonalidade pode variar entre branco, branco acinzentado, cinza, bege, marrom ou até tons mais escuros.

Essa variação pode estar relacionada a diversos fatores, como o processo de cremação, temperatura, composição óssea e outros fatores individuais.

Por isso, não é possível garantir previamente uma cor exata.

A beleza está justamente em preservar as características únicas daquele material.',
		 'qual sera a cor das cinzas de cremacao na joia', 'materiais-e-acabamentos', 2),
		('O leite materno pode amarelar com o tempo?',
		 'Sim. E queremos ser muito transparentes com você sobre isso.

O leite materno eternizado em resina pode apresentar alteração de tonalidade ao longo do tempo, assim como a própria resina pode sofrer um processo natural de amarelecimento.

A velocidade dessa alteração depende de diversos fatores, como exposição à luz solar, calor, umidade, armazenamento e cuidados com a peça.

Por isso, não seria correto prometer que uma joia de leite materno permanecerá exatamente da mesma cor para sempre.

Mas isso não diminui o significado da peça.

Mesmo que a tonalidade mude com o passar dos anos, aquele é o seu leite materno, daquela fase tão especial, eternizado para sempre.

Para mim, o mais importante não é preservar apenas a aparência. É preservar a essência daquela história.',
		 'o leite materno pode amarelar com o tempo', 'materiais-e-acabamentos', 3),
		('Minha joia afetiva pode amarelar com o tempo?',
		 'Pode apresentar uma leve alteração de tonalidade ao longo do tempo, sim.

Na Uma Estrelinha, utilizamos resina com proteção UV, que ajuda a preservar a transparência e oferece maior resistência ao amarelamento.

Mesmo assim, com o passar dos anos, o uso e principalmente a exposição frequente ao sol, calor e outros fatores ambientais podem fazer com que a resina sofra uma leve alteração de tonalidade.

Isso não significa que a joia ficará amarela. A tendência é que ela perca um pouco da transparência cristalina que possui quando é nova e apresente uma tonalidade ligeiramente diferente.

Por isso, alguns cuidados são importantes para preservar sua joia afetiva por mais tempo, principalmente evitar exposição prolongada ao sol, calor excessivo e produtos químicos.',
		 'minha joia afetiva pode amarelar com o tempo', 'materiais-e-acabamentos', 4),
		('Quais materiais são utilizados na fabricação das joias afetivas?',
		 'As joias afetivas da Uma Estrelinha são produzidas artesanalmente com resina com proteção UV e o material afetivo escolhido por você, como leite materno, cabelos, pelos de pets, cinzas de cremação, dentes de leite, flores e outros materiais que podem ser eternizados.

Os materiais utilizados na parte metálica variam de acordo com o modelo escolhido.

Nos modelos mais básicos, utilizamos elo em Prata 925 ou Prata 925 folheada a ouro, que é a parte responsável por conectar o pingente à corrente ou outro acessório.

Os chaveiros são produzidos com aço inoxidável, proporcionando resistência e durabilidade para o uso diário.

Você também pode escolher modelos com diferentes tipos de moldura, de acordo com o estilo da peça:

- Moldura folheada: produzida em metal de alta fusão, sem níquel, com acabamento polido e verniz de proteção.
- Prata 925: disponível em diferentes acabamentos, como prata, banho de ouro, ouro branco, ródio ou ouro rosé, conforme o modelo.
- Aço inoxidável: uma opção resistente e prática para diferentes modelos de joias.

Cada produto possui suas próprias opções de acabamento. Consulte a descrição da joia escolhida para saber quais materiais estão disponíveis para aquele modelo.',
		 'quais materiais sao utilizados na fabricacao das joias afetivas', 'materiais-e-acabamentos', 5),
		('A joia afetiva acompanha corrente?',
		 'Na maioria dos modelos, a corrente não está incluída no valor do pingente.

Caso queira, você pode adicionar uma corrente à sua compra e escolher entre as opções disponíveis na Uma Estrelinha.

E se quiser deixar sua composição ainda mais especial, também temos diferentes opções de pingentes e elementos para complementar sua joia, incluindo meninos, meninas, cachorrinhos, gatinhos e outros modelos.

Assim, você pode criar uma combinação que tenha um significado especial para você e para a sua história.',
		 'a joia afetiva acompanha corrente', 'materiais-e-acabamentos', 6),
		('O banho de ouro ou prata pode desbotar?',
		 'Sim. As peças com banho ou folheação recebem uma camada de metal sobre a superfície da peça. Com o uso e o passar do tempo, essa camada pode sofrer desgaste natural, fazendo com que a tonalidade fique mais suave ou que o metal de base comece a aparecer.

A durabilidade do banho depende de vários fatores, como frequência de uso, contato com água, suor, perfumes, cremes, produtos químicos e atrito.

Por isso, alguns cuidados simples podem ajudar a preservar o acabamento da sua joia por muito mais tempo.',
		 'o banho de ouro ou prata pode desbotar', 'materiais-e-acabamentos', 7),
		('Vocês fazem joias afetivas em ouro?',
		 'Sim! Também podemos produzir alguns modelos em ouro.

Como a produção em ouro é feita sob encomenda, a disponibilidade depende do modelo escolhido.

Se você tem interesse em uma joia afetiva em ouro, entre em contato comigo pelo WhatsApp e me informe qual modelo você gostaria de fazer.

Vou verificar com o nosso fornecedor a possibilidade de produção e solicitar o orçamento.

O valor da peça é calculado de acordo com o modelo, quantidade de ouro utilizada e cotação do ouro no dia do orçamento, por isso o preço pode variar.

Se você tem um modelo específico em mente, pode me chamar. Vamos encontrar juntos a melhor forma de transformar sua história em uma joia de ouro única.',
		 'voces fazem joias afetivas em ouro', 'materiais-e-acabamentos', 8),
		('Posso personalizar minha joia afetiva?',
		 'Sim! E eu adoro criar peças que tenham a cara e a história de cada pessoa.

Se você não encontrou no site um modelo que realmente gostou ou já tem uma ideia em mente, entre em contato comigo pelo WhatsApp.

Podemos conversar sobre formato, material, acabamento e detalhes para criar uma joia afetiva personalizada e única para você.',
		 'posso personalizar minha joia afetiva', 'personalizacao', 1),
		('Posso colocar um nome ou outra personalização na minha joia?',
		 'Sim! Muitas das nossas joias afetivas podem ser personalizadas.

Você pode, dependendo do modelo, adicionar nome, inicial, data ou outro detalhe especial para deixar a peça ainda mais única e significativa.

Como cada modelo possui um espaço e formato diferente, recomendo que você entre em contato comigo pelo WhatsApp antes da compra.

Assim podemos conversar sobre a ideia que você tem, verificar o modelo escolhido e pensar juntas em como a personalização pode ficar mais bonita e delicada na sua joia.

Se você já tem uma ideia em mente, pode me chamar. Vou adorar ajudar a transformar essa ideia em uma joia que tenha a sua história.',
		 'posso colocar um nome ou outra personalizacao na minha joia', 'personalizacao', 2),
		('Posso gravar um nome ou uma mensagem na moldura da minha joia?',
		 'Sim! Alguns modelos de joias afetivas permitem gravação personalizada.

Dependendo da peça, podemos gravar nome, inicial, data ou uma pequena mensagem, tornando sua joia ainda mais especial e única.

Nos modelos que possuem essa opção disponível, o serviço de gravação e seu respectivo valor já estarão indicados na página do produto.

Mas, se você se apaixonou por um modelo que não apresenta a opção de gravação no site, não significa que não seja possível.

Entre em contato comigo pelo WhatsApp, me informe qual é o modelo que você gostou e vou verificar a possibilidade de fazer a gravação especialmente para você.',
		 'posso gravar um nome ou uma mensagem na moldura da minha joia', 'personalizacao', 3),
		('A resina é resistente?',
		 'Sim. A resina utilizada nas peças é resistente, mas, como qualquer material, precisa de alguns cuidados para manter sua aparência e integridade ao longo do tempo.

Recomendamos evitar quedas, impactos, calor excessivo e contato com produtos químicos fortes.

Com os cuidados adequados, sua peça poderá permanecer bonita por muitos anos.',
		 'a resina e resistente', 'cuidados', 1),
		('Como devo limpar minha joia afetiva?',
		 'Para a limpeza, recomendamos utilizar apenas uma flanela macia e seca.

Evite produtos de limpeza, álcool, abrasivos, esponjas, água quente ou qualquer produto químico diretamente sobre a peça.

Uma limpeza delicada é suficiente para remover pequenas marcas e manter sua joia bonita.',
		 'como devo limpar minha joia afetiva', 'cuidados', 2),
		('Posso tomar banho ou entrar na piscina usando minha joia?',
		 'Não recomendamos.

Para preservar tanto a resina quanto o metal da sua joia, evite utilizá-la durante o banho, na piscina, no mar ou em atividades que envolvam contato frequente com água.

Também recomendamos retirá-la antes de utilizar perfumes, cremes, produtos de limpeza ou outros produtos químicos.

Quanto mais cuidado você tiver com sua joia, mais tempo ela poderá acompanhar você.',
		 'posso tomar banho ou entrar na piscina usando minha joia', 'cuidados', 3)
),
inseridas as (
	insert into public.faqs (question, answer, question_key)
	select s.question, s.answer, s.question_key from semente s
	on conflict (question_key) do nothing
	returning id, question_key
)
insert into public.faq_page_items (faq_id, category, position)
select coalesce(i.id, f.id), s.category, s.position
from semente s
left join inseridas i on i.question_key = s.question_key
left join public.faqs f on f.question_key = s.question_key
where coalesce(i.id, f.id) is not null
on conflict (faq_id) do nothing;

-- ---------------------------------------------------------------------
-- O que o probe mediu (AD-012), em 2026-09-12
-- ---------------------------------------------------------------------
--
-- Contra o PostgREST e o Postgres locais (127.0.0.1:54341 / 54342), por HTTP e SQL — nunca por
-- inspeção de tipo. `DbCategory` declarava três colunas que o banco não tinha e TODA gravação de
-- categoria falhava com PGRST204, com o `tsc` achando o código certo e a suíte verde.
--
--   · anon lê a colocação com o embed ............................. 200, 26 linhas
--   · anon POST em `faq_page_items` ............................... 401
--   · anon POST em `faqs` ......................................... 401
--   · resposta com 4000 caracteres ................................ inserida
--   · resposta com 4001 caracteres ................................ viola `faqs_answer_len`
--   · apagar entrada que está SÓ na página ........................ viola a FK (o `restrict`)
--   · apagar entrada que está em produtos ......................... viola `product_faqs_faq_id_fkey`
--   · desativar a entrada (o caminho reversível) .................. ok; visíveis caem de 26 para 25
--   · **a semeadura reexecutada inteira** ......................... `INSERT 0 0`
--
-- ⚠️ **A reexecução é a medição que mais importa.** Rodada uma segunda vez, a semeadura inseriu
-- ZERO linhas: as contagens (92 na biblioteca, 26 colocações) e o md5 do conjunto das respostas
-- ficaram idênticos. É o que separa "rodar de novo" de "perder a edição que a dona fez no painel".
--
-- ⚠️ **Uma das 26 REUSOU entrada que já existia na biblioteca** — medido: `select count(*) … where
-- exists (product_faqs)` devolve 1. A biblioteca foi de 67 para 92, não para 93. É a prova de que o
-- `join` por `question_key` faz a página apontar para a pergunta que os produtos já usam, em vez de
-- criar uma segunda com o mesmo texto. Era a propriedade central do desenho, e ela está exercida.
