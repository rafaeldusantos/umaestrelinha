// `/cuidados-com-sua-joia-afetiva` — Cuidados com sua joia afetiva.
//
// **O texto é o publicado hoje** em `umaestrelinha.com.br/cuidados-com-sua-joia-afetiva/`, lido em
// 2026-09-12 e preservado frase a frase: são as instruções de conservação da própria Adri, não copy
// de marketing a melhorar. As únicas mudanças em relação ao original são de **consistência**, não de
// conteúdo — a mesma régua que a `ReturnsPolicyPage` já aplicou ao `✨`:
//
// - "jóia" (grafia antiga) virou "joia", como em todo o resto da loja;
// - "Não limpar a prata com água quente" virou o imperativo "Não limpe…", para casar com o resto da
//   lista ("Evite…", "Não use…", "Retire…");
// - "giz enrolada" virou "giz enrolado" (concordância) e "multi camadas"/"Semijoia" perderam o
//   espaço e a maiúscula soltos;
// - "Ouro"/"Verniz Suíço"/"Prata 1000" no meio de frase perderam a maiúscula — não são nome próprio.
//
// Segue o mesmo molde de `ReturnsPolicyPage`/`PrivacyPolicyPage`: um documento (`PolicyDocument`),
// sem `PolicyContact` — o texto original não tem chamada para contato, é só a ficha de cuidados.

import { JEWELRY_CARE_PATH } from '@estrelinha/core/routes'
import PolicyDocument, { PolicyList, PolicySection } from '@/shared/ui/PolicyDocument'
import { useCanonical } from '@/shared/lib/useCanonical'

const CUIDADOS_GERAIS = [
  'Evite dormir com ela.',
  'Evite molhar tomando banho de chuveiro, mar ou piscina.',
  'Evite contato com produtos químicos como perfumes, cremes, protetor solar, entre outros.',
  'Não pratique exercícios físicos usando a joia.',
  'Lembre-se de guardar as peças separadamente para evitar atrito ou riscos desnecessários.',
  'Tenha sempre o maior carinho do mundo para manusear sua joia.',
]

const RESINA_POR_MAIS_TEMPO = [
  'Evite a exposição demasiada ao sol, pois pode deixar a joia opaca.',
  'Não use produtos abrasivos ou fórmulas prontas para limpeza.',
  'Caso sua joia contenha leite materno, com o tempo ela pode vir a amarelar, o que a torna ainda mais especial.',
  'Para limpeza de sua joia, utilize uma flanela limpa e seca.',
]

const CUIDADOS_PRATA_925 = [
  'Após o uso sempre limpe a prata com uma flanela limpa ou com produtos próprios para limpeza. Mas tome cuidado para que o produto não toque na sua joia de resina, pois pode acabar danificando sua joia de resina.',
  'Não limpe a prata com água quente.',
  'Para manter uma maior durabilidade da joia, guarde em uma caixa com um pedaço de giz enrolado em um papel toalha, ou enrolado em papel alumínio. Assim ela não terá contato com a umidade.',
]

const CUIDADOS_BANHADAS = [
  'Depois de usar a joia sempre faça a limpeza com uma flanela seca para que o desgaste natural ocorra de uma forma mais lenta.',
  'Depois de limpar, guarde-a separadamente em saquinhos de papel, ou embrulhe em papel toalha.',
  'Nas peças banhadas a ouro/prata existe um desgaste natural. Para mantê-las novas é recomendado dar um novo banho de ouro/prata sempre que necessário.',
  'Pessoas que possuem um elevado índice de ácido úrico, nervosas ou que estejam fazendo uso de algum medicamento podem escurecer as peças.',
  'Pessoas que fazem tratamentos com medicamentos de uso contínuo ou quimioterapia podem causar reação na qualidade do folheado quando em contato com a pele (casos raros).',
  'Não use pasta de dente, álcool, ou acetona na limpeza. E nunca coloque em água fervente com sabão.',
  'Retire sempre que for pintar os cabelos.',
  'Pessoas que utilizam progressiva ou química forte no cabelo também podem causar desbotamento ou manchas nas peças.',
]

const JewelryCarePage = () => {
  useCanonical(JEWELRY_CARE_PATH)

  return (
    <PolicyDocument titulo="Cuidados com sua joia afetiva" paginaAtual="Cuidados com sua joia afetiva">
      <PolicySection titulo="Cuidados gerais com a joia">
        <PolicyList itens={CUIDADOS_GERAIS} />
      </PolicySection>

      <PolicySection titulo="Sua joia de resina bonita por mais tempo">
        <PolicyList itens={RESINA_POR_MAIS_TEMPO} />
      </PolicySection>

      <PolicySection titulo="Se sua joia contém peças de Prata 925">
        <p>
          A oxidação é o processo de escurecimento da joia. Ele ocorre quando o metal entra em
          contato com o enxofre, que está presente massivamente no nosso dia a dia, e também com
          excesso de ar e umidade. Além disso, o suor também contribui para a oxidação da prata,
          assim como o contato com cremes, perfumes, calor, pomadas, loções etc.
        </p>
        <p>
          É importante ressaltar que esse é um processo <strong>natural</strong> do metal e que não
          significa que a qualidade da liga seja ruim. A boa notícia é que, com os cuidados certos, é
          possível fazer com que a joia volte a ter seu brilho normal.
        </p>
        <p>A prata não é amiga da água, e pode escurecer por conta disso.</p>
        <PolicyList itens={CUIDADOS_PRATA_925} />
      </PolicySection>

      <PolicySection titulo="Se sua joia contém peças banhadas a ouro ou prata">
        <p>
          As semijoias são produtos de alta qualidade com um custo mais baixo que uma joia, ela fica
          no intermediário de uma joia e a bijuteria. Vale lembrar que elas não são peças para serem
          usadas continuamente como uma peça feita de ouro como uma aliança. As peças folheadas que
          trabalho são de alta qualidade. São peças de latão que passam por um processo de limpeza,
          tratamento, banho multicamadas, verniz e processo antialérgico. E por esse motivo é uma
          semijoia fina.
        </p>
        <p>
          As peças folheadas a ouro com verniz suíço possuem um banho de 8 milésimos. As peças
          folheadas a prata 1000 com verniz suíço possuem 40 milésimos de banho.
        </p>
        <p>
          Nunca deixe sua peça exposta, pois a poeira, maresia e o oxigênio deterioram o brilho do
          banho e escurecem a peça.
        </p>
        <PolicyList itens={CUIDADOS_BANHADAS} />
      </PolicySection>
    </PolicyDocument>
  )
}

export default JewelryCarePage
