// O header das duas telas de fechamento de compra — `CHK-10`.
//
// Ele vivia declarado DENTRO de `pages/CheckoutPage.tsx`, onde tinha um consumidor só. A feature
// `58` criou o segundo (`pages/OrderPaymentPage.tsx`, a rota do pagamento), e a regra do
// repositório para "duas páginas precisam da mesma peça" é uma camada estritamente abaixo das duas
// (`AD-033`) — aqui `widgets/`, porque os dois consumidores vivem no MESMO app. Deixá-lo no
// `CheckoutPage` e importar de `pages/` para `pages/` seria import lateral; copiá-lo seria o
// "defeito 01" com o header da tela onde a cliente paga.
//
// **Por que ele existe em vez do `StoreLayout`**: as duas rotas ficam fora do layout da loja
// porque `CHK-10` pede header próprio, sem navegação de categorias — sair daqui é decisão, não
// tropeço —, e porque o `MobileNav` fixo disputaria o rodapé com o conteúdo.
//
// A marca é **SVG inline** (`EstrelinhaSignature`), nunca `<img src>`: o header não pode ter
// estado de carregamento. O degrau da assinatura tem piso de 190px e aqui ela sai a 200.
//
// **Abaixo de `sm` ela sai a 180px, ABAIXO do piso, e é exceção declarada** (decisão do usuário,
// 2026-10-04): no celular a marca disputava a linha com "Ambiente seguro". O piso foi calculado em
// pixel CSS com DPR 1 — a 180px o traço da marca mede 0,96px CSS, que num celular (DPR 2–3) são
// 1,9–2,9 pixels físicos e sai nítido. A exceção é feita pelo CSS, com o componente recebendo 200:
// passar `width={180}` faria a escada trocar a assinatura pelo símbolo, que é outro desenho.
//
// **Quem cede quando a linha não cabe é o texto, nunca a marca.** Em 320 px com a fonte do sistema
// a 200 %, os 180 px fixos da marca e "Ambiente seguro" não cabem lado a lado: a linha quebra
// (`flex-wrap`) e o bloco desce para baixo da marca, que não encolhe (`shrink-0`). O `min-w-0` deixa
// o bloco embrulhar dentro da própria linha se nem ela couber — sem ele o corpo rola de lado.
import { Link } from 'react-router-dom'
import { Lock, MessageCircle } from 'lucide-react'

import { EstrelinhaSignature } from '@estrelinha/ui/brand'

const CheckoutHeader = () => (
  <header className="border-b border-estrelinha-line bg-white">
    <div className="container flex flex-wrap items-center justify-between gap-x-4 gap-y-3 py-5">
      <Link to="/" aria-label="Uma Estrelinha" className="shrink-0">
        <EstrelinhaSignature width={200} className="h-auto w-[180px] sm:w-[200px]" />
      </Link>
      <div className="flex min-w-0 items-center gap-5 text-sm font-medium">
        <span className="flex items-center gap-[7px] text-estrelinha-ink">
          <Lock className="h-[15px] w-[15px] text-estrelinha-primary" aria-hidden />
          Ambiente seguro
        </span>
        <span className="hidden h-[18px] w-px bg-estrelinha-line sm:block" />
        <span className="hidden items-center gap-[7px] text-estrelinha-ink-soft sm:flex">
          <MessageCircle className="h-[15px] w-[15px]" aria-hidden />
          Ajuda no WhatsApp
        </span>
      </div>
    </div>
  </header>
)

export default CheckoutHeader
