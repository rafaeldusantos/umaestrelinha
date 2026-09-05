import { queueAgeLabel, type QueueAge as QueueAgeValue } from '@estrelinha/core/material'

/**
 * `PED-13` — há quanto tempo este pedido espera, em **três degraus**.
 *
 * A tela nunca compara datas: ela recebe o veredito de `queueAge` (que mora em
 * `@estrelinha/core/material`, porque a página "meu pedido" da loja vai ler a mesma régua) e só
 * escolhe a cor.
 *
 * **Três degraus, não um gradiente.** Um degradê contínuo pinta tudo de alguma cor, e aí nada é
 * alarme. Só o terceiro ganha âmbar — o mesmo âmbar do selo `Aguardando material` e do primeiro
 * tile, porque **é um acento por tela**.
 *
 * O `title` carrega a data absoluta: a relativa responde "isso é urgente?" num relance, e a
 * absoluta responde "que dia exatamente?" quando alguém precisa escrever para a cliente.
 */
const QueueAge = ({ age, since }: { age: QueueAgeValue | null; since?: string | null }) => {
  if (!age) return <span className="text-muted-foreground">—</span>

  const tom =
    age.tier === 'stale'
      ? 'text-estrelinha-admin-amber font-medium'
      : age.tier === 'warm'
        ? 'text-foreground font-medium'
        : 'text-muted-foreground'

  return (
    <span
      className={`text-xs ${tom}`}
      title={since ? new Date(since).toLocaleString('pt-BR') : undefined}
    >
      {queueAgeLabel(age)}
    </span>
  )
}

export default QueueAge
