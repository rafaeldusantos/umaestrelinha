import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { useWishlistStore } from '@/entities/wishlist/model/wishlistStore'
import { useAllProducts } from '@/entities/product/api/useProducts'
import ProductCard from '@/entities/product/ui/ProductCard'
import { Button } from '@estrelinha/ui/button'
import { motion } from 'framer-motion'

const WishlistPage = () => {
  const items = useWishlistStore((s) => s.items)
  const { data: products } = useAllProducts()
  const wishlistProducts = (products ?? []).filter((p) => items.includes(p.id))

  return (
    <div className="container py-8">
      <h1 className="font-heading text-3xl font-semibold text-estrelinha-ink mb-2">
        Meus Favoritos
      </h1>
      <p className="text-estrelinha-ink-soft mb-8">
        {wishlistProducts.length} {wishlistProducts.length === 1 ? 'item salvo' : 'itens salvos'}
      </p>

      {wishlistProducts.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-20"
        >
          <Heart className="w-16 h-16 text-estrelinha-ink-soft mx-auto mb-4" />
          <h2 className="font-heading text-xl font-bold text-estrelinha-ink mb-2">
            Nenhum favorito ainda
          </h2>
          <p className="text-estrelinha-ink-soft mb-6">
            Explore nossos bottons e salve seus favoritos clicando no coração!
          </p>
          <Button asChild className="min-h-11 rounded-sm bg-estrelinha-primary text-white border-0 hover:bg-estrelinha-primary hover:opacity-95">
            <Link to="/">Explorar joias</Link>
          </Button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {wishlistProducts.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  )
}

export default WishlistPage
