/**
 * As frases da tela "Avisos neste celular" e da pergunta do "Sair" (feature `79`). As da spec são
 * palavra por palavra; os testes as escrevem POR EXTENSO, nunca lidas daqui.
 */

/** O título da tela e o item do menu da conta (`MAN-17`). */
export const AVISOS_NESTE_CELULAR = 'Avisos neste celular'

/** O botão que pede a permissão — o único lugar onde ela é pedida (`MAN-10`). */
export const AVISAR_NESTE_CELULAR = 'Avisar neste celular'

/** `MAN-12`. */
export const AVISOS_BLOQUEADOS =
  'As notificações estão bloqueadas para o Ateliê. Para receber avisos, libere nas configurações do Android.'

/** `MAN-13`. */
export const SEM_SUPORTE = 'Este navegador não recebe avisos.'

/** `MAN-16`. */
export const NAO_ATIVOU = 'Não consegui ativar os avisos. Tente de novo.'

/**
 * SPEC_DEVIATION (lacuna de precisão; frase nova, decisão do orquestrador no Lote 4): a leitura do
 * estado ao abrir falhou (o motivo `'ler'` do hook) e a spec não tem frase para isso. Vem com o botão
 * "Tentar de novo", que relê.
 */
export const NAO_CONFERIU = 'Não consegui conferir os avisos deste celular. Tente de novo.'

/**
 * SPEC_DEVIATION (lacuna de precisão; frase nova): a troca de um interruptor falhou e a lista voltou
 * ao que era (`MAN-14` diz o que grava, não o que dizer quando não grava). Sem a frase, o interruptor
 * voltaria em silêncio e ela acharia que o toque não pegou.
 */
export const NAO_GRAVOU_ESCOLHA = 'Não consegui gravar esta escolha. Tente de novo.'

/** `MAN-30` — também a frase quando "Parar avisos neste celular" falha na tela. */
export const NAO_PAROU = 'Não consegui parar os avisos deste celular.'
export const SAIR_MESMO_ASSIM = 'Sair mesmo assim'

export const PARAR_AVISOS = 'Parar avisos neste celular'
export const ENVIAR_TESTE = 'Enviar um aviso de teste'

/** `MAN-32`. */
export const TESTE_NAO_SAIU = 'O aviso de teste não saiu. Tente de novo.'

/** `MAN-33` — nunca a de `MAN-32`. */
export const TESTE_AGUARDE = 'Aguarde alguns segundos para mandar outro aviso de teste.'

/**
 * SPEC_DEVIATION (emenda de `MAN-32`, decisão do usuário): o servidor não conhece mais este aparelho (o 410 do teste, o 404 de um interruptor) e a tela voltou a
 * "Avisar neste celular". Frase nova, decisão do usuário em 2026-10-26
 * (BUG-20261025-teste-com-aparelho-descartado-deixa-a-tela-ligada).
 */
export const APARELHO_DESCARTADO = 'Este celular deixou de receber avisos. Ative de novo.'

export const TENTAR_DE_NOVO = 'Tentar de novo'
