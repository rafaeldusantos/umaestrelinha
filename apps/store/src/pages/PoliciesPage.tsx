const PoliciesPage = () => (
  <div className="container py-12 max-w-2xl">
    <h1 className="font-heading text-3xl font-semibold text-nanita-ink mb-8">Políticas</h1>
    <div className="bg-white rounded-2xl border border-nanita-border p-8 space-y-6 text-nanita-plum leading-relaxed">
      <section>
        <h2 className="font-heading font-bold text-lg text-nanita-ink mb-2">Envio</h2>
        <p>Enviamos para todo o Brasil via Correios. Prazo de postagem: até 3 dias úteis após confirmação do pagamento.</p>
        <p className="mt-1">Frete grátis para compras acima de R$ 150!</p>
      </section>
      <section>
        <h2 className="font-heading font-bold text-lg text-nanita-ink mb-2">Pagamento</h2>
        <p>Aceitamos Pix e cartão de crédito. 5% de desconto no PIX!</p>
      </section>
      <section>
        <h2 className="font-heading font-bold text-lg text-nanita-ink mb-2">Trocas e Devoluções</h2>
        <p>Caso receba um produto com defeito, entre em contato em até 7 dias. Faremos a troca sem custo adicional.</p>
      </section>
      <section>
        <h2 className="font-heading font-bold text-lg text-nanita-ink mb-2">Privacidade</h2>
        <p>Seus dados pessoais são utilizados exclusivamente para processamento e envio dos pedidos. Não compartilhamos informações com terceiros.</p>
      </section>
    </div>
  </div>
)

export default PoliciesPage
