import { Check } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@estrelinha/ui/dialog'
import { Drawer, DrawerContent, DrawerTitle } from '@estrelinha/ui/drawer'
import { useIsMobile } from '@estrelinha/ui/hooks/use-mobile'
import { NanitaWordmark } from '@/shared/ui/brand'
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

const BENEFITS = ['Frete grátis acima de R$150', 'Drops exclusivos toda semana', '+2.000 colecionadores felizes']

const BrandPanel = () => (
  <div
    data-testid="auth-brand-panel"
    className="flex w-[320px] shrink-0 flex-col justify-between bg-nanita-ink p-8 text-white"
  >
    <div>
      <NanitaWordmark width={180} />
      <p className="mt-1 text-sm text-white/70">Cole no peito, carrega no coração.</p>
    </div>
    <ul className="space-y-3">
      {BENEFITS.map((b) => (
        <li key={b} className="flex items-center gap-2.5 text-sm text-white/85">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm bg-white/[0.12] text-nanita-glaze">
            <Check className="w-3.5 h-3.5" />
          </span>
          {b}
        </li>
      ))}
    </ul>
  </div>
)

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
      <DialogContent className="p-0 overflow-hidden max-w-[800px] gap-0 border-nanita-border">
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
