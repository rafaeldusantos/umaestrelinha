// Feature 30 · GSH-16 — desligar depois de ligado NÃO é neutro.
//
// Um interruptor comum sugere que ligar e desligar são simétricos. Aqui não são: enquanto o Google
// nunca buscou o feed, desligar não custa nada; depois que ele buscou, desligar faz as buscas
// falharem e as ofertas expirarem — os produtos somem do Shopping.
//
// O diálogo existe para **escrever esse efeito**, não para pedir mais um clique. Por isso a frase
// está aqui, e por isso o teste assere a frase e não a existência do diálogo.

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@estrelinha/ui/alert-dialog'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export const DisableFeedDialog = ({ open, onOpenChange, onConfirm }: Props) => (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Desligar tira seus produtos do Google</AlertDialogTitle>
        <AlertDialogDescription>
          O Google deixa de buscar o feed e os produtos saem do Shopping. Voltar a ligar não devolve
          o histórico das ofertas — elas entram como novas e passam por revisão outra vez.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Manter ligada</AlertDialogCancel>
        <AlertDialogAction onClick={onConfirm}>Desligar mesmo assim</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
)
