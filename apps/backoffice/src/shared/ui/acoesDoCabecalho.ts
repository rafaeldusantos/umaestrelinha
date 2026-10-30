// Conserto do reteste da feature `88` (`BUG-20261030-pedido-rola-de-lado-com-fonte-200`) — o grupo de
// ações dos cabeçalhos de página (`PageHeader` e `RecordPageHeader`).
//
// O `Button` do shadcn é `whitespace-nowrap` com altura fixa (`h-9`/`h-10`). Com a fonte do sistema a
// 200 % em 390, "Folha de separação" e "Exportar 26 do filtro" mediam 363–370 px numa coluna de 294, e
// a página inteira rolava de lado (`scrollWidth` 431 no pedido, 478 na lista). No CELULAR os botões do
// grupo quebram linha e crescem na altura (com o piso de 44 px do alvo de toque); a partir de `md`
// nada muda — a regra é só `max-md:`. `min-w-0` + `max-w-full` dão ao grupo piso zero e teto na coluna.
//
// Um dono só porque são dois cabeçalhos: escrita duas vezes, uma divergiria da outra sem nada quebrar.
export const ACOES_DO_CABECALHO =
  'flex min-w-0 max-w-full flex-wrap items-center gap-2 ' +
  'max-md:[&_button]:h-auto max-md:[&_button]:min-h-11 max-md:[&_button]:whitespace-normal'
