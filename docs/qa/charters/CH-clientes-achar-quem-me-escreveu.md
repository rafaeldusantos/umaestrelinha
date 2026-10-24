# CH-clientes-achar-quem-me-escreveu: achar a cliente que mandou mensagem colando o que tenho dela (nome, e-mail, telefone com m

```yaml
charter:
  id: CH-clientes-achar-quem-me-escreveu
  mission: "Como a Adri no celular, achar a cliente que mandou mensagem colando o que tenho dela (nome, e-mail, telefone com máscara) e abrir a ficha, porque é o uso de todo dia e um termo colado com sujeira não pode dar Não achei ninguém."
  mode: charter-with-tour
  persona:
    name: Adri no celular
    device: phone-large
    network: 4g
    locale: pt-BR
  journey: J-achar-uma-cliente
  scenarios: [MAD-clientes-abrir-a-lista, MAD-clientes-buscar-nome-email-telefone, MAD-clientes-estados-vazios, MAD-clientes-linha-sem-nome-sem-compra, MAD-cliente-abrir-e-entender, MAD-cliente-whatsapp-em-branco]
  tour: Paste Tour
  time_box_minutes: 60
  guidance:
    must_try:
      - "telefone colado como (51) 99812-4471, 51998124471, +55 51 99812-4471 e só 99812; e-mail em maiúsculas; nome com acento; espaços e quebra de linha antes e depois"
      - "%, _, barra invertida, parênteses e vírgula no termo (nunca erro, nunca curinga); digitar rápido trocando de termo"
      - "abrir o achado e conferir cada bloco contra /admin/clientes/<id>; o href do WhatsApp (55 e o número certo, nova aba, conversa em branco)"
      - "cadastro sem nome, sem telefone e sem compra da fixtura: o que a linha e a ficha dizem"
    must_avoid:
      - "CPF na busca: não deve achar ninguém, mas não é defeito"
      - "abrir o app do WhatsApp de verdade (aparelho, blocked-verify)"
```
