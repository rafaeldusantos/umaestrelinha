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
import { Link } from 'react-router-dom'
import { Lock, MessageCircle } from 'lucide-react'

import { EstrelinhaSignature } from '@/shared/ui/brand'

const CheckoutHeader = () => (
  <header className="border-b border-estrelinha-line bg-white">
    <div className="container flex items-center justify-between py-5">
      <Link to="/" aria-label="Uma Estrelinha">
        <EstrelinhaSignature width={200} />
      </Link>
      <div className="flex items-center gap-5 text-sm font-medium">
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
