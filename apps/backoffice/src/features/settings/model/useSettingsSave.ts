// Como um card de Configurações salva — feature 55.
//
// Antes da 55 havia **um** `save()` na `AdminSettingsPage`, com seis ramos num ternário encadeado
// escolhendo qual pedaço do estado mandar, e um tipo (`PageSettingsKey`) que existia só para tornar
// `save('notifications')` inalcançável pelo `tsc`. Com as seções autocontidas aquele `save` central
// deixa de existir — e o que sobra é isto: a mecânica comum (gravar, avisar, avisar se falhar),
// num lugar só.
//
// O texto dos dois avisos é o de hoje, palavra por palavra. Eles são lidos pela dona logo depois de
// clicar em salvar, e mudá-los "de passagem" numa feature de navegação seria mexer no que a tela diz
// sem que nenhuma AC peça.

import { useUpdateSettings } from '@estrelinha/core/hooks/useStoreSettings'
import { useToast } from '@estrelinha/ui/hooks/use-toast'
import type { SettingsKey } from '@estrelinha/supabase/types/settings'

export interface SettingsSave {
  /** Grava uma chave de `store_settings` e avisa — no sucesso e na falha. */
  salvar: (key: SettingsKey, value: unknown) => Promise<void>
  salvando: boolean
}

export const useSettingsSave = (): SettingsSave => {
  const update = useUpdateSettings()
  const { toast } = useToast()

  const salvar = async (key: SettingsKey, value: unknown) => {
    try {
      await update.mutateAsync({ key, value } as Parameters<typeof update.mutateAsync>[0])
      toast({ title: 'Configurações salvas', description: 'As alterações já estão valendo na loja.' })
    } catch (e) {
      toast({
        title: 'Erro ao salvar',
        description: e instanceof Error ? e.message : 'Tente novamente.',
        variant: 'destructive',
      })
    }
  }

  return { salvar, salvando: update.isPending }
}
