/**
 * Descrições **reais** do catálogo importado, copiadas do banco local em 2026-08-16.
 *
 * Não são amostras inventadas: cada uma representa um dos **dois arranjos** de HTML medidos, e é a
 * diferença entre eles que faz a leitura ingênua perder 312 pares em 70 produtos. Fixture escrita à
 * mão a partir de dado de verdade é o mesmo padrão de `tools/catalog-import/src/__fixtures__`.
 *
 * Repare que os dois usam formas diferentes da quebra de linha (`<br>` e `<br />`) — as duas
 * aparecem no catálogo, e as duas precisam funcionar.
 */

/** **Arranjo A** — um `<p>` por par. 617 produtos. Usa `<br>` sem barra e não tem entidade. */
export const DESCRICAO_ARRANJO_A =
  '<h2>Corrente Veneziana em Aço Inoxidável — a base ideal para usar com seu pingente afetivo</h2>' +
  '<p>Corrente veneziana em Aço Inoxidável, pensada para dar suporte ao seu pingente ou joia afetiva Uma Estrelinha no dia a dia.</p>' +
  '<h3>Especificações</h3>' +
  '<ul><li>Tipo: Corrente</li><li>Modelo: Veneziana</li><li>Material: Aço Inoxidável</li><li>Tamanho: 45cm</li></ul>' +
  '<h3>Perguntas frequentes</h3>' +
  '<p><strong>Essa corrente combina com os pingentes afetivos da Uma Estrelinha?</strong><br>Sim! Essa corrente foi pensada para usar com pingentes e joias afetivas da Uma Estrelinha, mas também pode ser usada sozinha.</p>' +
  '<p><strong>O pingente já vem incluso?</strong><br>Não — essa corrente é vendida separadamente do pingente, para você escolher a combinação que preferir.</p>' +
  '<p><strong>O Aço Inoxidável escurece com o uso?</strong><br>Não — o Aço Inoxidável é resistente à oxidação e não escurece com o tempo, mantendo o brilho por muito mais tempo que outros metais.</p>' +
  '<h3>Observações importantes</h3>' +
  '<ul><li>A peça exibida nas fotos é ilustrativa e pode apresentar pequenas variações de tom ou textura.</li></ul>'

/**
 * **Arranjo B** — TODOS os pares num `<p>` só, separados por `<br />`. 70 produtos.
 *
 * É o arranjo que o padrão ingênuo (`<p><strong>…</strong><br/>…</p>`) lê como **um** par em vez de
 * seis: ele casa o primeiro `<strong>` e engole o resto do parágrafo como resposta.
 */
export const DESCRICAO_ARRANJO_B = [
  '<h2>Joia Afetiva Sol com Leite Materno em Prata 925 &mdash; uma forma delicada de eternizar o v&iacute;nculo da amamenta&ccedil;&atilde;o</h2>',
  '<p>A Joia Afetiva Sol em Prata 925 guarda leite materno.</p>',
  '<h3>Especifica&ccedil;&otilde;es</h3>',
  '<ul>',
  '<li>Tipo: Joia afetiva</li>',
  '<li>Design: Sol</li>',
  '<li>Tamanho: 10mm ou 12mm</li>',
  '<li>Material base: Prata 925</li>',
  '<li>Aceita: leite materno ou cinzas de crema&ccedil;&atilde;o</li>',
  '</ul>',
  '<h3>Perguntas frequentes</h3>',
  '<p><strong>Como envio meu material de DNA?</strong><br />Ap&oacute;s a compra, voc&ecirc; recebe as instru&ccedil;&otilde;es para enviar seu material com seguran&ccedil;a. Cada pe&ccedil;a &eacute; feita &agrave; m&atilde;o, com cuidado e respeito. Envio para todo o Brasil.' +
    '<br /><strong>A prata pode escurecer ou perder o brilho?</strong><br />&Eacute; normal que a Prata 925 oxide levemente com o tempo e o uso &mdash; isso n&atilde;o afeta a durabilidade da pe&ccedil;a, apenas o brilho superficial, que pode ser recuperado com uma limpeza simples.' +
    '<br /><strong>As joias s&atilde;o realmente feitas &agrave; m&atilde;o?</strong><br />Apenas as partes que envolve o DNA e a resina. As pe&ccedil;as em prata 925, ou folheadas s&atilde;o encomendadas para o fabricante.' +
    '<br /><strong>O banho de ouro ou prata pode desbotar?</strong><br />Sim &mdash; o banho &eacute; uma fina camada depositada na superf&iacute;cie e pode desbotar com o tempo devido &agrave; oxida&ccedil;&atilde;o natural do uso.' +
    '<br /><strong>Quais materiais posso usar nessa joia?</strong><br />Essa pe&ccedil;a aceita cinzas de crema&ccedil;&atilde;o (humana ou pet), leite materno, cabelo, pelo ou coto umbilical.' +
    '<br /><strong>A joia acompanha corrente ou pulseira?</strong><br />N&atilde;o &mdash; essa pe&ccedil;a &eacute; vendida separadamente da corrente ou pulseira, para voc&ecirc; escolher o comprimento e o material que preferir.</p>',
  '<h3>Observa&ccedil;&otilde;es importantes</h3>',
  '<ul>',
  '<li>A joia exibida nas fotos &eacute; ilustrativa. Cada pe&ccedil;a &eacute; &uacute;nica, feita &agrave; m&atilde;o com todo carinho, e pode apresentar varia&ccedil;&otilde;es de tom ou textura.</li>',
  '<li>Sua joia ser&aacute; encomendada especialmente para voc&ecirc; ap&oacute;s a confirma&ccedil;&atilde;o da compra. O prazo estimado para receb&ecirc;-la &eacute; de 20 dias e, assim que ela chegar, iniciaremos a produ&ccedil;&atilde;o personalizada, que leva mais 10 dias. Por isso, o prazo total estimado para a conclus&atilde;o do pedido &eacute; de at&eacute; 30 dias.</li>',
  '</ul>',
].join('\n')

/** O caso dos **2 produtos** cujo bloco de FAQ é o último — não há heading depois dele. */
export const DESCRICAO_FAQ_NO_FIM =
  '<h2>Berloque Afetivo</h2>' +
  '<p>Um berloque para a sua pulseira.</p>' +
  '<h3>Perguntas frequentes</h3>' +
  '<p><strong>O berloque acompanha corrente ou pulseira?</strong><br />Não — o berloque é vendido separadamente.</p>'

/** Os **4 produtos** do catálogo sem bloco de FAQ nenhum. */
export const DESCRICAO_SEM_FAQ =
  '<h2>Pingente Complementar</h2>' +
  '<p>Um pingente para compor com outras peças.</p>' +
  '<h3>Especificações</h3>' +
  '<ul><li>Material: Prata 925</li></ul>'
