// `FreeShippingBar` MOROU AQUI, e foi apagado na feature 37 (`FRG-03`).
//
// Estava exportado por este barrel e **nenhum arquivo o importava** — zero consumidores, desde
// sempre. Era a oitava leitura da regra do frete grátis, esperando para divergir das outras sete, e
// dividia por `free_shipping_threshold` sem guarda: com a faixa em zero, a largura da barra virava
// `Infinity%`. Mantê-lo obrigaria a adaptá-lo e testá-lo para um estado que ninguém renderiza.
//
// Quem desenha progresso de frete grátis hoje é a gaveta do carrinho, lendo `useFreeShipping`.
export { default as ShippingCalc } from './ui/ShippingCalc'
