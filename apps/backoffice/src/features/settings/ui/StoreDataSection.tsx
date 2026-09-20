// Seção **Dados da loja** — feature 55.
//
// Junta o que antes eram as abas *Geral* e *SEO*: as duas respondem "quem é esta loja" — o nome, por
// onde se fala com ela, e como ela se apresenta a quem ainda não chegou. Separadas, a dona precisava
// lembrar que o título que aparece no Google mora numa aba diferente do nome da loja.
//
// **Autocontida**, no molde de `CheckoutSettingsCard`: próprio `useStoreSettings()`, próprio estado,
// próprio salvamento. É isso que faz a *Edge Case* "trocar de seção descarta a edição" ser
// propriedade da árvore — desmontou, acabou — em vez de depender de uma biblioteca de abas.

import { useEffect, useState } from 'react'
import { Input } from '@estrelinha/ui/input'
import { Textarea } from '@estrelinha/ui/textarea'
import { useStoreSettings } from '@estrelinha/core/hooks/useStoreSettings'
import {
  DEFAULT_GENERAL,
  DEFAULT_SEO,
  type GeneralSettings,
  type SeoSettings,
} from '@estrelinha/supabase/types/settings'
import { CharCounter, FormCard, FieldGroup, SettingsSaveButton } from '@/shared/ui'
import { useSettingsSave } from '../model/useSettingsSave'
import { SettingsLoading } from './settingsParts'

/**
 * Os tetos ANUNCIADOS dos campos de texto livre — feature 56 (`LEG-19`).
 *
 * Eles iam embutidos no rótulo ("Título padrão (até 60 caracteres)"), com o número **cravado na
 * frase** e a três linhas de distância do `maxLength` que de fato limita. Duas escritas do mesmo
 * número, e a que a dona lê não era a que o campo aplica.
 *
 * O `maxLength` é maior que o teto de propósito — mesmo desenho de `COPY_LIMITS` em `core`: o campo
 * deixa passar um pouco para o texto colado não ser **truncado sem aviso**, e o contador é quem
 * mostra que passou do ponto.
 */
const LIMITES = {
  seoTitle: 60,
  seoDescription: 160,
  whatsappMessage: 300,
} as const

export const StoreDataSection = () => {
  const { data, isLoading } = useStoreSettings()
  const { salvar, salvando } = useSettingsSave()

  const [general, setGeneral] = useState<GeneralSettings>(DEFAULT_GENERAL)
  const [seo, setSeo] = useState<SeoSettings>(DEFAULT_SEO)

  useEffect(() => {
    if (!data) return
    setGeneral(data.general)
    setSeo(data.seo)
  }, [data])

  if (isLoading) return <SettingsLoading />

  return (
    <div className="space-y-6">
      <FormCard title="Geral" description="O nome da loja e por onde a cliente fala com você">
        <FieldGroup label="Nome da loja" htmlFor="geral-nome">
          <Input id="geral-nome"
            value={general.store_name}
            onChange={e => setGeneral({ ...general, store_name: e.target.value })}
          />
        </FieldGroup>

        <div className="grid gap-4 sm:grid-cols-2">
          <FieldGroup label="WhatsApp (com DDD)" htmlFor="geral-whatsapp" hint="Ex: 5551999999999">
            <Input id="geral-whatsapp"
              value={general.whatsapp}
              onChange={e => setGeneral({ ...general, whatsapp: e.target.value.replace(/\D/g, '') })}
            />
          </FieldGroup>
          <FieldGroup label="E-mail de contato" htmlFor="geral-email">
            <Input id="geral-email"
              type="email"
              value={general.email}
              onChange={e => setGeneral({ ...general, email: e.target.value })}
            />
          </FieldGroup>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FieldGroup label="Instagram (@usuario)" htmlFor="geral-instagram">
            <Input id="geral-instagram"
              value={general.instagram}
              onChange={e => setGeneral({ ...general, instagram: e.target.value.replace(/^@/, '') })}
            />
          </FieldGroup>
          <FieldGroup label="TikTok (@usuario)" htmlFor="geral-tiktok">
            <Input id="geral-tiktok"
              value={general.tiktok}
              onChange={e => setGeneral({ ...general, tiktok: e.target.value.replace(/^@/, '') })}
            />
          </FieldGroup>
        </div>

        <FieldGroup
          label="Mensagem padrão do WhatsApp" htmlFor="geral-whatsapp-mensagem"
          hint="Texto pré-preenchido enviado quando o cliente clica no botão flutuante de chat."
          counter={<CharCounter value={general.whatsapp_message} limit={LIMITES.whatsappMessage} />}
        >
          <Textarea id="geral-whatsapp-mensagem"
            value={general.whatsapp_message}
            rows={3}
            maxLength={LIMITES.whatsappMessage}
            onChange={e => setGeneral({ ...general, whatsapp_message: e.target.value })}
            placeholder="Olá! Gostaria de tirar uma dúvida..."
          />
        </FieldGroup>

        <SettingsSaveButton
          testId="salvar-geral"
          loading={salvando}
          onClick={() => void salvar('general', general)}
        />
      </FormCard>

      <FormCard title="SEO" description="Como a loja se apresenta no Google e nas redes">
        <FieldGroup
          label="Título padrão"
          htmlFor="seo-titulo"
          counter={<CharCounter value={seo.title} limit={LIMITES.seoTitle} />}
        >
          <Input id="seo-titulo"
            value={seo.title}
            maxLength={LIMITES.seoTitle + 10}
            onChange={e => setSeo({ ...seo, title: e.target.value })}
          />
        </FieldGroup>
        <FieldGroup
          label="Descrição padrão"
          htmlFor="seo-descricao"
          counter={<CharCounter value={seo.description} limit={LIMITES.seoDescription} />}
        >
          <Textarea id="seo-descricao"
            value={seo.description}
            maxLength={LIMITES.seoDescription + 20}
            rows={3}
            onChange={e => setSeo({ ...seo, description: e.target.value })}
          />
        </FieldGroup>
        <FieldGroup label="Imagem Open Graph (URL)" htmlFor="seo-og-image">
          <Input id="seo-og-image"
            value={seo.og_image}
            onChange={e => setSeo({ ...seo, og_image: e.target.value })}
            placeholder="https://…"
          />
        </FieldGroup>

        <SettingsSaveButton
          testId="salvar-seo"
          loading={salvando}
          onClick={() => void salvar('seo', seo)}
        />
      </FormCard>
    </div>
  )
}

export default StoreDataSection
