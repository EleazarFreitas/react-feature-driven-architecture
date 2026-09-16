import { Link } from 'react-router-dom'

import { ROUTES } from '@/app/paths'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency } from '@/lib/format'

import type { Product } from '../types/product.types'

/**
 * Cartão de produto na listagem.
 *
 * Extraído porque a página de listagem já tem responsabilidade demais (filtros,
 * paginação, estados de carregamento). Isolar o item deixa as duas coisas
 * legíveis e permite testar a formatação sem montar a tela inteira.
 */

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    // <article> porque o cartão é uma unidade de conteúdo independente e
    // autocontida — exatamente o caso de uso do elemento.
    <article className="flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white transition-shadow hover:shadow-md">
      <img
        src={product.thumbnail}
        // `alt` com o título: um leitor de tela anuncia o produto, não "imagem".
        alt={product.title}
        // `loading="lazy"` evita baixar as imagens fora da tela já no primeiro
        // render. É otimização com motivo concreto: são 12 imagens por página.
        loading="lazy"
        className="h-40 w-full bg-slate-100 object-contain p-4"
      />

      <div className="flex flex-1 flex-col gap-2 border-t border-slate-100 p-4">
        <h3 className="text-sm font-semibold text-slate-900">
          {/*
            O link envolve o TÍTULO, e não o cartão inteiro. Transformar o
            cartão todo em link deixa o texto do link enorme e confuso para
            quem navega por leitor de tela (que lista os links da página).
          */}
          <Link
            to={ROUTES.productDetail(product.id)}
            className="hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          >
            {product.title}
          </Link>
        </h3>

        <p className="line-clamp-2 text-xs text-slate-500">{product.description}</p>

        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-base font-semibold text-slate-900">
            {formatCurrency(product.price)}
          </span>

          <Badge tone={product.stock > 0 ? 'success' : 'danger'}>
            {product.stock > 0 ? `${product.stock} em estoque` : 'Sem estoque'}
          </Badge>
        </div>
      </div>
    </article>
  )
}
