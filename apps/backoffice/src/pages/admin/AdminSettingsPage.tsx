import { useEffect, useState } from 'react'
import { Loader2, PackageOpen, Save, Settings as SettingsIcon, ShoppingCart } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@estrelinha/ui/tabs'
import { Input } from '@estrelinha/ui/input'
import { Button } from '@estrelinha/ui/button'
import { Textarea } from '@estrelinha/ui/textarea'
import { useToast } from '@estrelinha/ui/hooks/use-toast'
import { PageHeader, FormCard, FieldGroup, ToggleField } from '@/shared/ui'
import { CheckoutSettingsCard } from '@/features/settings'
import {
  useStoreSettings,
  useUpdateSettings,
} from '@estrelinha/core/hooks/useStoreSettings'
import { freeShippingRefusal } from '@estrelinha/core/shipping'
import {
  DEFAULT_GENERAL,
  DEFAULT_PAYMENT,
  DEFAULT_SEO,
  DEFAULT_SHIPPING,
  DEFAULT_ABANDONED_CART,
  DEFAULT_MATERIAL,
  type GeneralSettings,
  type PaymentSettings,
  type SeoSettings,
  type ShippingSettings,
  type AbandonedCartSettings,
  type MaterialSettings,
  type SettingsKey,
} from '@estrelinha/supabase/types/settings'

/**
 * Chaves salvas por **esta página**. Derivada da união canônica de
 * `@estrelinha/supabase/types/settings` — nunca redeclarada — menos `checkout`, que é salva pelo
 * `CheckoutSettingsCard` (`features/settings`). Aqui existia uma união local duplicada sem
 * `'checkout'`: a chave nova ficava fora do tipo e não tinha como ser salva.
 */
type PageSettingsKey = Exclude<SettingsKey, 'checkout'>

const AdminSettingsPage = () => {
  const { data, isLoading } = useStoreSettings()
  const update = useUpdateSettings()
  const { toast } = useToast()

  const [general, setGeneral] = useState<GeneralSettings>(DEFAULT_GENERAL)
  const [shipping, setShipping] = useState<ShippingSettings>(DEFAULT_SHIPPING)
  const [payment, setPayment] = useState<PaymentSettings>(DEFAULT_PAYMENT)
  const [seo, setSeo] = useState<SeoSettings>(DEFAULT_SEO)
  const [abandonedCart, setAbandonedCart] = useState<AbandonedCartSettings>(DEFAULT_ABANDONED_CART)
  const [material, setMaterial] = useState<MaterialSettings>(DEFAULT_MATERIAL)

  useEffect(() => {
    if (!data) return
    setGeneral(data.general)
    setShipping(data.shipping)
    setPayment(data.payment)
    setSeo(data.seo)
    setAbandonedCart(data.abandoned_cart)
    setMaterial(data.material)
  }, [data])

  const save = async (key: PageSettingsKey) => {
    /**
     * `FRG-12` — a aba Frete recusa "ligado, a partir de R$ 0" **antes** de qualquer escrita.
     *
     * Sem esta guarda o painel exibiria "frete grátis ligado" enquanto a loja se comporta como
     * desligada (`freeShippingState` trata faixa ≤ 0 como inativa). Divergência silenciosa entre o
     * que a dona lê e o que a cliente vive é a família de defeito que a feature 37 existe para
     * fechar — deixá-la entrar pela porta do editor seria trocar um segundo dono por outro.
     *
     * O veredito é `string | null`, e não união discriminada por booleano: com
     * `strictNullChecks: false` aquela forma não estreita. Mesmo formato de `reservedSlugRefusal`.
     */
    if (key === 'shipping') {
      const motivo = freeShippingRefusal(shipping)
      if (motivo) {
        toast({ title: 'Frete grátis sem valor mínimo', description: motivo, variant: 'destructive' })
        return
      }
    }

    try {
      const value =
        key === 'general' ? general :
        key === 'shipping' ? shipping :
        key === 'payment' ? payment :
        key === 'seo' ? seo :
        key === 'material' ? material :
        abandonedCart
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando configurações…
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        icon={SettingsIcon}
        title="Configurações da Loja"
        subtitle="Centralize aqui dados de contato, frete, material, pagamento, checkout e SEO."
      />

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid grid-cols-3 w-full max-w-2xl sm:grid-cols-7">
          <TabsTrigger value="general">Geral</TabsTrigger>
          <TabsTrigger value="shipping">Frete</TabsTrigger>
          <TabsTrigger value="material">Material</TabsTrigger>
          <TabsTrigger value="payment">Pagamento</TabsTrigger>
          <TabsTrigger value="checkout">Checkout</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
          <TabsTrigger value="abandoned_cart">Carrinho</TabsTrigger>
        </TabsList>

        {/* GERAL */}
        <TabsContent value="general" className="mt-4">
          <FormCard>
            <FieldGroup label="Nome da loja">
              <Input value={general.store_name} onChange={(e) => setGeneral({ ...general, store_name: e.target.value })} />
            </FieldGroup>
            <div className="grid sm:grid-cols-2 gap-4">
              <FieldGroup label="WhatsApp (com DDD)" hint="Ex: 5551999999999">
                <Input value={general.whatsapp} onChange={(e) => setGeneral({ ...general, whatsapp: e.target.value.replace(/\D/g, '') })} />
              </FieldGroup>
              <FieldGroup label="E-mail de contato">
                <Input type="email" value={general.email} onChange={(e) => setGeneral({ ...general, email: e.target.value })} />
              </FieldGroup>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <FieldGroup label="Instagram (@usuario)">
                <Input value={general.instagram} onChange={(e) => setGeneral({ ...general, instagram: e.target.value.replace(/^@/, '') })} />
              </FieldGroup>
              <FieldGroup label="TikTok (@usuario)">
                <Input value={general.tiktok} onChange={(e) => setGeneral({ ...general, tiktok: e.target.value.replace(/^@/, '') })} />
              </FieldGroup>
            </div>
            <FieldGroup
              label="Mensagem padrão do WhatsApp"
              hint="Texto pré-preenchido enviado quando o cliente clica no botão flutuante de chat."
            >
              <Textarea
                value={general.whatsapp_message}
                rows={3}
                maxLength={300}
                onChange={(e) => setGeneral({ ...general, whatsapp_message: e.target.value })}
                placeholder="Olá! Gostaria de tirar uma dúvida..."
              />
            </FieldGroup>
            <SaveButton loading={update.isPending} onClick={() => save('general')} />
          </FormCard>
        </TabsContent>

        {/* FRETE */}
        <TabsContent value="shipping" className="mt-4">
          <FormCard>
            {/*
              FRG-02 — o interruptor do frete grátis.

              Antes da feature 37 só existia o campo do valor, e zerá-lo era a única saída aparente
              para desligar o benefício. Não desligava: três superfícies da loja liam o zero como
              "não temos frete grátis" e escondiam o texto, enquanto quatro faziam
              `subtotal >= 0` — sempre verdadeiro — e ZERAVAM O FRETE. Zerar o campo escondia o
              anúncio e liberava frete grátis para todo mundo no caixa.

              O campo do valor fica DESABILITADO e não escondido: a Adri precisa ver o número que
              está guardado para decidir se quer religar com ele. Desligar não apaga a configuração.
            */}
            <ToggleField
              label="Oferecer frete grátis"
              description="Quando desligado, a loja não anuncia frete grátis em nenhuma tela e o frete é cobrado normalmente. Cupons de frete grátis continuam valendo."
              checked={shipping.free_shipping_enabled}
              onChange={(v) => setShipping({ ...shipping, free_shipping_enabled: v })}
            />
            <div className="grid sm:grid-cols-2 gap-4">
              <FieldGroup
                label="Frete grátis a partir de (R$)"
                htmlFor="free-shipping-threshold"
                hint={
                  shipping.free_shipping_enabled
                    ? undefined
                    : 'Guardado. Volta a valer quando você ligar o frete grátis.'
                }
              >
                <Input
                  id="free-shipping-threshold"
                  type="number"
                  step="0.01"
                  min={0}
                  disabled={!shipping.free_shipping_enabled}
                  value={shipping.free_shipping_threshold}
                  onChange={(e) => setShipping({ ...shipping, free_shipping_threshold: Number(e.target.value) || 0 })}
                />
              </FieldGroup>
              <FieldGroup label="Custo de frete padrão (R$)" hint="Usado como fallback quando o cálculo não está disponível.">
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={shipping.default_shipping_cost}
                  onChange={(e) => setShipping({ ...shipping, default_shipping_cost: Number(e.target.value) || 0 })}
                />
              </FieldGroup>
            </div>
            {/*
              O campo "CEP de origem" saiu daqui em 2026-09-05, e a remoção é o conserto — não uma
              simplificação.

              Ele era editável e **nenhum arquivo o lia**. A origem da cotação sempre veio do
              `postal_code` do secret `MELHOR_ENVIO_SENDER_JSON`, que é o mesmo endereço impresso na
              etiqueta. Preencher o campo aqui não mudava um centavo, e o tipo em
              `packages/supabase/src/types/settings.ts` ainda afirmava que ele era a origem — dois
              donos, um deles morto e o outro documentado errado.

              Por que o dono único é o secret, e não este campo: a etiqueta precisa do endereço por
              extenso, com CPF e telefone, e isso não cabe (nem deve caber) numa linha de
              `store_settings` legível por quem tiver acesso ao painel. Se o CEP fosse configurável
              aqui, a origem da COTAÇÃO e a origem da ETIQUETA passariam a poder divergir — a loja
              cotaria de um lugar e postaria de outro, sem nada em tela dizendo por quê. É a mesma
              família de defeito que esta remoção fecha.

              A chave continua no banco (migration aplicada é imutável) e em `DEFAULT_SHIPPING`;
              `originZipNotRead.test.ts` impede que alguma tela volte a lê-la.
            */}
            <p className="text-sm text-muted-foreground">
              O CEP de origem dos cálculos é o endereço cadastrado na sua conta do Melhor Envio — o
              mesmo que é impresso na etiqueta. Para alterá-lo, mude o endereço lá.
            </p>
            <SaveButton loading={update.isPending} onClick={() => save('shipping')} />
          </FormCard>
        </TabsContent>

        {/*
          MATERIAL — para onde a cliente posta o material afetivo.

          Fica aqui, e não no código, porque mudar de endereço é operação da dona; com o endereço em
          `.tsx` ela viraria um deploy. E é OUTRA remessa: a origem da cotação do Melhor Envio
          (ateliê → cliente) vem do secret `MELHOR_ENVIO_SENDER_JSON`; esta é a chegada
          (cliente → ateliê), e precisa do endereço por extenso para caber numa etiqueta escrita à mão.

          Enquanto o logradouro estiver vazio, a página "Como enviar" NÃO mostra endereço nenhum —
          mostra o convite a falar pela loja. Endereço pela metade é material insubstituível postado
          para lugar nenhum, e não há segunda via.
        */}
        <TabsContent value="material" className="mt-4">
          <FormCard>
            <div className="flex items-start gap-3 p-3 rounded-xl bg-muted">
              <PackageOpen className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                Este endereço aparece na página <strong>Como enviar o material</strong>. Enquanto o
                logradouro estiver vazio, a loja não mostra endereço nenhum — pede que a cliente
                combine o envio com você.
              </p>
            </div>

            <FieldGroup
              label="Destinatário"
              hint="A quem endereçar o envelope. Sem isto a cliente escreve só o nome da loja."
            >
              <Input
                value={material.recipient}
                onChange={(e) => setMaterial({ ...material, recipient: e.target.value })}
                placeholder="Adri Muniz"
              />
            </FieldGroup>

            <div className="grid sm:grid-cols-[1fr_140px] gap-4">
              <FieldGroup label="Logradouro">
                <Input
                  value={material.street}
                  onChange={(e) => setMaterial({ ...material, street: e.target.value })}
                  placeholder="Rua …"
                />
              </FieldGroup>
              <FieldGroup label="Número">
                <Input
                  value={material.number}
                  onChange={(e) => setMaterial({ ...material, number: e.target.value })}
                />
              </FieldGroup>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <FieldGroup label="Complemento">
                <Input
                  value={material.complement}
                  onChange={(e) => setMaterial({ ...material, complement: e.target.value })}
                  placeholder="Apto, sala, referência"
                />
              </FieldGroup>
              <FieldGroup label="Bairro">
                <Input
                  value={material.neighborhood}
                  onChange={(e) => setMaterial({ ...material, neighborhood: e.target.value })}
                />
              </FieldGroup>
            </div>

            <div className="grid sm:grid-cols-[1fr_100px_160px] gap-4">
              <FieldGroup label="Cidade">
                <Input
                  value={material.city}
                  onChange={(e) => setMaterial({ ...material, city: e.target.value })}
                />
              </FieldGroup>
              <FieldGroup label="UF">
                <Input
                  value={material.state}
                  onChange={(e) =>
                    setMaterial({ ...material, state: e.target.value.toUpperCase().slice(0, 2) })
                  }
                  placeholder="RS"
                />
              </FieldGroup>
              <FieldGroup label="CEP">
                <Input
                  value={material.zip}
                  onChange={(e) =>
                    setMaterial({ ...material, zip: e.target.value.replace(/\D/g, '').slice(0, 8) })
                  }
                  placeholder="00000000"
                />
              </FieldGroup>
            </div>

            <FieldGroup
              label="Observação para quem envia"
              hint="Aparece junto do endereço. Ex.: horário de recebimento, como embalar."
            >
              <Textarea
                value={material.notes}
                rows={3}
                maxLength={400}
                onChange={(e) => setMaterial({ ...material, notes: e.target.value })}
              />
            </FieldGroup>

            <SaveButton loading={update.isPending} onClick={() => save('material')} />
          </FormCard>
        </TabsContent>

        {/* PAGAMENTO */}
        <TabsContent value="payment" className="mt-4">
          <FormCard>
            <ToggleField
              label="PIX habilitado"
              checked={payment.pix_enabled}
              onChange={(v) => setPayment({ ...payment, pix_enabled: v })}
            />
            <FieldGroup label="Desconto no PIX (%)">
              <Input
                type="number"
                min={0}
                max={50}
                value={payment.pix_discount_percent}
                onChange={(e) => setPayment({ ...payment, pix_discount_percent: Number(e.target.value) || 0 })}
              />
            </FieldGroup>
            <ToggleField
              label="Cartão de crédito habilitado"
              checked={payment.card_enabled}
              onChange={(v) => setPayment({ ...payment, card_enabled: v })}
            />
            <div className="grid sm:grid-cols-2 gap-4">
              <FieldGroup label="Máximo de parcelas">
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={payment.max_installments}
                  onChange={(e) => setPayment({ ...payment, max_installments: Number(e.target.value) || 1 })}
                />
              </FieldGroup>
              <FieldGroup label="Valor mínimo da parcela (R$)">
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={payment.min_installment_value}
                  onChange={(e) => setPayment({ ...payment, min_installment_value: Number(e.target.value) || 0 })}
                />
              </FieldGroup>
            </div>
            <SaveButton loading={update.isPending} onClick={() => save('payment')} />
          </FormCard>
        </TabsContent>

        {/* CHECKOUT — order bump (BMP-06). O card salva a chave `checkout` por conta própria. */}
        <TabsContent value="checkout" className="mt-4">
          <CheckoutSettingsCard />
        </TabsContent>

        {/* SEO */}
        <TabsContent value="seo" className="mt-4">
          <FormCard>
            <FieldGroup label="Título padrão (até 60 caracteres)">
              <Input
                value={seo.title}
                maxLength={70}
                onChange={(e) => setSeo({ ...seo, title: e.target.value })}
              />
            </FieldGroup>
            <FieldGroup label="Descrição padrão (até 160 caracteres)">
              <Textarea
                value={seo.description}
                maxLength={180}
                rows={3}
                onChange={(e) => setSeo({ ...seo, description: e.target.value })}
              />
            </FieldGroup>
            <FieldGroup label="Imagem Open Graph (URL)">
              <Input value={seo.og_image} onChange={(e) => setSeo({ ...seo, og_image: e.target.value })} placeholder="https://…" />
            </FieldGroup>
            <SaveButton loading={update.isPending} onClick={() => save('seo')} />
          </FormCard>
        </TabsContent>

        {/* CARRINHO ABANDONADO */}
        <TabsContent value="abandoned_cart" className="mt-4">
          <FormCard>
            <div className="flex items-start gap-3 p-3 rounded-xl bg-muted">
              <ShoppingCart className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                Configure quando um carrinho parado vira "abandonado" e prepare a recuperação automática por email
                (envio será habilitado na Fase 2, quando o provedor de email estiver configurado).
              </p>
            </div>

            <FieldGroup
              label="Marcar como abandonado após (horas)"
              hint="Tempo de inatividade antes de mudar o status de 'ativo' para 'abandonado'. Recomendado: 4h."
            >
              <Input
                type="number"
                min={1}
                max={72}
                value={abandonedCart.threshold_hours}
                onChange={(e) => setAbandonedCart({ ...abandonedCart, threshold_hours: Number(e.target.value) || 1 })}
              />
            </FieldGroup>

            <ToggleField
              label="Enviar email de lembrete automaticamente"
              checked={abandonedCart.auto_email_enabled}
              onChange={(v) => setAbandonedCart({ ...abandonedCart, auto_email_enabled: v })}
            />

            <FieldGroup
              label="Enviar lembrete após (horas)"
              hint="Tempo após o carrinho ficar abandonado para enviar o email. Recomendado: 24h."
            >
              <Input
                type="number"
                min={1}
                max={168}
                disabled={!abandonedCart.auto_email_enabled}
                value={abandonedCart.auto_email_hours}
                onChange={(e) => setAbandonedCart({ ...abandonedCart, auto_email_hours: Number(e.target.value) || 1 })}
              />
            </FieldGroup>

            <FieldGroup
              label="Cupom de incentivo (opcional)"
              hint="Código do cupom incluído no email de recuperação. Deixe vazio para não oferecer desconto."
            >
              <Input
                value={abandonedCart.reminder_coupon_code}
                onChange={(e) =>
                  setAbandonedCart({
                    ...abandonedCart,
                    reminder_coupon_code: e.target.value.toUpperCase().replace(/\s/g, ''),
                  })
                }
                placeholder="VOLTA10"
                className="font-mono uppercase"
              />
            </FieldGroup>

            <SaveButton loading={update.isPending} onClick={() => save('abandoned_cart')} />
          </FormCard>
        </TabsContent>
      </Tabs>
    </div>
  )
}

const SaveButton = ({ loading, onClick }: { loading: boolean; onClick: () => void }) => (
  <div className="pt-2">
    <Button
      onClick={onClick}
      disabled={loading}
      className="rounded-xl gradient-cta text-white hover:brightness-110 hover:scale-[1.02] transition-all"
    >
      {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
      Salvar alterações
    </Button>
  </div>
)

export default AdminSettingsPage
