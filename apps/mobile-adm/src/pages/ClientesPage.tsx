import { tabFor } from '@/widgets/tab-bar'
import EmConstrucao from '@/shared/ui/EmConstrucao'

// Feature 72 (`MAF-18`): a aba existe e navega; o conteúdo chega na feature dela.
const ClientesPage = () => <EmConstrucao titulo={tabFor('/clientes').label} />

export default ClientesPage
