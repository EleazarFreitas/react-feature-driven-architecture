import { http, HttpResponse } from 'msw'

import { makeJwt, makeProduct, makeUser } from './fixtures'

/**
 * Handlers padrão do MSW (Mock Service Worker).
 *
 * POR QUE MSW E NÃO `vi.mock` DO SERVICE:
 * Se mockássemos `productsService.list`, o teste passaria mesmo com o cliente
 * HTTP quebrado — não estaríamos testando a montagem da URL, o header
 * Authorization, o tratamento de status nem o parse com Zod. O MSW intercepta
 * no nível da REDE, então todo o caminho real (hook → service → cliente HTTP)
 * é exercitado; só o servidor é falso.
 *
 * A regra que isso segue: teste comportamento, não implementação. Refatorar o
 * service não deve quebrar o teste — mudar o comportamento, sim.
 *
 * A URL base vem de `.env.test` (VITE_API_BASE_URL=https://dummyjson.test).
 */

export const API_BASE = 'https://dummyjson.test'

/** Serviço de upload — outra API, outra base URL (ver .env.test). */
export const UPLOAD_BASE = 'https://upload.test/api/v1'

/** Credenciais aceitas pelos handlers padrão. */
export const VALID_CREDENTIALS = { username: 'emilys', password: 'emilyspass' }

export const handlers = [
  // POST /auth/login — espelha o comportamento real: 400 + { message } quando
  // as credenciais não batem.
  http.post(`${API_BASE}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { username?: string; password?: string }

    if (
      body.username !== VALID_CREDENTIALS.username ||
      body.password !== VALID_CREDENTIALS.password
    ) {
      return HttpResponse.json({ message: 'Invalid credentials' }, { status: 400 })
    }

    return HttpResponse.json({ accessToken: makeJwt(), refreshToken: makeJwt(86400) })
  }),

  // GET /auth/me — exige o Bearer token, como a API real.
  http.get(`${API_BASE}/auth/me`, ({ request }) => {
    const authorization = request.headers.get('Authorization')

    if (authorization === null) {
      return HttpResponse.json({ message: 'Access Token is required' }, { status: 401 })
    }

    return HttpResponse.json(makeUser('admin'))
  }),

  http.post(`${API_BASE}/auth/refresh`, () =>
    HttpResponse.json({ accessToken: makeJwt(), refreshToken: makeJwt(86400) }),
  ),

  // GET /products — devolve o mesmo envelope da DummyJSON.
  http.get(`${API_BASE}/products`, () =>
    HttpResponse.json({
      products: [
        makeProduct({ id: 1, title: 'Notebook Pro 14' }),
        makeProduct({ id: 2, title: 'Mouse sem fio', price: 29.9 }),
      ],
      total: 2,
      skip: 0,
      limit: 12,
    }),
  ),

  http.get(`${API_BASE}/products/search`, ({ request }) => {
    const term = new URL(request.url).searchParams.get('q') ?? ''

    // Termo que não existe devolve lista vazia com total 0 — é o que a API real
    // faz, e é o cenário que exercita o estado VAZIO da interface.
    if (term === 'inexistente') {
      return HttpResponse.json({ products: [], total: 0, skip: 0, limit: 12 })
    }

    return HttpResponse.json({
      products: [makeProduct({ id: 1, title: 'Notebook Pro 14' })],
      total: 1,
      skip: 0,
      limit: 12,
    })
  }),

  http.get(`${API_BASE}/products/category-list`, () =>
    HttpResponse.json(['laptops', 'smartphones', 'beauty']),
  ),

  http.get(`${API_BASE}/products/:id`, ({ params }) => {
    const id = Number(params.id)

    if (id === 999) {
      return HttpResponse.json({ message: `Product with id '999' not found` }, { status: 404 })
    }

    return HttpResponse.json(makeProduct({ id }))
  }),

  // POST/PUT ecoam os campos recebidos + id, como a API real (que não persiste).
  http.post(`${API_BASE}/products/add`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>
    return HttpResponse.json({ ...body, id: 195 }, { status: 201 })
  }),

  http.put(`${API_BASE}/products/:id`, async ({ request, params }) => {
    const body = (await request.json()) as Record<string, unknown>
    return HttpResponse.json({ ...body, id: Number(params.id) })
  }),

  http.delete(`${API_BASE}/products/:id`, ({ params }) =>
    HttpResponse.json({ ...makeProduct({ id: Number(params.id) }), isDeleted: true }),
  ),

  /**
   * POST /files/upload — espelha a resposta real da Platzi Fake Store API,
   * verificada com um upload de verdade:
   *   { originalname, filename, location }
   *
   * ⚠️ Inspecionamos o corpo como TEXTO, e não com `request.formData()`.
   * Motivo verificado: no jsdom, um `File` dentro de `FormData` enviado por
   * XMLHttpRequest não é serializado corretamente (o conteúdo chega vazio e o
   * nome vira "blob"), e `request.formData()` chega a lançar erro na validação
   * interna do undici. É limitação do ambiente de teste — no navegador real o
   * envio funciona normalmente.
   *
   * O que ainda conseguimos (e queremos) verificar: que o corpo é multipart e
   * traz o campo chamado "file".
   */
  http.post(`${UPLOAD_BASE}/files/upload`, async ({ request }) => {
    const body = await request.text()

    if (!body.includes('name="file"')) {
      return HttpResponse.json({ message: 'file is required' }, { status: 400 })
    }

    return HttpResponse.json(
      {
        originalname: 'foto.png',
        filename: 'abc123.png',
        location: `${UPLOAD_BASE}/files/abc123.png`,
      },
      { status: 201 },
    )
  }),
]
