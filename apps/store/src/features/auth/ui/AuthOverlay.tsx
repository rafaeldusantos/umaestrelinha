import { Check } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@estrelinha/ui/dialog'
import { Drawer, DrawerContent, DrawerTitle } from '@estrelinha/ui/drawer'
import { useIsMobile } from '@estrelinha/ui/hooks/use-mobile'
import { formatPrice } from '@estrelinha/core/formatters'
import { useFreeShipping } from '@estrelinha/core/hooks/useFreeShipping'
import { EstrelinhaSignature } from '@/shared/ui/brand'
import { useAuthUiStore } from '../model/authUiStore'
import type { AuthStep } from '../model/authUiStore'
import AuthEntry from './steps/AuthEntry'
import AuthCodeStep from './steps/AuthCodeStep'
import AuthNameStep from './steps/AuthNameStep'
import AuthPasswordStep from './steps/AuthPasswordStep'
import AuthResetStep from './steps/AuthResetStep'
import AuthResetCodeStep from './steps/AuthResetCodeStep'
import AuthNewPasswordStep from './steps/AuthNewPasswordStep'

const StepView = ({ step }: { step: AuthStep }) => {
  switch (step) {
    case 'code':
      return <AuthCodeStep />
    case 'name':
      return <AuthNameStep />
    case 'password':
      return <AuthPasswordStep />
    case 'reset':
      return <AuthResetStep />
    case 'reset-code':
      return <AuthResetCodeStep />
    case 'new-password':
      return <AuthNewPasswordStep />
    default:
      return <AuthEntry />
  }
}

/**
 * Os dois que não dependem de configuração nenhuma, e que seguram o painel sozinhos.
 *
 * O terceiro item — o do frete grátis — **saiu daqui** na feature 37 (`FRG-13`). Ele era
 * `'Frete grátis acima de R$150'`, literal no JSX, e portanto a única superfície da loja que
 * continuava prometendo um número que o painel já não decidia: a `PDP-24` corrigiu a `PoliciesPage`,
 * a feature 24 corrigiu a `MarqueeBar`, e este sobreviveu às duas. Hoje ele nasce das settings,
 * abaixo, e some com o interruptor desligado.
 */
const BENEFITS = ['Peça única, feita à mão', 'Acompanhe seu pedido do início ao fim']

const BrandPanel = () => {
  const freteGratis = useFreeShipping()
  const benefits = freteGratis.active
    ? [`Frete grátis acima de ${formatPrice(freteGratis.threshold)}`, ...BENEFITS]
    : BENEFITS

  return (
    <div
      data-testid="auth-brand-panel"
      className="flex w-[320px] shrink-0 flex-col justify-between bg-estrelinha-ink p-8 text-white"
    >
      <div>
        <EstrelinhaSignature width={200} tone="onInk" />
        <p className="mt-1 text-sm text-white/70">Eternizando suas lembranças.</p>
      </div>
      <ul className="space-y-3">
        {benefits.map((b) => (
          <li key={b} className="flex items-center gap-2.5 text-sm text-white/85">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm bg-white/[0.12] text-estrelinha-accent">
              <Check className="w-3.5 h-3.5" />
            </span>
            {b}
          </li>
        ))}
      </ul>
    </div>
  )
}

const AuthOverlay = () => {
  const isOpen = useAuthUiStore((s) => s.isOpen)
  const step = useAuthUiStore((s) => s.step)
  const close = useAuthUiStore((s) => s.close)
  const isMobile = useIsMobile()

  const onOpenChange = (open: boolean) => {
    if (!open) close()
  }

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onOpenChange}>
        <DrawerContent className="bg-white px-6 pb-8">
          <DrawerTitle className="sr-only">Acesso à conta</DrawerTitle>
          <div className="pt-2">
            <StepView step={step} />
          </div>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 overflow-hidden max-w-[800px] gap-0 border-estrelinha-line">
        <DialogTitle className="sr-only">Acesso à conta</DialogTitle>
        <div className="flex">
          <BrandPanel />
          <div className="flex-1 p-10 bg-white">
            <StepView step={step} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default AuthOverlay
