// A folga que uma página reserva no fim para a bolha do WhatsApp não cobrir o último bloco
// (feature 59, `ACB-02`).
//
// A medida é DA BOLHA, por isso mora aqui, ao lado dela — e não em cada página que a usa:
//   · celular: `bottom-20` (5rem, acima do `MobileNav`) + `h-14` (3,5rem) = 8,5rem → `pb-36` (9rem);
//   · `md` em diante: `md:bottom-6` (1,5rem) + 3,5rem = 5rem → `md:pb-24` (6rem).
// Mexeu na posição ou no tamanho da bolha, mexe aqui: `WhatsAppFloat.test.tsx` compara os dois.
//
// Classe literal de propósito: o JIT do Tailwind só gera o que encontra escrito por extenso.
export const WHATSAPP_FLOAT_CLEARANCE = 'pb-40 md:pb-24'
