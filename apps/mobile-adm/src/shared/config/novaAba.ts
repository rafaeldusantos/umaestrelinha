/**
 * O aviso de que um link abre OUTRA ABA (conserto do QA da `76`,
 * `BUG-20261024-whatsapp-da-ficha-nao-avisa-nova-aba`). Quem ouve o leitor de tela e toca em
 * "Conversar no WhatsApp" é levada a outro app sem saber, e o voltar não a traz para onde estava.
 *
 * Mora num lugar só: `novaAbaAvisada.test.ts` exige `aria-label={nomeDoLinkExterno(…)}` em todo
 * `<a target="_blank">` do app e recusa o texto fora deste arquivo. O rótulo VISÍVEL vem primeiro no
 * nome acessível ("rótulo no nome"): quem comanda por voz diz o que lê na tela.
 */
export const AVISO_NOVA_ABA = 'abre em outra aba'

export const nomeDoLinkExterno = (rotulo: string): string => `${rotulo} (${AVISO_NOVA_ABA})`
