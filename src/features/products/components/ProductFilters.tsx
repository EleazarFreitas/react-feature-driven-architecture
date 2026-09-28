import { useEffect, useState } from 'react'

import { Input, Select } from '@/components/ui/Field'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

import type { ProductFiltersController } from '../hooks/useProductFilters'
import type { ProductSort } from '../types/product.types'

/**
 * Barra de busca, filtro por categoria e ordenação.
 *
 * DOIS ESTADOS PARA A BUSCA — é o detalhe que vale estudar aqui:
 *
 *   1. `term` (useState local): o que está DIGITADO no campo. Muda a cada tecla
 *      e não interessa a mais ninguém — por isso é local;
 *   2. `query.search` (na URL): o que está sendo BUSCADO de fato. Muda só
 *      quando o usuário para de digitar.
 *
 * Se o campo escrevesse direto na URL, cada tecla viraria uma navegação e uma
 * requisição. Se a busca ficasse só no estado local, o filtro não sobreviveria
 * a um F5 nem poderia ser compartilhado por link. Separar os dois resolve as
 * duas coisas — e é um bom exemplo de "nem todo estado pertence ao mesmo lugar".
 */

const SORT_OPTIONS: ReadonlyArray<{ value: ProductSort; label: string }> = [
  { value: 'title-asc', label: 'Título (A-Z)' },
  { value: 'title-desc', label: 'Título (Z-A)' },
  { value: 'price-asc', label: 'Menor preço' },
  { value: 'price-desc', label: 'Maior preço' },
]

interface ProductFiltersProps {
  filters: ProductFiltersController
  categories: string[]
  /** Enquanto as categorias carregam, o select fica desabilitado. */
  isLoadingCategories: boolean
}

export function ProductFilters({ filters, categories, isLoadingCategories }: ProductFiltersProps) {
  const { query, setSearch, setCategory, setSort } = filters

  const [term, setTerm] = useState(query.search)
  const debouncedTerm = useDebouncedValue(term, 400)

  /**
   * Caminho URL → campo: se a busca mudar por fora (botão "limpar filtros",
   * botão voltar do navegador), o campo precisa acompanhar. Sem isso o input
   * continuaria exibindo um termo que já não está mais valendo.
   *
   * Isto é feito DURANTE O RENDER, e não num `useEffect`, seguindo o padrão que
   * a documentação do React chama de "ajustar estado quando uma prop muda".
   * Comparamos com o valor anterior e, se mudou, atualizamos na hora: o React
   * descarta o render em andamento e refaz imediatamente com o valor novo, sem
   * nunca pintar na tela o conteúdo desatualizado.
   *
   * Com `useEffect` o usuário chegaria a ver o valor antigo por um instante
   * (e haveria um render a mais). É também o que a regra de lint
   * `react-hooks/set-state-in-effect` recomenda evitar.
   */
  const [lastSearchFromUrl, setLastSearchFromUrl] = useState(query.search)
  if (query.search !== lastSearchFromUrl) {
    setLastSearchFromUrl(query.search)
    setTerm(query.search)
  }

  /**
   * Caminho campo → URL: empurra o termo quando o usuário para de digitar.
   *
   * `debouncedTerm === term` é o que define "parou de digitar" — e é também o
   * que impede este efeito de DESFAZER uma mudança vinda de fora. Sem essa
   * condição, ao clicar em "Limpar filtros" a URL ficava sem busca, o campo
   * voltava a "", mas o valor com debounce ainda era o termo antigo: o efeito
   * via a diferença e gravava a busca de volta na URL.
   */
  useEffect(() => {
    if (debouncedTerm === term && debouncedTerm !== query.search) setSearch(debouncedTerm)
  }, [debouncedTerm, term, query.search, setSearch])

  const isSearching = query.search !== ''

  return (
    // `role="search"` é um marco de navegação: leitores de tela conseguem pular
    // direto para a busca da página.
    <section role="search" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Input
        label="Buscar"
        type="search"
        placeholder="Nome do produto..."
        value={term}
        onChange={(event) => setTerm(event.target.value)}
      />

      <Select
        label="Categoria"
        value={query.category}
        onChange={(event) => setCategory(event.target.value)}
        // Desabilitado durante a busca porque a API não combina os dois filtros
        // (ver products.service). Preferimos desabilitar com explicação a
        // aceitar o filtro e ignorá-lo silenciosamente.
        disabled={isLoadingCategories || isSearching}
        hint={isSearching ? 'A API não permite combinar busca e categoria' : undefined}
      >
        <option value="">Todas as categorias</option>
        {categories.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </Select>

      <Select
        label="Ordenar por"
        value={query.sort}
        /**
         * A asserção `as ProductSort` é segura aqui, e não um atalho: o valor
         * só pode vir de um <option> que nós mesmos geramos a partir de
         * SORT_OPTIONS. O DOM sempre devolve `string`, e não há como o
         * TypeScript saber disso sozinho.
         *
         * Note que a asserção NÃO é a única defesa: o valor termina na URL, e
         * lá ele é validado de verdade por `isProductSort` (useProductFilters),
         * porque a query string pode ser editada à mão pelo usuário.
         */
        onChange={(event) => setSort(event.target.value as ProductSort)}
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </section>
  )
}
