/**
 * A batida entre a aprovação e a navegação (`PIX-P2-04`, e o cartão desde o board `58 L`).
 *
 * Quem está olhando para a tela precisa **ver a causa** do que vai acontecer: sem a pausa, a tela
 * troca sozinha e a pessoa não sabe se o pagamento caiu ou se ela clicou em algo. E a tela de
 * sucesso mantém o link manual à vista justamente para a pessoa não ficar presa se esta navegação
 * falhar.
 *
 * **Um número para os dois meios.** Morava em `OrderPaymentPage`; o cartão passou a ter a mesma
 * batida no checkout, e uma segunda constante seria a mesma pausa com dois donos.
 */
export const BATIDA_MS = 1200
