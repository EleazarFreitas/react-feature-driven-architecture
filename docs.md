# Documentação — Catálogo Admin

Manual completo do projeto. O `README.md` é a porta de entrada rápida; **este
arquivo é o material de estudo**.

Leia na ordem, ou pule direto para a seção que precisa:

1. [Visão geral](#1-visão-geral)
2. [Pré-requisitos](#2-pré-requisitos)
3. [Instalação](#3-instalação)
4. [Executando o projeto](#4-executando-o-projeto)
5. [Estrutura de pastas](#5-estrutura-de-pastas)
6. [Fluxo da aplicação](#6-fluxo-da-aplicação)
7. [Autenticação](#7-autenticação)
8. [JWT](#8-jwt)
9. [Rotas](#9-rotas)
10. [Features](#10-features)
11. [API](#11-api)
12. [Estado](#12-estado)
13. [Formulários](#13-formulários)
14. [Upload de arquivos](#14-upload-de-arquivos)
15. [Tratamento de erros](#15-tratamento-de-erros)
16. [Testes](#16-testes)
17. [Debugging](#17-debugging)
18. [Adicionando uma nova feature](#18-adicionando-uma-nova-feature)
19. [Corrigindo um bug](#19-corrigindo-um-bug)
20. [Decisões arquiteturais](#20-decisões-arquiteturais)
21. [Segurança](#21-segurança)
22. [Produção](#22-produção)
23. [Checklist](#23-checklist)

---

## 1. Visão geral

### O que é

Um painel administrativo de catálogo de produtos: o usuário entra com
usuário e senha, vê a lista de produtos com busca/filtro/ordenação/paginação,
abre o detalhe e — se o seu papel permitir — cria, edita e exclui produtos.

### Objetivo

Ser um projeto **pequeno o bastante para ser lido inteiro** e **completo o
bastante para mostrar os padrões de uma aplicação React real**: autenticação,
autorização, camada HTTP, estados de interface, formulários validados,
tratamento de erros, testes e configuração por ambiente.

Não é um tutorial com código artificial: as decisões abaixo são as que um time
tomaria num produto de verdade, e cada uma está justificada — inclusive as que
foram **descartadas**.

### Tecnologias

| Ferramenta                     | Versão     | Para quê                                |
| ------------------------------ | ---------- | --------------------------------------- |
| React                          | 19         | Biblioteca de interface                 |
| TypeScript                     | 6          | Tipagem estática                        |
| Vite                           | 8          | Servidor de desenvolvimento e build     |
| React Router                   | 8          | Rotas (modo "data router")              |
| React Hook Form + Zod          | 7 / 4      | Formulários e validação                 |
| TanStack Query                 | 5          | Estado de servidor (cache, invalidação) |
| Zustand                        | 5          | Estado global da sessão                 |
| Tailwind CSS                   | 4          | Estilos                                 |
| Vitest + Testing Library + MSW | 4 / 16 / 2 | Testes                                  |
| ESLint + Prettier              | 9 / 3      | Padrão de código                        |

Estado de **servidor** (produtos, categorias) vive no cache do TanStack Query,
com invalidação após cada mutação; estado de **sessão** vive numa store Zustand
persistida. O porquê de cada um — e as alternativas descartadas — está em
[Decisões arquiteturais](#20-decisões-arquiteturais).

### Arquitetura em uma frase

Código organizado **por feature** (auth, products), apoiado em camadas
compartilhadas (`components`, `lib`, `hooks`, `config`), com uma direção de
dependência única — `app → features → compartilhado` — cobrada pelo ESLint, e
não só por combinado.

---

## 2. Pré-requisitos

- **Node.js 22.22 ou mais novo** (exigência do React Router 8; o Vite 8 pede
  20.19+/22.12+). O projeto foi desenvolvido e validado no Node 25.8.1.
- **npm 10+** (vem com o Node). Pode usar pnpm ou yarn; os comandos abaixo usam npm.
- Um editor com suporte a TypeScript — o VS Code já vem pronto.

Confira sua versão:

```bash
node -v
npm -v
```

> **Node 25 e os testes:** o Node 25 expõe um `localStorage` global próprio que
> conflita com o ambiente de testes. O projeto já contorna isso em
> `src/test/polyfills.ts` — veja a explicação lá. Nada a fazer da sua parte; se
> aparecer o aviso `--localstorage-file was provided without a valid path` ao
> rodar os testes, é só ruído do Node e pode ser ignorado.

---

## 3. Instalação

```bash
# 1. instale as dependências
npm install

# 2. (opcional) crie um .env para sobrescrever a configuração padrão
cp .env.example .env
```

O passo 2 é opcional de propósito: `.env.development` e `.env.production` já
vêm no repositório com a configuração pública necessária, então o projeto roda
logo após o `npm install`. Detalhes em [Segurança](#21-segurança).

Não é necessário criar conta em lugar nenhum: a API usada é pública e as contas
de demonstração aparecem na própria tela de login.

---

## 4. Executando o projeto

```bash
npm run dev            # sobe em http://localhost:5173
```

Entre com uma das contas exibidas na tela de login:

| Usuário   | Senha         | Papel           | Pode                    |
| --------- | ------------- | --------------- | ----------------------- |
| `emilys`  | `emilyspass`  | Administrador   | criar, editar e excluir |
| `oliviaw` | `oliviawpass` | Moderador       | criar e editar          |
| `averyp`  | `averyppass`  | Somente leitura | apenas visualizar       |

> Entre com `averyp` depois de entrar com `emilys` e repare que os botões de
> criar/editar/excluir desaparecem. É a autorização funcionando.

### Todos os scripts

| Comando                | O que faz                                            |
| ---------------------- | ---------------------------------------------------- |
| `npm run dev`          | Servidor de desenvolvimento com hot reload           |
| `npm run build`        | Checa os tipos (`tsc -b`) e gera o build em `dist/`  |
| `npm run preview`      | Serve o build de produção localmente                 |
| `npm test`             | Roda os testes uma vez                               |
| `npm run test:watch`   | Roda os testes em modo observador                    |
| `npm run lint`         | ESLint                                               |
| `npm run lint:fix`     | ESLint corrigindo o que é automatizável              |
| `npm run typecheck`    | Só a checagem de tipos, sem gerar build              |
| `npm run format`       | Formata tudo com Prettier                            |
| `npm run format:check` | Verifica a formatação sem alterar arquivos (para CI) |

---

## 5. Estrutura de pastas

```
src/
├── app/                  Composição da aplicação (o "centro")
│   ├── App.tsx           Providers + router
│   ├── router.tsx        Tabela de rotas (e o loader que resolve a sessão)
│   ├── guards/           RequireAuth, RequirePermission
│   └── layout/           AppLayout (cabeçalho + navegação + <Outlet/>)
│
├── components/           UI compartilhada, SEM regra de negócio
│   ├── ui/               Button, Field (Input, Textarea, Select), Alert,
│   │                     Badge, Spinner, ConfirmDialog, Pagination,
│   │                     LinkButton, FileDropzone, ProgressBar
│   └── feedback/         LoadingState, FullPageLoading, ErrorState,
│                         EmptyState, ErrorBoundary
│
├── config/
│   ├── env.ts            Variáveis de ambiente validadas com Zod
│   └── paths.ts          Constantes de URL (ROUTES)
│
├── features/             O CORAÇÃO: código organizado por domínio
│   ├── auth/
│   │   ├── components/   LoginForm
│   │   ├── pages/        LoginPage
│   │   ├── schemas/      login.schema.ts
│   │   ├── services/     auth.service.ts
│   │   ├── store/        auth.store (Zustand + persist)
│   │   ├── types/        auth.types.ts
│   │   └── permissions.ts
│   └── products/
│       ├── components/   ProductCard, ProductFilters, ProductForm,
│       │                 ProductImageField
│       ├── hooks/        useProducts, useProductMutations, product-keys,
│       │                 useProductFilters, useImageUpload
│       ├── pages/        List, Detail, Create, Edit
│       ├── schemas/      product.schema.ts
│       ├── services/     products.service.ts
│       └── types/        product.types.ts
│
├── hooks/                Hooks genéricos (useDebouncedValue, useFlashNotice)
├── lib/                  Infraestrutura, sem nada específico do domínio
│   ├── http/             client, errors, auth-bridge, upload
│   ├── query/            query-client (config do TanStack Query)
│   ├── format.ts
│   └── logger.ts
│
├── pages/                Páginas que não pertencem a feature alguma
│                         (NotFound, Forbidden, RouteError)
├── test/                 Infraestrutura de teste (MSW, fixtures, helpers,
│                         polyfills do jsdom)
├── index.css
└── main.tsx              Ponto de entrada
```

### O que vai (e o que NÃO vai) em cada pasta

| Pasta         | Entra                                          | Não entra                                      |
| ------------- | ---------------------------------------------- | ---------------------------------------------- |
| `app/`        | Composição: rotas, guardas, layout             | Regra de negócio, chamadas de API              |
| `components/` | UI reutilizável e genérica                     | Chamadas de API, regra de domínio              |
| `config/`     | Ambiente validado e constantes de URL          | Qualquer lógica de aplicação                   |
| `features/`   | Tudo de um domínio: UI, hooks, services, tipos | Código de outra feature (exceto ler a sessão)  |
| `hooks/`      | Hooks genéricos, sem domínio                   | Hook que menciona "produto" ou "usuário"       |
| `lib/`        | Infraestrutura: HTTP, log, formatação          | Qualquer `import` vindo de `features/`         |
| `pages/`      | Telas transversais (404, 403)                  | Telas de um domínio (essas ficam na feature)   |
| `test/`       | Mocks, fixtures, helpers de render             | Testes em si (ficam ao lado do código testado) |

### Quando algo deve virar código compartilhado?

A regra prática: **espere doer**.

- Usado por **uma** feature → fica dentro da feature.
- Usado por **duas** features → pode continuar duplicado. Duplicação barata é
  melhor que abstração errada.
- Usado por **três**, ou claramente genérico → promova para `components/` ou
  `hooks/`.

Exemplos reais deste projeto:

- `ProductCard` ficou em `features/products/components` porque conhece o formato
  de um produto. Nunca servirá para outra feature.
- `Pagination` foi para `components/ui` porque só recebe números e devolve
  eventos — qualquer listagem futura usa igual.
- `useDebouncedValue` foi para `hooks/` porque funciona com qualquer valor.
- `useImageUpload` ficou em `features/products/hooks` porque aplica as regras
  de imagem **do produto** (formatos e tamanho). Sobe para `hooks/` se outra
  feature precisar do mesmo fluxo.
- `buttonStyles.ts` existe porque **dois** componentes (`Button` e `LinkButton`)
  precisam da mesma aparência. Com um só, as classes morariam dentro dele.

### Como evitar um `components/` global com tudo misturado

O erro clássico é jogar todo componente novo em `components/`. Antes de fazer
isso, pergunte: **este componente cita o domínio?** Se ele menciona produto,
pedido ou usuário — no nome, nas props ou nos textos —, ele pertence à feature.

Note também que `components/` está dividido em `ui/` e `feedback/`. Trinta
arquivos soltos numa pasta só é o que torna uma pasta inútil.

### Como evitar dependências circulares

Uma regra, uma exceção e um padrão.

**A regra — as setas apontam para um lado só:**

```
app/  →  features/  →  components/, hooks/, lib/, config/
```

`lib/`, `components/`, `hooks/` e `config/` **nunca** importam de `features/`
nem de `app/`. Uma feature **não** importa de outra feature, nem de `app/`.

Consequências práticas, visíveis no projeto:

- o `AppLayout` mora em `app/layout`, e não em `components/`, porque mostra o
  usuário logado e o botão "Sair" — ou seja, conhece `features/auth`;
- as constantes de URL (`ROUTES`) moram em `config/paths.ts`: todas as camadas
  precisam delas, então elas ficam na camada que todas podem importar.

**A exceção — `auth` é transversal.** Saber quem é o usuário e o que ele pode
fazer interessa a toda feature, então qualquer uma pode **ler** a sessão
(`useCurrentUser`, `useHasPermission`). O contrário não vale: `auth` não
conhece `products`. Numa base maior, o passo seguinte seria mover a sessão para
`lib/` e deixar em `features/auth` só as telas de login.

**Quem cobra a regra é o ESLint**, não a boa vontade do time. O
`eslint.config.js` usa `no-restricted-imports` para cada camada; um import na
direção errada aparece em vermelho no editor, com a explicação:

```
'@/features/auth/store/auth.store' import is restricted from being used by a
pattern. Código compartilhado (components, config, hooks, lib) não pode
depender de features, pages ou app
```

Regra que só existe no documento é quebrada em silêncio no primeiro prazo
apertado.

**O padrão — inversão de dependência quando a seta precisaria voltar:**

O cliente HTTP (`lib/http/client.ts`) precisa do token, que é assunto de
`features/auth`. E `features/auth` precisa do cliente HTTP para chamar
`/auth/login`. Isso seria um ciclo.

A solução está em `lib/http/auth-bridge.ts`: a camada HTTP **declara o contrato
do que precisa** (`getAccessToken`, `refreshSession`, `onSessionExpired`) e a
**store de autenticação** se **registra** nesse contrato — no escopo do módulo,
não num efeito, porque a store não depende da árvore React. A camada HTTP nunca
importa a feature: só conhece a interface. É a mesma ideia dos _interceptors_
do Axios: a biblioteca não conhece a sua autenticação, você a registra de fora.

### Como evitar componentes gigantes

Um componente ficou grande demais quando você não consegue descrever o que ele
faz em uma frase sem usar "e". As saídas, na ordem de preferência:

1. **Extraia a lógica para um hook.** A `ProductListPage` não lida com URL: quem
   faz isso é `useProductFilters`.
2. **Extraia um pedaço da UI.** O `ProductCard` saiu da listagem.
3. **Extraia uma função auxiliar** para o mesmo arquivo, quando ela só serve ali
   (`toFormValues` na `ProductEditPage`, `describeLoginError` no `LoginForm`).

### Sem `useMemo`/`useCallback` "por via das dúvidas"

Você não vai encontrar memoização manual neste projeto, e é de propósito.
`useMemo` e `useCallback` são **otimizações**: custam leitura, exigem um array
de dependências correto e só se pagam quando há um problema medido (um cálculo
realmente caro, uma lista enorme re-renderizando). Montar um objeto de filtros
ou criar uma função a cada render não é esse problema.

O caminho atual, quando o desempenho importa, nem é escrever isso à mão: o
**React Compiler** memoiza componentes e hooks automaticamente no build. Ele
não está ligado aqui para manter a cadeia de build mínima, mas as regras de
lint dele já estão ativas (`eslint-plugin-react-hooks`), então o código é
compatível. Para ligar, veja a seção "React Compiler" do README do
`@vitejs/plugin-react`.

---

## 6. Fluxo da aplicação

O caminho que um dado percorre, da URL até a tela:

```
Navegador
   ↓  usuário acessa /products
Router (app/router.tsx)
   ↓  no boot, o loader da rota raiz resolve a sessão; depois casa a URL
RequireAuth (app/guards)
   ↓  há sessão? Não → /login | Sim → segue
AppLayout (app/layout)
   ↓  desenha cabeçalho e navegação, renderiza <Outlet/>
ProductListPage (features/products/pages)
   ↓  decide O QUE mostrar (loading / erro / vazio / dados)
useProducts (features/products/hooks)
   ↓  cuida de QUANDO buscar, cancelar e re-buscar
productsService (features/products/services)
   ↓  traduz filtros da UI em parâmetros da API e valida a resposta
http client (lib/http/client.ts)
   ↓  monta a URL, adiciona o token, trata 401 e erros
API DummyJSON
```

**Por que tantas camadas?** Cada uma tem uma única razão para mudar:

- mudou o visual → só a página/componente muda;
- mudou quando buscar → só o hook muda;
- mudou a URL do endpoint → só o service muda;
- mudou a autenticação → só o cliente HTTP muda.

Sem essa separação, um `fetch()` dentro de um `useEffect` em cada componente
espalharia as quatro responsabilidades por dezenas de arquivos — e qualquer
mudança viraria uma caçada.

---

## 7. Autenticação

### O fluxo do login, passo a passo

```
1. Usuário digita usuário e senha          (LoginForm)
2. Zod valida o formato                    (login.schema.ts)
3. login() da store é chamado              (useAuthStore → auth.store)
4. POST /auth/login                        (auth.service)
5. API devolve accessToken + refreshToken
6. Tokens entram na store; o middleware
   persist os grava no localStorage        (auth.store)
7. GET /auth/me com o token                (auth.service)  ← obrigatório!
8. Usuário (com o PAPEL) vai para a store  (auth.store)
9. LoginPage, que assina a store, re-renderiza
   e redireciona para o destino original   (<Navigate>)
```

**Por que o passo 7 existe?** Porque `/auth/login` **não devolve o papel do
usuário** — e sem papel não dá para decidir o que ele pode fazer. O papel só
vem de `/auth/me`. Confirmado inspecionando a API real.

**Repare no passo 9:** o formulário não chama `navigate()`. Ele só faz o login;
quem navega é a página, **reagindo** à store. O mesmo vale para o "Sair": o
botão apenas limpa a store, e o `<RequireAuth>` redireciona sozinho. Uma única
fonte da verdade (a sessão) decide onde o usuário está — não há dois lugares
para manter em sincronia.

### O estado da sessão é mínimo

```ts
user: AuthUser | null // nunca persistido
tokens: AuthTokens | null // persistido
sessionExpired: boolean // só para o aviso na tela de login
```

Não existe `isAuthenticated` guardado: "estar logado" é o mesmo que "há um
usuário", então é **derivado** (`useIsAuthenticated` lê `user !== null`).
Guardar os dois abriria espaço para divergirem.

### Restaurar a sessão depois de um F5

O token sobrevive ao recarregamento (está no `localStorage`), mas os dados do
usuário não — eles estavam apenas na memória do JavaScript. Por isso, no boot:

1. o middleware `persist` reidrata os tokens do `localStorage` — de forma
   **síncrona**, assim que o módulo da store é carregado;
2. o **loader da rota raiz** (`app/router.tsx`) chama `restoreSession()`;
3. sem token, ela retorna na hora (nenhuma requisição); com token, chama
   `/auth/me` para descobrir de quem ele é;
4. se falhar, limpa tudo e o usuário começa no login.

**O detalhe que evita um bug clássico:** o router só renderiza as rotas depois
que o loader termina. Enquanto isso mostra o `hydrateFallbackElement`
("Carregando aplicação..."). Se as rotas renderizassem antes, o `RequireAuth`
veria "sem usuário" (a resposta ainda não chegou), mandaria para o login, e um
instante depois a sessão seria restaurada — aquele _flash_ de tela de login a
cada F5.

Por que um loader e não um componente com `useEffect`? Porque resolver a sessão
não é assunto de render: é um passo que precisa acontecer **antes** dele. Um
loader é uma função comum, roda uma vez por navegação inicial (sem a chamada
dupla do `StrictMode`), e se lançar erro cai no `errorElement` da rota.

> **Trade-off assumido:** qualquer falha em `/auth/me` encerra a sessão — até
> uma queda de rede bem na hora do F5. É a política mais simples e nunca deixa
> o app preso. Com um backend próprio valeria separar "token recusado" (desloga)
> de "rede/5xx" (mantém o token e oferece nova tentativa). Aqui não dá: a
> DummyJSON responde **500** para token malformado, então os dois casos são
> indistinguíveis. Está comentado em `restoreSession`.

### Usando no componente

```tsx
const user = useCurrentUser()
const isAuthenticated = useIsAuthenticated()
const canDelete = useHasPermission('product:delete')

// Ações e fatias sem seletor pronto:
const logout = useAuthStore((state) => state.logout)
```

Cada hook assina **uma fatia**: o componente só re-renderiza quando aquele valor
muda — diferente do Context, em que qualquer mudança no valor do Provider
re-renderiza todos os consumidores.

Fora de um componente (no loader do router e na camada HTTP) vale
`useAuthStore.getState()`, que não depende da árvore React.

### Expiração de sessão

Configure um TTL curto para ver acontecer:

```bash
# .env
VITE_ACCESS_TOKEN_TTL_MINUTES=1
```

Depois de 1 minuto, a próxima requisição recebe 401 e o cliente HTTP:

1. chama `refreshSession()` pela ponte de autenticação;
2. a store troca o refresh token por um par novo (`refreshSession`);
3. a requisição original é **repetida** com o token novo;
4. o usuário não percebe nada.

Se o refresh também falhar, `onSessionExpired()` limpa a sessão, o
`<RequireAuth>` redireciona, e a tela de login exibe _"Sua sessão expirou"_.

Duas proteções importantes, ambas cobertas por teste:

- **apenas uma tentativa** de refresh por requisição (senão: loop infinito);
- **apenas um refresh** mesmo com várias requisições recebendo 401 ao mesmo
  tempo (senão: como a API rotaciona o refresh token, o segundo usaria um token
  já inválido e derrubaria a sessão).

### Logout

`logout()` limpa a store, e o `persist` apaga os tokens do `localStorage` em
seguida. A DummyJSON **não tem endpoint de logout**; num backend real, aqui
haveria um `POST /auth/logout` para **revogar** o refresh token no servidor.
Sem revogação, um refresh token roubado continua valendo até expirar.

### Por que Zustand (e não Context API)

Ver [Decisões arquiteturais](#20-decisões-arquiteturais).

---

## 8. JWT

### O que é

Um **JSON Web Token** é uma string com três partes separadas por ponto:

```
eyJhbGciOiJIUzI1NiJ9  .  eyJpZCI6MSwiZXhwIjoxNzg5fQ  .  ZyeQoHTwQHmd_j6VET
      header                        payload                   signature
```

- **header** — o algoritmo usado;
- **payload** — as _claims_ (as afirmações sobre o usuário);
- **signature** — a prova de que o conteúdo não foi adulterado.

### O ponto mais importante

**Header e payload NÃO são criptografados.** São apenas JSON em Base64URL.
Qualquer pessoa cola o token em jwt.io e lê tudo.

Consequências práticas:

1. **Nunca coloque dado sensível nas claims.**
2. Decodificar o payload no frontend é só _leitura de uma afirmação não
   verificada_. Serve para melhorar a experiência (mostrar o nome, prever a
   expiração), **nunca** para liberar acesso.

Só o servidor tem a chave secreta, então **só o servidor consegue verificar a
assinatura**. É por isso que a autorização de verdade acontece no backend, a
cada requisição.

### Claims deste projeto

As claims da DummyJSON (verificadas decodificando um token real):

```json
{
  "id": 1,
  "username": "emilys",
  "email": "emily.johnson@x.dummyjson.com",
  "firstName": "Emily",
  "lastName": "Johnson",
  "gender": "female",
  "image": "https://dummyjson.com/icon/emilys/128",
  "iat": 1789318760,
  "exp": 1789320560
}
```

- `iat` = _issued at_, quando foi emitido;
- `exp` = quando expira.

Ambos em **segundos** desde 1970 — enquanto `Date.now()` devolve
**milissegundos**. Confundir os dois é um erro silencioso de 1000x: para
comparar, use `exp * 1000`.

Repare no que **não** está nas claims: `role`. Por isso o papel vem de
`/auth/me`.

### O frontend trata o token como texto opaco

Este projeto **não decodifica o JWT em lugar nenhum**: guarda o token e o
devolve no header `Authorization`, e só. Não precisa de mais nada — quem é o
usuário vem de `/auth/me`, e a expiração é descoberta do jeito mais confiável
que existe: o servidor responde 401.

Para **ver** as claims enquanto estuda, cole o token em jwt.io ou rode no
console do navegador:

```js
JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
```

### Access token x refresh token

|                        | Access token                   | Refresh token              |
| ---------------------- | ------------------------------ | -------------------------- |
| Para quê               | Autorizar cada requisição      | Obter um novo access token |
| Duração                | Curta (minutos)                | Longa (dias)               |
| Vai em toda requisição | Sim                            | Não                        |
| Se vazar               | Dano limitado pelo tempo curto | Dano grande                |

A duração curta do access token é a defesa: se ele vazar, o atacante tem poucos
minutos. Já o refresh token só trafega no momento da renovação, o que reduz a
exposição — e a DummyJSON o **rotaciona** (devolve um novo a cada refresh), que
é o comportamento correto.

### Autenticação x autorização

- **Autenticação** = _quem é você?_ → login, token, `RequireAuth`.
- **Autorização** = _o que você pode fazer?_ → papéis, permissões,
  `RequirePermission`.

São coisas diferentes e por isso levam a lugares diferentes: sem sessão você vai
para `/login`; com sessão mas sem permissão, para `/403`.

### Onde guardar o token — e por que isto aqui não é o ideal

| Lugar                 | Sobrevive ao F5 | Protegido de XSS | Observação                  |
| --------------------- | --------------- | ---------------- | --------------------------- |
| Memória (variável JS) | ❌              | ✅               | Mais seguro, pior UX        |
| `localStorage`        | ✅              | ❌               | **O que usamos aqui**       |
| `sessionStorage`      | Só na aba       | ❌               | Mesmo risco                 |
| Cookie `HttpOnly`     | ✅              | ✅               | **O ideal** — exige backend |

**O risco do `localStorage`:** qualquer JavaScript rodando na página o lê. Se um
XSS acontecer — uma dependência comprometida, um `dangerouslySetInnerHTML` com
conteúdo da API —, o atacante rouba o token e usa a sessão de fora.

**Por que usamos assim mesmo:** um cookie `HttpOnly` é invisível para o
JavaScript, e **só o servidor pode criá-lo**. A DummyJSON devolve o token no
corpo JSON da resposta. Para uma SPA sem backend próprio, não há alternativa.

> Este projeto usa `localStorage` por limitação da API pública, para fins
> didáticos. **Não** é o padrão seguro de produção.

### Como isto evoluiria num projeto real

1. O backend devolve o **refresh token** em cookie `HttpOnly; Secure; SameSite=Strict`.
2. O **access token** (curta duração) fica **apenas em memória** — some no F5,
   e é recuperado chamando o endpoint de refresh, que usa o cookie.
3. O backend **rotaciona** o refresh token a cada uso e detecta reuso (sinal de
   roubo) para invalidar a família inteira de tokens.
4. O backend mantém uma **lista de revogação** para logout imediato.
5. Tudo sob **HTTPS**, sempre.

Repare que os itens 1, 3, 4 e 5 são **responsabilidade do servidor**. É por isso
que uma SPA não consegue, sozinha, implementar autenticação segura de produção —
e por que não implementamos aqui um backend que não existe.

---

## 9. Rotas

| Rota                 | Acesso                     | O que é                      |
| -------------------- | -------------------------- | ---------------------------- |
| `/login`             | Pública                    | Formulário de login          |
| `/`                  | Autenticado                | Redireciona para `/products` |
| `/products`          | Autenticado                | Lista com busca e paginação  |
| `/products/new`      | Permissão `product:create` | Formulário de criação        |
| `/products/:id`      | Autenticado                | Detalhe do produto           |
| `/products/:id/edit` | Permissão `product:update` | Formulário de edição         |
| `/403`               | Autenticado                | Sem permissão                |
| `*`                  | Pública                    | 404                          |

### Como a proteção funciona

As rotas são **aninhadas**, e as guardas são rotas-mãe que renderizam
`<Outlet/>` (o lugar onde a rota filha aparece):

```
(raiz sem path)            ← loader da sessão + errorElement + fallback
  /login                   pública
  <RequireAuth>            ← exige sessão para tudo abaixo
    <AppLayout>            ← cabeçalho e navegação
      /products
      <RequirePermission permission="product:create">
        /products/new
  *                        404
```

A vantagem: **uma página nova criada dentro do ramo protegido já nasce
protegida**. Não existe o risco de esquecer de embrulhá-la numa guarda.

As guardas são **componentes que leem a store**, então são reativas: quando a
sessão muda (logout, expiração), elas re-renderizam e redirecionam sem ninguém
chamar `navigate`.

### A rota raiz sem `path`

Ela não corresponde a URL nenhuma — serve para agrupar, e concentra três coisas
que valem para a aplicação inteira:

1. **`loader`** — resolve a sessão **antes do primeiro render** (ver
   [Restaurar a sessão](#restaurar-a-sessão-depois-de-um-f5)). Vem acompanhado
   de `shouldRevalidate: () => false`, porque por padrão o router re-executa
   loaders em certas navegações, e a sessão só precisa ser resolvida no boot.
2. **`hydrateFallbackElement`** — o que aparece enquanto o loader roda e o
   chunk `lazy` da primeira rota é baixado: um "Carregando aplicação...".
3. **`errorElement`** — declarado uma vez, vale para a árvore inteira, já que os
   erros sobem até o ancestral mais próximo que saiba tratá-los.

> `app/router.tsx` exporta o **array `routes`** além do `router`. Isso permite
> que os testes montem a mesma tabela com `createMemoryRouter` — sem isso, eles
> validariam uma árvore de rotas que não é a que roda em produção.

> **Imports do React Router:** tudo vem de `react-router`; só o
> `RouterProvider` vem de `react-router/dom`. O pacote `react-router-dom`
> deixou de existir na v8.

### Os caminhos vivem em um lugar só

`config/paths.ts` exporta `ROUTES`, usado tanto para **montar links**
(`ROUTES.productDetail(product.id)` → `/products/7`) quanto para **declarar as
rotas** (`ROUTES.productDetail(':id')` → `/products/:id`). Renomear uma URL é
mexer em uma linha, e o TypeScript aponta todo lugar que a usa.

`RequireAuth` guarda o destino original em `location.state` antes de redirecionar,
para que o login devolva o usuário exatamente onde ele tentou entrar.

O `404` fica **fora** do `RequireAuth` de propósito: uma URL inexistente é 404
mesmo sem sessão. Mandar para o login quem digitou o endereço errado seria confuso.

### ⚠️ Proteção no frontend NÃO é segurança

Todo esse código roda no navegador do usuário, que pode alterá-lo à vontade
(basta abrir o DevTools). As guardas existem para **não mostrar telas que
quebrariam**, e não para proteger dados.

Quem protege os dados é o **backend**, validando o token a cada requisição. Se a
API não recusar a operação, esconder a tela não protege nada.

### Parâmetros de rota

`/products/:id` → `useParams()` devolve `{ id: string | undefined }` —
**sempre string**, porque o React Router não sabe que ali deveria haver um número.
Converter e validar é nossa responsabilidade:

```tsx
const productId = Number(id) // '/products/abc' vira NaN
if (!Number.isInteger(productId)) {
  /* mostra erro, não chama a API */
}
```

A URL é entrada do usuário. Tratá-la como confiável é o mesmo erro de confiar num
campo de formulário.

### Code splitting

As páginas usam `lazy` no `router.tsx`, então viram arquivos JS separados,
baixados só quando a rota é visitada (confirmado no build: `ProductListPage`,
`ProductDetailPage` etc. saem como _chunks_ próprios).

Divisão por rota é o tipo de divisão que quase sempre compensa: o limite é
natural e coincide com o que o usuário faz. Num app deste tamanho o ganho é
modesto — o padrão está aqui porque é o que escala.

`403` e `404` **não** são lazy: são componentes minúsculos, e uma requisição
extra para exibir uma tela de erro seria pior que o problema.

---

## 10. Features

### `features/auth`

Responsável por _quem é o usuário_ e _o que ele pode fazer_.

| Arquivo                    | Papel                                                                               |
| -------------------------- | ----------------------------------------------------------------------------------- |
| `store/auth.store.ts`      | Store Zustand: sessão, login/logout, refresh, persistência (`persist`) e ponte HTTP |
| `services/auth.service.ts` | `/auth/login`, `/auth/me`, `/auth/refresh`, com as respostas validadas              |
| `permissions.ts`           | Tabela papel → permissões e a função `can()`                                        |
| `components/LoginForm.tsx` | O formulário                                                                        |
| `pages/LoginPage.tsx`      | Layout, redirecionamento, contas de demonstração                                    |
| `types/auth.types.ts`      | `Role`, `AuthUser`, `AuthTokens`, `LoginCredentials`                                |

**Permissões:**

| Papel       | `product:create` | `product:update` | `product:delete` |
| ----------- | ---------------- | ---------------- | ---------------- |
| `admin`     | ✅               | ✅               | ✅               |
| `moderator` | ✅               | ✅               | ❌               |
| `user`      | ❌               | ❌               | ❌               |

Usamos `can(user, 'product:delete')` em vez de `user.role === 'admin'` espalhado
pelo código: quando surgir um papel novo, muda-se **uma** tabela, não dez
arquivos.

### `features/products`

O CRUD e a listagem.

| Arquivo                         | Papel                                                         |
| ------------------------------- | ------------------------------------------------------------- |
| `services/products.service.ts`  | Todas as chamadas de produto; traduz UI ↔ API                 |
| `schemas/product.schema.ts`     | Validação da resposta da API **e** do formulário              |
| `types/product.types.ts`        | Tipos inferidos dos esquemas (`z.infer`)                      |
| `hooks/useProducts.ts`          | `useProducts`, `useProduct`, `useProductCategories`           |
| `hooks/useProductMutations.ts`  | Criar, editar e excluir — e a invalidação de cache de cada um |
| `hooks/product-keys.ts`         | Fábrica hierárquica das chaves de cache                       |
| `hooks/useProductFilters.ts`    | Filtros sincronizados com a query string                      |
| `hooks/useImageUpload.ts`       | Validar, pré-visualizar e enviar uma imagem                   |
| `components/ProductForm.tsx`    | Formulário usado por criar **e** editar                       |
| `components/ProductImageField`  | Campo de imagem (só apresentação; o estado vem do formulário) |
| `components/ProductFilters.tsx` | Busca (com debounce), categoria, ordenação                    |
| `components/ProductCard.tsx`    | Item da listagem                                              |
| `pages/*`                       | Lista, detalhe, criação, edição                               |

---

## 11. API

**API usada:** [DummyJSON](https://dummyjson.com) — pública, gratuita, sem
cadastro, com CORS liberado e **autenticação JWT real**.

Foi escolhida justamente porque oferece JWT de verdade: não precisamos simular
login com um mock, o que tornaria a parte mais importante do projeto artificial.

### Endpoints usados

| Método | Endpoint                   | Uso                                         |
| ------ | -------------------------- | ------------------------------------------- |
| POST   | `/auth/login`              | Login. Aceita `expiresInMins`               |
| GET    | `/auth/me`                 | Usuário do token (**única fonte do papel**) |
| POST   | `/auth/refresh`            | Troca o refresh token por um par novo       |
| GET    | `/products`                | Lista. `limit`, `skip`, `sortBy`, `order`   |
| GET    | `/products/search`         | Busca. `q` + os mesmos parâmetros           |
| GET    | `/products/category/:slug` | Filtro por categoria                        |
| GET    | `/products/category-list`  | Lista de categorias (24 itens)              |
| GET    | `/products/:id`            | Detalhe                                     |
| POST   | `/products/add`            | Criação (**simulada**)                      |
| PUT    | `/products/:id`            | Edição (**simulada**)                       |
| DELETE | `/products/:id`            | Exclusão (**simulada**)                     |

### Formato das respostas

Listagem (o mesmo envelope em `/products`, `/search` e `/category/:slug`):

```json
{ "products": [ ... ], "total": 194, "skip": 0, "limit": 12 }
```

`total` é o total **no servidor**, não o tamanho da página — é ele que permite
calcular a quantidade de páginas.

Erro:

```json
{ "message": "Product with id '9999' not found" }
```

### ⚠️ Limitações (verificadas, não supostas)

**1. As escritas são simuladas.**
`POST`, `PUT` e `DELETE` respondem com sucesso, mas **não persistem nada**.
Criar um produto devolve `201` com um id novo (ex.: 195); buscar esse id logo em
seguida devolve **404**.

Como o projeto lida com isso: a interface **avisa o usuário**, tanto no
formulário quanto na mensagem de sucesso. Dizer apenas "Produto criado!" faria o
usuário procurar na lista um item que nunca vai aparecer.

**2. As escritas não exigem autenticação.**
`POST /products/add` funciona **sem token nenhum**. Ou seja, as permissões deste
projeto são puramente de interface — o servidor não valida nada. É a
demonstração perfeita de por que _frontend não é fronteira de segurança_.

**3. Busca e categoria não se combinam.**
São endpoints diferentes. Passar `category` junto de `q` em `/products/search`
**não filtra nada** — o parâmetro é ignorado (verificado: a resposta traz
produtos de várias categorias).

Como o projeto lida: a busca tem prioridade, e o filtro de categoria é
**desabilitado com uma explicação** enquanto há texto buscado. Preferimos
desabilitar com aviso a aceitar o filtro e ignorá-lo silenciosamente.

**4. O papel não está no JWT.** Só em `/auth/me`.

**5. Não existe endpoint de logout**, portanto não há revogação de token no
servidor.

**6. As respostas de POST/PUT não são produtos completos.** O POST ecoa os
campos enviados mais o `id`; o PUT devolve o produto pela metade (sem `tags`,
`availabilityStatus` e outros). Por isso há um esquema Zod separado para elas,
que exige só o `id`.

**7. Token malformado devolve 500, não 401.** `GET /auth/me` com um token que
nem é um JWT responde `500 { "message": "invalid token" }`. Token **expirado**
responde 401 normalmente. É o que impede o app de distinguir "token ruim" de
"servidor fora do ar" ao restaurar a sessão (ver
[Autenticação](#restaurar-a-sessão-depois-de-um-f5)).

### A segunda API: upload de arquivos

A DummyJSON **não aceita upload de arquivo** — só JSON, com as imagens como URL
em string. Como upload é um dos padrões mais comuns em formulários reais, o
projeto usa um segundo serviço só para isso:

|              |                                                     |
| ------------ | --------------------------------------------------- |
| Endpoint     | `POST https://api.escuelajs.co/api/v1/files/upload` |
| Corpo        | `multipart/form-data`, campo `file`                 |
| Autenticação | nenhuma                                             |
| Resposta     | `{ originalname, filename, location }`              |

Duas APIs no mesmo projeto **não é gambiarra**: é o padrão real. A mídia vai
para um serviço dedicado (S3, Cloudinary) e a API de recursos guarda apenas a
URL. Detalhes, armadilhas e limitações em [Upload de arquivos](#14-upload-de-arquivos).

### Paginação

A API pagina por `skip` (offset); a interface conta páginas a partir de 1. A
conversão fica no service:

```ts
skip: (query.page - 1) * query.pageSize
```

A UI raciocina em páginas — que é o que o usuário vê.

### Validação das respostas

Uma anotação de tipo TypeScript é apagada no build e não garante nada sobre o
que chega pela rede. Por isso o cliente HTTP devolve `unknown` para os services,
e cada service valida a resposta com Zod antes de entregá-la ao app.

Os esquemas deste projeto foram **verificados contra a API real** (todos os
194 produtos, além de login, `/auth/me`, refresh, busca e categorias). Se a API
mudar de formato, a falha acontece no service, com o campo exato apontado no
console — em vez de um `undefined` explodir três telas depois. Para o usuário
aparece uma mensagem genérica; o detalhe técnico vai para o log (ver
[Tratamento de erros](#15-tratamento-de-erros)).

A regra geral: **valide nas bordas** — o que o usuário digita (formulário) e o
que a rede devolve (service). Entre funções internas, quem garante o formato é
o TypeScript.

---

## 12. Estado

Um dos pontos que mais confundem no início: **nem todo estado é igual**. Colocar
tudo numa store global (ou tudo em `useState`) é o que gera aplicações difíceis
de mexer.

| Tipo            | Onde vive                 | Exemplo neste projeto                               |
| --------------- | ------------------------- | --------------------------------------------------- |
| **Local**       | `useState` no componente  | Diálogo de exclusão aberto; texto digitado na busca |
| **De URL**      | Query string / parâmetros | Filtros, página, ordenação, id do produto           |
| **Global**      | Store Zustand             | Usuário autenticado e tokens                        |
| **De servidor** | Cache do TanStack Query   | Produtos, categorias                                |
| **Derivado**    | Calculado no render       | `totalPages`, `isAuthenticated`, `hasActiveFilters` |

### Por que cada escolha

**Local (`useState`)** — `isConfirmingDelete` na página de detalhe. Só aquela
tela precisa. Jogá-lo num contexto global aumentaria o acoplamento sem benefício
nenhum.

**De URL** — os filtros da listagem. Este estado descreve _o que está sendo
mostrado_, e na URL ele ganha três coisas que o `useState` não dá: sobrevive ao
F5, pode ser compartilhado por link, e o botão "voltar" do navegador desfaz a
troca de página, de categoria ou de ordenação. (A busca é a exceção: ela
**substitui** a entrada do histórico, senão cada pausa na digitação criaria uma
entrada nova.)

> Repare no caso da busca: existem **dois** estados. O texto _digitado_ é local
> (muda a cada tecla, não interessa a mais ninguém); o texto _buscado_ está na
> URL (muda quando o usuário para de digitar). Se o campo escrevesse direto na
> URL, cada tecla viraria uma navegação e uma requisição.

**Global (store Zustand)** — o usuário autenticado. É lido pelo cabeçalho, pelas
guardas e pelas checagens de permissão, em pontos distantes da árvore. Passar
isso por props seria _prop drilling_ puro. Cada componente assina só a fatia que
usa (`useCurrentUser()`, `useHasPermission('product:delete')`), então uma
mudança de sessão não re-renderiza quem não depende dela.

**De servidor (TanStack Query)** — a lista de produtos. É a categoria mais
esquecida: dados que **não são seus**, são um espelho temporário do que está no
servidor. Eles precisam de loading, erro, cancelamento, cache compartilhado e
revalidação — e de alguém que os marque como obsoletos depois de uma escrita.
É por isso que **não** moram na store global: sincronizar cópia e original à mão
é o trabalho que a biblioteca de server state faz melhor.

**Derivado** — `totalPages` é calculado de `total` e `pageSize` a cada render;
`isAuthenticated` é só `user !== null`; `isUploading` sai do `status` do upload.
Guardar qualquer um deles num `useState` criaria uma segunda fonte da verdade,
capaz de divergir. **Se dá para calcular, calcule.**

### Estados que se excluem: um union, não vários booleanos

O envio de imagem (`useImageUpload`) tem um `status` com quatro valores:

```ts
type UploadStatus = 'idle' | 'uploading' | 'success' | 'error'
```

Com `isUploading` + `isSuccess` + `hasError` separados existiriam oito
combinações, e a maioria não faz sentido ("enviando" e "com erro" ao mesmo
tempo?). Com um union, os estados inválidos são **impossíveis de representar**
— e o TypeScript cobra que todo `if` considere os quatro.

### O que NÃO está na store global

Lista de produtos, filtros, texto de busca. São estado de servidor, de URL e de
tela — cada um já tem o seu lugar na tabela acima. Jogar tudo numa store global
é o atalho que transforma qualquer mudança de tela num problema de estado
compartilhado.

---

## 13. Formulários

### O fluxo completo

```
usuário digita
   ↓
sai do campo (onBlur) → Zod valida → erro aparece ligado ao campo
   ↓
clica em Salvar → handleSubmit valida TUDO
   ↓                         ↓ inválido: foca o primeiro erro, NÃO chama a API
   ↓ válido
mutação trava novo envio (isPending) + botão desabilitado
   ↓
service chama a API e valida a RESPOSTA
   ↓                         ↓ erro: Alert no topo, dados digitados PERMANECEM
   ↓ sucesso
o cache é invalidado e a página navega levando a mensagem de sucesso
```

A mensagem de sucesso viaja no estado da navegação
(`navigate(url, { state: { notice } })`) e a tela de destino a lê com
`useFlashNotice` (`src/hooks`), que também a apaga do histórico — senão o aviso
reapareceria a cada F5.

### Por que React Hook Form + Zod

**React Hook Form** mantém os campos **não controlados** (lê o valor do DOM via
`ref`). Com `useState` por campo, cada tecla re-renderiza o formulário inteiro —
irrelevante com dois campos, decisivo com vinte. Ele também já traz o que sempre
se reimplementa à mão: campos tocados, "há alterações?" (`isDirty`), foco no
primeiro campo inválido.

**Zod** descreve a regra uma vez, e o tipo do formulário sai dela:

```ts
export const productFormSchema = z.object({ title: z.string().min(3, '...'), ... })
export type ProductFormValues = z.infer<typeof productFormSchema>
```

Formulário e tipo **não têm como divergir**. E é a mesma ferramenta que valida
as respostas da API.

Custo honesto: duas dependências, cerca de 30 kB gzip somadas (medido no build
deste projeto: ~15 kB do Zod, ~15 kB do React Hook Form com o resolver). Vale
porque formulários são o coração de um app administrativo.

### Detalhes que importam

**Campos numéricos.** Registrados com `valueAsNumber: true`, então chegam como
número. Quando o campo está vazio o valor é `NaN`, e o esquema traz uma mensagem
legível (`'Informe um preço válido'`) em vez do erro técnico do Zod.

**`mode: 'onBlur'`.** Validar em `onChange` acusaria erro já na primeira letra
digitada — hostil. Em `onSubmit`, só avisaria no fim. `onBlur` é o meio-termo.

**`noValidate` no `<form>`.** Desliga os balões do navegador: as mensagens são
nossas, traduzidas e ligadas ao campo por `aria-describedby`.

**Envio duplo** é travado em dois níveis: o botão desabilita enquanto
`isPending`, e a página ignora o `onSubmit` no mesmo estado — o segundo nível
existe porque o Enter dentro de um campo envia o formulário sem passar pelo
botão desabilitado.

**Erro não limpa o formulário.** Perder o preenchimento por uma falha de rede é
das piores experiências possíveis. Coberto por teste.

**Acessibilidade.** Os campos de `components/ui/Field.tsx` ligam automaticamente
`<label for>`, `aria-invalid`, `aria-describedby` e `role="alert"`. Encapsular
isso é o que garante que nenhuma tela esqueça.

**"Desfazer alterações".** Aparece só quando `isDirty`, e devolve todos os
campos — inclusive a imagem — aos valores iniciais. Coberto por teste.

**Upload de imagem.** O formulário de produto tem um campo de arquivo com
prévia, barra de progresso e arrastar-e-soltar. Ele usa `useController` do React
Hook Form em vez de `register` — porque o valor não vem de um input nativo, e
sim do upload. Tem seção própria: [Upload de arquivos](#14-upload-de-arquivos).

---

## 14. Upload de arquivos

Enviar imagem é um dos padrões mais comuns em formulários web — e um dos que
mais escondem armadilhas. Esta seção cobre o campo de imagem do produto.

### O fluxo completo

```
usuário escolhe (clique ou arrastar)
   ↓
VALIDA no cliente (tipo e tamanho)  → recusado: mostra erro, NÃO chama a rede
   ↓ aprovado
cria object URL e mostra a prévia NA HORA (sem esperar a rede)
   ↓
POST multipart → api.escuelajs.co/files/upload   (xhr.upload.onprogress → barra)
   ↓
devolve { location: "https://..." }
   ↓
a URL vira o valor do campo `thumbnail` no formulário
   ↓
ao salvar: POST → dummyjson.com/products/add  { ..., thumbnail: "https://..." }
```

Repare que são **duas requisições para dois serviços diferentes**. Isso não é um
remendo: é o padrão real. A mídia vai para um serviço dedicado (S3, Cloudinary,
Uploadcare) e a API de recursos guarda apenas a URL. Aqui usamos a Platzi Fake
Store API porque a DummyJSON não aceita upload de arquivo.

Outro ponto: o upload acontece **ao escolher o arquivo**, não ao salvar. É a UX
mais comum, e evita que o usuário espere o envio depois de clicar em "Salvar".
Em troca, o formulário precisa **bloquear o envio enquanto a imagem sobe** —
senão o produto seria criado sem imagem e o usuário juraria ter anexado.

### Onde mora o estado do upload

Duas partes da tela dependem dele: o **campo de imagem** (prévia, progresso,
erro) e o **botão "Salvar"** (que trava durante o envio). Estado usado por dois
componentes mora no ancestral comum — então quem chama `useImageUpload` é o
`<ProductForm>`, que repassa o resultado ao `<ProductImageField>` por props.

A alternativa tentadora é deixar o hook dentro do campo e fazê-lo "avisar" o
formulário com um `useEffect` que chama `onUploadingChange(isUploading)`.
Funciona, mas é o tipo de efeito que a documentação do React pede para evitar:
dois estados espelhados, um render a mais e um `useCallback` obrigatório só
para o efeito não disparar à toa. **Efeito é para sincronizar com algo fora do
React** (rede, DOM, URL), não para um componente conversar com o pai.

### Por que `XMLHttpRequest` e não `fetch`

Este é o único lugar do projeto que não usa `fetch`, e o motivo é concreto:

> **`fetch` não tem evento de progresso de ENVIO.** Ele expõe o corpo da
> _resposta_ como stream (progresso de download), mas o corpo da _requisição_
> sobe sem emitir evento nenhum.

Dá para contornar enviando um `ReadableStream` como corpo e contando os bytes
lidos, mas isso só funciona em parte dos navegadores e exige HTTP/2. O
`XMLHttpRequest`, mais antigo, expõe `xhr.upload.onprogress` em todos — e
continua sendo a forma portável de fazer barra de progresso de upload.

É o motivo de o Axios usar XHR por baixo no navegador. Resolvemos com um módulo
pequeno, `lib/http/upload.ts`, sem dependência nova.

Detalhe fácil de errar: `xhr.upload.onprogress` mede o **envio**;
`xhr.onprogress` (sem o `.upload`) mede o **download da resposta** — que aqui é
um JSON minúsculo e não serve para nada.

### A armadilha nº 1: o `Content-Type`

```ts
// ERRADO — quebra o upload
xhr.setRequestHeader('Content-Type', 'multipart/form-data')
```

O corpo multipart separa os campos por um `boundary`, uma string aleatória que
precisa aparecer **tanto no cabeçalho quanto no corpo**. Só o navegador conhece
o boundary que ele próprio gerou. Definindo o header à mão, o boundary some do
cabeçalho e o servidor não consegue mais separar os campos — daí o clássico
"upload que responde 400 sem explicação".

**A regra:** passe um `FormData` e **não toque no `Content-Type`**. O navegador
monta `multipart/form-data; boundary=----WebKitFormBoundary...` sozinho.

Há um teste travando esse comportamento (`upload.test.ts`), porque é o tipo de
"correção" que alguém tenta fazer de boa-fé.

### `<input type="file">` é sempre não controlado

Você **não pode** definir o valor de um input de arquivo por JavaScript:

```tsx
<input type="file" value={algo} /> // não funciona, e é proposital
```

Se fosse possível, qualquer site poderia montar um caminho de arquivo e enviar
documentos da sua máquina sem você perceber. O navegador só permite que o
**usuário** escolha; ao código resta apenas _limpar_ o campo.

É por isso que o componente mantém o próprio estado (arquivo, prévia, progresso)
em vez de ler o input.

Consequência prática, também fácil de errar: depois de ler o arquivo, zeramos
`event.target.value`. Sem isso, escolher `foto.png`, remover, e escolher
`foto.png` de novo **não dispara `change`** — o valor do input não mudou, então
não há evento.

### Prévia e vazamento de memória

```ts
const url = URL.createObjectURL(file) // registra o arquivo na memória
// ...
URL.revokeObjectURL(url) // libera — obrigatório
```

`createObjectURL` prende o arquivo na memória do navegador **até você revogar ou
a aba fechar**. Trocar de imagem dez vezes sem revogar mantém as dez na memória:
um vazamento silencioso, que dói de verdade com arquivos grandes.

Por isso o `useImageUpload` revoga ao trocar de arquivo, ao remover e ao
desmontar. Há um teste conferindo que toda URL criada foi revogada.

Usamos a prévia **local** (e não a URL devolvida pela API) por dois motivos:
aparece instantaneamente, e não depende de o servidor permitir a exibição — veja
as limitações abaixo.

### Validação é UX, não segurança

O campo recusa arquivos acima de 2 MB e fora de PNG/JPG/WebP, antes de gastar
rede. Mas:

> Tanto a extensão quanto o `type` (MIME) vêm do cliente e são **forjáveis**:
> basta renomear `virus.exe` para `foto.png`.

Um servidor real precisa revalidar **inspecionando os primeiros bytes do
conteúdo** (_magic bytes_), limitar o tamanho na borda (antes de carregar o
arquivo na memória) e servir os arquivos de outro domínio, para que um arquivo
malicioso não rode na origem da aplicação.

E o atributo `accept` do input é apenas uma **dica** para o seletor do sistema:
o usuário pode escolher "todos os arquivos" ou arrastar e soltar qualquer coisa.
Por isso o teste desliga o filtro do `userEvent` — para exercitar o caminho real.

**SVG está fora da lista de propósito.** SVG é XML e pode conter `<script>`:
servido na mesma origem, vira XSS. Aceitar só formatos raster elimina essa
classe inteira de problema (ver Segurança).

### Acessibilidade do arrastar-e-soltar

O padrão que se vê por aí é uma `<div onClick>` disparando um input escondido
com `display: none`. Isso quebra três coisas: `display: none` **tira o input da
ordem de tabulação**, uma `<div>` não é focável nem anunciada como campo, e o
leitor de tela não encontra controle algum.

Aqui fazemos o contrário:

- o `<input type="file">` **real** continua no documento, escondido apenas
  visualmente com `sr-only` (que preserva o foco);
- um `<label>` ligado a ele forma a área grande.

Com isso, sem uma linha de ARIA: clicar na área abre o seletor, Tab foca o
campo, Espaço/Enter abre o seletor, e o leitor de tela anuncia o campo
corretamente. O foco fica visível por `focus-within` no contêiner.

Arrastar-e-soltar é um **acréscimo** por cima disso — nunca a única forma de
enviar, porque não há como arrastar um arquivo usando só o teclado.

Um detalhe obrigatório: `onDragOver` **precisa** chamar `preventDefault()`. O
padrão do navegador é recusar o drop; sem isso, soltar o arquivo faz a página
navegar até ele — e o usuário perde tudo que já preencheu.

A barra de progresso usa `role="progressbar"` com `aria-valuenow`, e a conclusão
é anunciada por um `role="status"`. Uma `<div>` que só fica mais larga é
invisível para quem não enxerga.

### Limitações verificadas

**1. A imagem enviada não pode ser exibida pela URL remota.**
O serviço responde com `Cross-Origin-Resource-Policy: same-origin` (verificado
com um upload real). Esse cabeçalho faz o navegador **bloquear** o carregamento
do arquivo como `<img>` a partir de outra origem. É o motivo técnico de a prévia
usar o object URL local.

**2. O produto não persiste.** Como toda escrita na DummyJSON é simulada, a
`thumbnail` enviada também não fica gravada. O arquivo **é** enviado de verdade
e a URL **existe** — o que não persiste é o vínculo com o produto.

**3. O envio de arquivo não pode ser testado a fundo no jsdom.** Um `File`
dentro de `FormData` enviado por XHR não é serializado corretamente pelo jsdom
(o conteúdo chega vazio e o nome vira `blob`), e `request.formData()` chega a
lançar erro. Por isso os testes verificam o **corpo bruto** — que o corpo é
multipart e que o campo se chama `file` —, e o envio real foi confirmado à mão
contra a API, que respondeu `201` com a URL do arquivo.

### Como isso funcionaria com um backend real

O padrão mais comum hoje **não** faz o arquivo passar pelo seu servidor:

```
1. frontend  → POST /uploads/assinar   { nome, tipo, tamanho }
2. backend   → valida permissão e limites, devolve uma URL PRÉ-ASSINADA
3. frontend  → PUT direto no S3/GCS usando essa URL (com barra de progresso)
4. frontend  → POST /produtos  { ..., imagemId }
5. backend   → confirma que o arquivo existe e associa ao produto
```

Vantagens: o arquivo não ocupa banda nem memória do seu servidor, e a URL
pré-assinada expira em minutos e já embute as regras (tamanho e tipo máximos).

A camada que mudaria no frontend é **só o `lib/http/upload.ts`** — o método
passaria a ser `PUT` com o arquivo puro no corpo, em vez de `POST` multipart. O
componente e o hook continuariam iguais, porque só conhecem "envie este arquivo
e me devolva uma URL".

---

## 15. Tratamento de erros

### A estratégia

Erros viram **tipos**, não strings. Comparar mensagens para tomar decisão é
frágil; `instanceof` + código é explícito e o TypeScript estreita o tipo.

```
AppError                  base — a mensagem é sempre um texto NOSSO, para o usuário
├── NetworkError          não houve resposta (offline, DNS, CORS)
├── HttpError             houve resposta, status fora de 2xx (tem .status)
└── SessionExpiredError   sessão acabou e não deu para renovar
```

Qualquer outro erro (um `ZodError` de resposta fora do formato, um `TypeError`
de um bug) **não** é um `AppError` — e essa diferença é usada de propósito logo
abaixo.

### Como um erro atravessa a aplicação

```
API responde 500
   ↓
lib/http/client.ts  →  lança HttpError(500, mensagem, corpo)
   ↓
service             →  deixa passar (não sabe o que a tela quer fazer)
   ↓
useQuery (TanStack) →  captura, guarda em `error`, status vira 'error'
   ↓
página              →  if (isError) → <ErrorState error={...} onRetry={refetch} />
   ↓
ErrorState          →  getErrorMessage(error) traduz para o usuário
```

Cada camada faz **uma** coisa: o cliente HTTP classifica, o hook guarda, a
página decide o que mostrar, o componente traduz.

Como o TanStack Query **captura** o erro e o guarda no estado da query, nada
apareceria no console. Por isso `lib/query/query-client.ts` registra dois
callbacks globais (`QueryCache.onError` e `MutationCache.onError`) que mandam
toda falha de dados para o `logger` — um ponto só, em vez de um `catch` com
`console.error` em cada tela.

### Os tipos de erro e o que fazemos com cada um

| Erro                 | Origem                  | Tratamento                                    |
| -------------------- | ----------------------- | --------------------------------------------- |
| Validação            | Zod no formulário       | Mensagem ligada ao campo, sem ir à rede       |
| Autenticação (401)   | Token inválido/expirado | Refresh automático; se falhar, logout + aviso |
| Autorização (403)    | Sem permissão           | `RequirePermission` → `/403`                  |
| Não encontrado (404) | Id inexistente          | Mensagem, **sem** botão de tentar novamente   |
| Rede                 | Offline, CORS, DNS      | Mensagem + tentar novamente                   |
| Servidor (5xx)       | API fora do ar          | Mensagem + tentar novamente                   |
| Render               | Bug de componente       | `ErrorBoundary` / `RouteErrorPage`            |

### Por que não `alert("Deu erro")` em todo componente

Porque o usuário merece saber **o que fazer**. `getErrorMessage()` centraliza a
tradução, com uma regra simples:

- é um `HttpError`? mensagem por status (401, 403, 404, 5xx);
- é outro `AppError`? a mensagem dele, que nós escrevemos para o usuário;
- **qualquer outra coisa**? _"Ocorreu um erro inesperado."_ — a mensagem
  original foi escrita para desenvolvedores (a de um `ZodError` é um JSON com a
  lista de campos inválidos) e vai para o log, não para a tela.

Já `isRetryable()` decide se faz sentido oferecer "Tentar novamente" (e se o
TanStack Query repete a busca sozinho): num 404 a requisição continuará
inválida — oferecer retry é enganar o usuário.

### Erros de renderização

Um erro durante o render desmonta a árvore inteira e deixa a **página branca** —
o pior resultado possível. Duas redes de segurança, porque cobrem caminhos
diferentes:

- **`RouteErrorPage`** (`errorElement` do router) — falhas dentro de uma rota:
  no render, num loader, ou ao carregar um _chunk_ lazy (comum após um deploy
  novo);
- **`ErrorBoundary`** — falhas fora do router, como num provider.

Nenhum dos dois captura erros em `onClick` ou em código assíncrono — é por isso
que a camada HTTP tem o próprio tratamento.

### Logs

Nada de `console.log` espalhado. `lib/logger.ts` centraliza:

- `logger.debug` — só aparece com `VITE_ENABLE_DEBUG_LOGS=true`;
- `logger.warn` / `logger.error` — sempre.

Ter **um** ponto de saída é o que permite plugar depois um serviço de
observabilidade (Sentry, Datadog) sem caçar `console.*` em 50 arquivos. O ponto
de extensão está comentado em `logger.error`. Não adicionamos Sentry porque
exigiria conta e DSN, e nada disso é necessário para estudar o projeto.

---

## 16. Testes

```bash
npm test              # roda tudo uma vez
npm run test:watch    # modo observador (use enquanto desenvolve)
npm test -- client    # só os arquivos que casam com "client"
```

**50 testes em 9 arquivos**, todos passando.

### A forma da suíte: o "Testing Trophy"

A maior parte da confiança vem de testes de **integração**, que montam a
aplicação de verdade e só trocam o servidor pelo MSW. Testes unitários ficam
para o que é lógica pura ou difícil de provocar pela tela. Não há E2E (ver o
fim desta seção).

| Camada         | O que exercita                                       | Arquivos                                                                                               |
| -------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **Integração** | A aplicação inteira numa URL: rotas, guardas, telas  | `auth.test.tsx`, `ProductListPage.test.tsx`, `ProductDetailPage.test.tsx`, `ProductFormPages.test.tsx` |
| **Unitário**   | Funções puras e peças cujos casos a tela não alcança | `permissions.test.ts`, `format.test.ts`, `client.test.ts`, `upload.test.ts`                            |
| **De hook**    | Regra de negócio de um hook, com `renderHook`        | `useProductMutations.test.tsx`                                                                         |

Os testes de integração usam **um único helper**, `renderApp(url, { as })`, que
monta a **mesma** tabela de rotas exportada por `app/router.tsx`. Nenhum teste
monta uma árvore de rotas sob medida nem renderiza um componente isolado via
props: isso validaria uma aplicação que não existe em produção. Por isso
`<ProductForm>` e `<ProductImageField>` não têm arquivo próprio — são testados
pelas páginas de criar e editar, que são o jeito real de usá-los.

### O princípio: teste comportamento, não implementação

Os testes interagem como um usuário — digitam, clicam — e verificam o que
aparece na tela. Assim, **refatorar não quebra o teste**; mudar o comportamento,
sim. É o que torna a suíte um apoio, e não um peso.

### Por que MSW e não `vi.mock` do service

Se mockássemos `productsService.list`, o teste passaria mesmo com o cliente HTTP
quebrado — não estaríamos exercitando a montagem da URL, o header
`Authorization`, o tratamento de status nem o parse com Zod.

O MSW intercepta no nível da **rede**, então todo o caminho real
(hook → service → cliente HTTP) roda de verdade; só o servidor é falso.

`onUnhandledRequest: 'error'` faz qualquer requisição sem handler **falhar o
teste** — nenhum teste depende da internet.

### O que está coberto

- **Autenticação e guardas** (7): visitante vai ao login e, depois de entrar,
  volta à rota que tentou abrir; validação dos campos e credenciais inválidas
  (sem chamar a API com o formulário vazio); restauração de sessão (F5) e
  logout; token expirado com refresh falhando → login com aviso; 403 para o
  papel somente leitura em criar e editar; 404 fora da área autenticada.
- **Listagem** (5): carregando → produtos; ação de criar por papel; busca de
  ponta a ponta (campo → debounce → URL → parâmetros da API → vazio → "Limpar
  filtros" → catálogo de volta); paginação (página da interface → `skip` da
  API); erro + tentar novamente.
- **Detalhe** (8): id da URL; 404 e id inválido sem "tentar novamente";
  resposta fora do formato sem vazar detalhe técnico; ações por papel;
  confirmação antes de excluir, voltando à lista com o aviso; erro na exclusão.
- **Criar e editar** (9): criação completa com upload (prévia local, "Salvar"
  bloqueado enquanto a imagem sobe, números e URL da imagem no corpo enviado);
  validação e acessibilidade das mensagens, sem chamar a API; erro da API sem
  perder o digitado; imagem grande ou de formato inválido recusada **sem chamar
  a rede**; falha no upload; remoção com liberação do object URL; edição
  partindo dos dados atuais, mantendo a imagem existente e mostrando o aviso no
  detalhe; "Desfazer alterações" devolvendo campos e imagem ao início.
- **Cliente HTTP** (5): `skipAuth`; `HttpError` e `NetworkError`;
  _single-flight_ (um só refresh para várias requisições com 401, e todas
  repetidas); sem loop infinito quando o 401 persiste; query string sem
  `undefined`. O header `Authorization` e o refresh que falha já são exercitados
  pelos testes de autenticação.
- **Upload** (4): corpo multipart com o campo `file` e `Content-Type` gerado
  pelo navegador **com boundary**; erro HTTP e resposta em formato inesperado
  viram `HttpError`; cancelamento.
- **Invalidação de cache** (3): depois de criar, editar e excluir, as chaves
  certas ficam marcadas como obsoletas — e a do produto excluído **não** é
  rebuscada. É a única parte da camada de dados que falha em silêncio: com a
  chave errada, tudo continua "funcionando", a tela só para de se atualizar.
- **Permissões** (4) e **formatação** (5).

### O que NÃO vale a pena testar

- Que digitar altera o valor do input — isso é o React funcionando.
- Detalhes internos (nomes de estado, quantas vezes um componente renderizou).
- Testes vazios (`expect(true).toBe(true)`), que só inflam a contagem.
- Getters e componentes de apresentação triviais.

Pergunte sempre: **se isto quebrar, o usuário percebe?** Se não, provavelmente
não vale um teste.

### Como escrever um teste novo

1. Crie o arquivo **ao lado do código**: `MinhaCoisa.test.tsx`.
2. Precisa de rede? Use os handlers padrão de `src/test/handlers.ts`, ou
   sobrescreva só para o seu caso com `server.use(...)`.
3. Renderize com `renderApp('/sua/rota', { as: 'admin' })`. O `as` semeia os
   tokens na store, reproduzindo o mesmo caminho de um F5 (o loader da rota
   raiz valida o token em `/auth/me`, de onde sai o papel); sem ele, o teste
   começa como visitante. O helper monta um `QueryClient` **novo a cada teste**:
   compartilhar o cache faria um teste servir dado ao seguinte, sem tocar no
   MSW, e a ordem de execução passaria a importar.
4. Prefira um teste que percorra o caminho do usuário (digita, clica, vê o
   resultado) a vários testes de um passo só. Teste unitário só para função
   pura ou para o caso que a tela não consegue provocar.
5. Busque elementos por **papel acessível** (`getByRole`) ou **rótulo**
   (`getByLabelText`), não por classe CSS. Se não achar por papel, geralmente a
   acessibilidade está faltando — o teste acabou de encontrar um bug real.
6. Use `findBy*` (assíncrono) para o que aparece depois de uma requisição — e
   para o **primeiro** elemento de qualquer teste, já que a aplicação só
   renderiza depois que o loader da sessão e o chunk da rota terminam.

### O ambiente de teste

`vite.config.ts` carrega dois arquivos antes de cada teste, **nesta ordem**:

1. `src/test/polyfills.ts` — cobre o que falta no jsdom (`<dialog>`,
   `localStorage` no Node 25, object URLs rastreáveis). Vem primeiro porque a
   store de sessão lê o `localStorage` no instante em que é importada;
2. `src/test/setup.ts` — liga o MSW e, depois de cada teste, desmonta a árvore
   e devolve a store ao estado inicial (`useAuthStore.getInitialState()`).

### E os testes end-to-end?

Não há E2E aqui: um Playwright/Cypress rodando contra uma API cujas escritas são
simuladas testaria muito pouco e adicionaria bastante complexidade.

Se o projeto ganhasse um backend real, o caminho seria instalar o Playwright
(`npm create playwright`) e cobrir **os fluxos críticos** — login, criar produto,
excluir produto —, deixando os casos de borda para os testes atuais, que são
muito mais rápidos.

---

## 17. Debugging

Um roteiro para os problemas mais comuns. A ordem importa: vá do mais provável
para o menos provável, e **confirme cada hipótese** antes de mudar código.

### "O login não funciona"

1. **Abra o DevTools → Network** e clique em Entrar. A requisição
   `POST /auth/login` saiu?
   - **Não saiu** → é validação do formulário. Veja se há mensagem de erro sob
     os campos.
   - **Saiu com 400** → credenciais erradas. Use exatamente `emilys` /
     `emilyspass` (as contas estão na tela de login).
   - **Saiu com erro de CORS/rede** → confira `VITE_API_BASE_URL`. Deve ser
     `https://dummyjson.com`, **sem barra no final**.
2. **Deu 200 mas não entrou?** Olhe a requisição seguinte, `GET /auth/me`. O
   login só termina quando ela responde — é dela que vem o papel do usuário.
3. **Console** → um `[error] Falha ao gravar dados` com um `ZodError`
   (`invalid_type`...)? A API mudou de formato; o erro aponta o campo exato, e
   o esquema correspondente está em `auth.service.ts`.

### "A API retorna 401"

1. **O header foi enviado?** Network → a requisição → Headers → procure
   `Authorization: Bearer ...`.
   - **Ausente** → não há token no storage (DevTools → Application → Local
     Storage → `catalogo.auth`, o JSON gravado pelo `persist`), ou a chamada
     usou `skipAuth`.
2. **Foi enviado e mesmo assim 401?** O token expirou. Isso é normal — o app
   deve renovar sozinho. Procure na Network um `POST /auth/refresh` logo em
   seguida, e depois a requisição original **repetida**.
3. **O refresh falhou?** Então a sessão acabou de verdade: o app desloga e mostra
   "Sua sessão expirou". Se isso acontecer cedo demais, veja
   `VITE_ACCESS_TOKEN_TTL_MINUTES`.
4. Ligue `VITE_ENABLE_DEBUG_LOGS=true` para ver no console
   `401 recebido, tentando renovar a sessão`.

### "A tela fica carregando para sempre"

O `isLoading` só volta a `false` quando a promessa **resolve ou rejeita**. Se
ficou preso, uma destas é a causa:

0. **Preso em "Carregando aplicação..."?** Isso é o boot: o loader da sessão
   ou o chunk da primeira rota não terminou. Veja na Network se `GET /auth/me`
   ou um arquivo `.js` está pendente.
1. **A requisição nunca saiu.** Network vazia → o hook não disparou. Veja se
   `enabled` está `false` (ex.: `useProduct` com id `NaN` porque a URL tem
   `/products/abc`).
2. **A requisição saiu e não voltou.** Fica em _pending_ → problema de rede ou a
   API está fora.
3. **Voltou, mas o componente não atualizou.** Quase sempre é **loop de
   re-render**: a `queryKey` mudando a cada render. Um objeto dentro da chave
   pode (a biblioteca serializa a chave de forma determinística); o que não pode
   é um valor recriado a cada render, como uma função, uma data ou um
   `Math.random()`. Na dúvida, imprima a chave e compare dois renders.
4. Na aba Network, uma mesma requisição repetindo sem parar é a assinatura desse bug.

### "O componente não atualiza"

1. **Você mutou o estado em vez de substituí-lo?**
   `produtos.push(x)` não dispara render; `setProdutos([...produtos, x])` sim.
   O React compara referências.
2. **A dependência está no array do `useEffect`/`useMemo`?** Faltando, o efeito
   não roda de novo. O ESLint avisa (`react-hooks/exhaustive-deps`).
3. **O estado está no lugar certo?** Se dois componentes precisam do mesmo dado,
   ele tem de viver no ancestral comum — ou numa store global, se for o caso.
4. **É estado derivado guardado em `useState`?** Aí ele congela no valor antigo.
   Calcule durante o render.
5. **Efeito rodando duas vezes no dev** é o `StrictMode`, de propósito — ele
   revela efeitos sem limpeza. Não "conserte" removendo o StrictMode; conserte a
   limpeza.

### Ferramentas

- **React DevTools** (extensão) — inspecione props e estado. Para o cache de
  servidor, o equivalente é o `@tanstack/react-query-devtools` (não instalado
  aqui); para a sessão, DevTools → Application → Local Storage →
  `catalogo.auth` mostra os tokens salvos.
  A aba _Profiler_ mostra o que re-renderizou e por quê.
- **Network** — filtre por Fetch/XHR. É onde 80% dos bugs de app aparecem.
- **`VITE_ENABLE_DEBUG_LOGS=true`** — liga os `logger.debug` do projeto.
- **`npm run typecheck`** — muito bug "misterioso" é um tipo errado que o editor
  ainda não revalidou.

---

## 18. Adicionando uma nova feature

Vamos adicionar **Pedidos** (`orders`). Siga na ordem — cada passo só depende
dos anteriores.

### 1. Crie a pasta

```
src/features/orders/
```

Crie **apenas as subpastas que precisar**. Uma feature de leitura simples talvez
só tenha `services/`, `hooks/`, `pages/` e `types/`. Pasta vazia é ruído.

### 2. Tipos e esquemas

`schemas/order.schema.ts` — o validador Zod (o que **roda**):

```ts
export const orderSchema = z.object({
  id: z.number(),
  total: z.number(),
  status: z.enum(['pending', 'paid', 'shipped']),
})
```

`types/order.types.ts` — os tipos, **inferidos** do esquema:

```ts
export type Order = z.infer<typeof orderSchema>
```

Nunca escreva a interface à mão ao lado do esquema: um dia os dois divergem.

### 3. Service

`services/orders.service.ts` — o único lugar que conhece URLs:

```ts
export const ordersService = {
  async list(signal?: AbortSignal): Promise<Order[]> {
    const response = await http.get<unknown>('/orders', { signal })
    return z.array(orderSchema).parse(response)
  },
}
```

Sem React aqui. Pedimos `unknown` ao cliente HTTP e só devolvemos o dado depois
de o Zod confirmar o formato; o `signal` é o que permite ao TanStack Query
cancelar a requisição.

### 4. Hook

`hooks/useOrders.ts` — liga o service ao ciclo de vida do componente:

```ts
export const orderKeys = {
  all: ['orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
}

export function useOrders() {
  return useQuery({
    queryKey: orderKeys.lists(),
    queryFn: ({ signal }) => ordersService.list(signal),
  })
}
```

Escreveu uma tela que **grava**? O hook da mutação mora ao lado, e é ele quem
declara o que a escrita torna obsoleto:

```ts
export function useCreateOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (values: OrderFormValues) => ordersService.create(values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: orderKeys.lists() }),
  })
}
```

### 5. Página

`pages/OrderListPage.tsx` — trate **os quatro estados**. Não pule o vazio:

```tsx
if (ordersQuery.isLoading) return <LoadingState />
if (ordersQuery.isError)
  return <ErrorState error={ordersQuery.error} onRetry={ordersQuery.refetch} />
if (ordersQuery.data?.length === 0) return <EmptyState title="Nenhum pedido" />
return <ul>{/* ... */}</ul>
```

### 6. Componentes

Só extraia quando houver repetição ou quando a página ficar difícil de ler.
Comece com tudo na página — extrair depois é fácil; desfazer uma abstração
errada é caro.

Precisa de um botão, um campo, um alerta? Use `components/ui`. **Não crie um
botão novo.**

### 7. Rota

Em `config/paths.ts`:

```ts
orders: '/orders',
orderDetail: (id: number | string) => `/orders/${id}`,
```

Em `app/router.tsx`, **dentro** do ramo do `AppLayout` (assim já nasce protegida):

```tsx
{
  path: ROUTES.orders,
  lazy: async () => {
    const { OrderListPage } = await import('@/features/orders/pages/OrderListPage')
    return { Component: OrderListPage }
  },
},
```

Precisa de permissão? Envolva com `<RequirePermission permission="order:read" />`
e adicione a permissão em `features/auth/permissions.ts`.

Adicione o link no menu em `app/layout/AppLayout.tsx`.

> A feature nova pode importar de `components/`, `hooks/`, `lib/`, `config/` e
> de `features/auth` (para ler a sessão). Se ela importar de
> `features/products` ou de `app/`, o `npm run lint` acusa — é a regra de
> dependência sendo cobrada.

### 8. Testes

Handlers em `src/test/handlers.ts` (ou `server.use(...)` no próprio teste) e um
arquivo `OrderListPage.test.tsx` cobrindo, no mínimo, **sucesso, vazio e erro**.

### 9. Verifique

```bash
npm run lint
npm run typecheck
npm test
npm run dev     # e teste na mão: feliz, vazio, erro, e com papéis diferentes
```

### Checklist da feature nova

- [ ] Nenhum `import` de outra feature (exceto ler a sessão em `features/auth`)
- [ ] Nenhuma chamada HTTP fora do service, e toda resposta validada com Zod
- [ ] Os quatro estados tratados
- [ ] Tipos inferidos do esquema, sem `any`
- [ ] Rota dentro do ramo protegido
- [ ] Permissões, se a feature escreve dados
- [ ] Testes de sucesso, vazio e erro
- [ ] `lint`, `typecheck` e `test` passando

---

## 19. Corrigindo um bug

Um fluxo profissional — o objetivo não é só fazer o sintoma sumir, é **entender
a causa** e garantir que ele não volte.

### 1. Reproduzir

Antes de qualquer coisa, faça o bug acontecer **na sua máquina, de propósito**.
Escreva os passos exatos:

> Logado como `oliviaw`, abrir `/products/5` → o botão Excluir não aparece.

Se não consegue reproduzir, ainda não tem um bug: tem um relato. Pergunte
navegador, papel do usuário, URL exata e o que apareceu na tela.

### 2. Isolar

Reduza até o menor caso que ainda falha:

- Acontece com **todos** os produtos ou só com um?
- Com **todos** os papéis ou só um?
- Na listagem **e** no detalhe, ou só em um?

No exemplo acima, testar com `emilys` mostraria que funciona — o que aponta
imediatamente para permissões, e não para a chamada HTTP.

### 3. Investigar

Siga o caminho do dado, de fora para dentro (o inverso costuma render menos):

```
A tela mostra o esperado?     → problema de renderização/condicional
   ↓ não
O hook recebeu os dados?      → React DevTools
   ↓ não
A requisição saiu e voltou?   → aba Network
   ↓ não
A função foi chamada?         → breakpoint ou logger.debug
```

### 4. Criar uma hipótese

Escreva a frase completa antes de mexer no código:

> "O botão não aparece porque `can(user, 'product:delete')` devolve `false` para
> `moderator`."

Uma hipótese é **testável**. "Acho que é o estado" não é.

### 5. Confirmar antes de corrigir

Verifique a hipótese — um `logger.debug`, um breakpoint, ou o teste do passo 6.
Corrigir sem confirmar é como trocar peças até o carro pegar: às vezes funciona,
e você não aprendeu nada. Pior, às vezes o sintoma some e a causa fica.

No exemplo, `permissions.ts` confirma: `moderator` realmente não tem
`product:delete`. **Não era bug** — era a regra funcionando. A correção real
talvez seja de UX: explicar por que a ação não está disponível.

### 6. Escrever o teste que falha

Antes da correção, escreva o teste que reproduz o bug e **veja-o falhar em
vermelho**. Isso prova duas coisas: que o teste realmente testa o bug, e que a
correção foi o que o consertou.

```tsx
it('mantém o usuário na página e mostra o erro quando a exclusão falha', async () => {
  // ...
})
```

### 7. Corrigir

A menor mudança que resolve a **causa** — não o sintoma. Se a correção ficou
grande, provavelmente você encontrou um problema de design; vale conversar antes
de seguir.

### 8. Garantir contra regressão

```bash
npm test          # o novo teste passa E nenhum outro quebrou
npm run lint
npm run typecheck
```

Depois teste na mão o caminho original — e os vizinhos que você pode ter afetado.

O teste do passo 6 é o que impede o bug de voltar daqui a seis meses, quando
ninguém mais lembrar desta conversa.

---

## 20. Decisões arquiteturais

Cada decisão no formato: **problema → alternativas → decisão → motivo →
trade-off**. Discordar é legítimo; o que não vale é decidir sem saber o que se
está trocando.

### Vite em vez de Create React App / Next.js

- **Problema:** ferramenta de build e dev server.
- **Alternativas:** CRA (descontinuado), Next.js, Vite.
- **Decisão:** Vite.
- **Motivo:** dev server praticamente instantâneo, configuração mínima, build
  moderno. O Next.js traz SSR, rotas por arquivo e um servidor Node — poder que
  este projeto não usa, mas cuja complexidade pagaria.
- **Trade-off:** sem SSR, então nada de SEO para conteúdo público. Irrelevante
  num painel administrativo atrás de login.

### TypeScript com `strict`

- **Problema:** erros de tipo chegando ao runtime.
- **Alternativas:** JS puro; TS frouxo; TS estrito.
- **Decisão:** `strict: true` mais `noUncheckedIndexedAccess`,
  `noImplicitReturns` e `noImplicitOverride`.
- **Motivo:** `strict` sozinho ainda deixa passar bugs comuns —
  `noUncheckedIndexedAccess` faz `array[i]` ser `T | undefined`, que é a verdade
  e evita a classe de bug mais comum ao lidar com listas de API.
- **Trade-off:** exige checagens que parecem burocráticas no começo. Deixamos
  `exactOptionalPropertyTypes` **desligado**: gera bastante atrito com libs de
  terceiros para pouco ganho aqui.

### Arquitetura por feature em vez de por tipo de arquivo

- **Problema:** onde colocar cada arquivo.
- **Alternativas:** por tipo (`components/`, `hooks/`, `services/` com tudo
  dentro) ou por feature.
- **Decisão:** por feature.
- **Motivo:** mexer numa funcionalidade passa a ser mexer numa **pasta**, e não
  caçar sete arquivos em sete pastas. Escala: a décima feature não aumenta o
  tamanho das outras. E delimita o que pode ser apagado quando a feature morre.
- **Trade-off:** exige disciplina para não criar dependência entre features. Com
  3 ou 4 telas, organizar por tipo seria igualmente bom — a vantagem aparece
  conforme cresce.

### Zustand em vez de Context API (ou Redux)

- **Problema:** o usuário autenticado precisa ser lido em pontos distantes — e
  também **fora da árvore React**, pelo cliente HTTP.
- **Alternativas:** prop drilling, Context, Zustand, Redux Toolkit.
- **Decisão:** uma store Zustand com o middleware `persist`.
- **Por que não Context API:** para um usuário e um par de tokens, que mudam 2
  ou 3 vezes por sessão, Context seria defensável. Três coisas pesam contra:
  1. **re-render em bloco:** o valor do Context é um objeto só, então qualquer
     mudança re-renderiza todos os consumidores. Com seletores
     (`useAuthStore(s => s.user)`), cada componente assina uma fatia;
  2. **estado preso à árvore:** o cliente HTTP e o loader do router rodam fora
     de componentes e não conseguem ler um Context — seria preciso duplicar o
     token num módulo à parte. `useAuthStore.getState()` funciona em qualquer
     lugar;
  3. **persistência escrita à mão:** com Context, ler e gravar o `localStorage`
     seria código nosso. O middleware `persist` faz isso, incluindo a
     reidratação síncrona no boot.
- **Por que não Redux Toolkit:** traria store, slices, reducers e um Provider
  para gerenciar três campos e cinco ações. O ganho (DevTools com
  _time-travel_, middlewares) não se paga neste tamanho.
- **Trade-off:** uma dependência a mais (~1,5 kB gzip) e um estado global que
  vive fora do React — o que exige resetá-lo entre testes (ver
  `src/test/setup.ts`).

### Sessão resolvida num `loader`, e não num componente

- **Problema:** depois de um F5 há token salvo, mas ainda não se sabe de quem
  ele é. Renderizar as rotas antes da resposta causa o _flash_ de tela de login.
- **Alternativas:** um componente "portão" em volta do router, com `useEffect`
  - tela de espera; um loader na rota raiz; middleware do router.
- **Decisão:** loader na rota raiz, com `hydrateFallbackElement`.
- **Motivo:** é o mecanismo que o router já oferece para "espere isto antes de
  renderizar". Sem efeito, sem trava contra a chamada dupla do `StrictMode`,
  sem um terceiro estado "verificando" na store, e os erros caem no
  `errorElement` que já existe.
- **Trade-off:** acopla o boot da sessão ao router. As **guardas** continuam
  sendo componentes (e não loaders/middleware com `redirect`) porque precisam
  reagir a mudanças da store depois do boot — logout e expiração — sem que
  alguém tenha de disparar uma navegação.

### `fetch` em vez de Axios

- **Problema:** cliente HTTP com token, tratamento de erro e refresh.
- **Alternativas:** `fetch` nativo, Axios, ky.
- **Decisão:** `fetch` com uma camada fina em `lib/http/client.ts`.
- **Motivo:** o Axios resolve problemas que aqui custam pouco — interceptors
  (~30 linhas), JSON automático (1 linha), erro em status != 2xx (1 linha),
  baseURL (1 linha). O `fetch` é nativo: zero KB no bundle e suporte nativo a
  `AbortSignal`, que usamos para cancelar requisições.
- **Trade-off:** escrevemos e mantemos essas ~30 linhas, e o único upload com
  progresso do projeto precisou de um módulo à parte com `XMLHttpRequest`
  (`lib/http/upload.ts`). **Quando o Axios se paga:** muitos uploads com
  progresso, ou uma política elaborada de timeout/retry por requisição.
- **Nota:** o importante não é `fetch` vs Axios — é que **tudo passe por um
  ponto só**.

### TanStack Query em vez de um `useQuery` próprio

- **Problema:** estado de servidor (loading, erro, cancelamento, cache,
  revalidação, invalidação após escrita).
- **Alternativas:** `useEffect` + `useState` espalhados, hook próprio, TanStack
  Query, SWR.
- **Decisão:** TanStack Query v5, configurado uma vez em
  `lib/query/query-client.ts`.
- **Por que não um hook próprio:** um `useQuery` caseiro com `useEffect` +
  `useState` resolve loading, erro e cancelamento em ~60 linhas — e para aí.
  Sem cache compartilhado, as categorias seriam buscadas de novo em cada tela;
  sem invalidação, uma mutação não teria como avisar a listagem de que os dados
  mudaram, e só um F5 atualizaria a tela. Buscar dados dentro de `useEffect` é
  hoje o caminho que a própria documentação do React desaconselha.
- **O que a biblioteca traz:** cache por chave com deduplicação,
  _stale-while-revalidate_, `keepPreviousData` na paginação, retry seletivo e,
  principalmente, **invalidação declarativa** (`invalidateQueries`) ao lado de
  cada mutação.
- **Trade-off:** ~12 kB gzip, um modelo mental novo (chaves, `staleTime`) e uma
  configuração a mais nos testes — um `QueryClient` novo por teste, senão o
  cache vaza de um caso para o outro.
- **Por que não SWR:** menor e ótimo para leitura, mas mutações e invalidação
  eram justamente o que precisávamos, e aí o TanStack é mais completo.
- **O que ficou de fora do cache:** a sessão. Ela precisa existir **antes** de
  qualquer tela (as guardas de rota leem dela) e ser lida fora do React (pelo
  cliente HTTP); mantê-la só na store evita duas fontes da verdade para o mesmo
  usuário.

### React Hook Form + Zod

- **Problema:** formulários com validação e mensagens.
- **Alternativas:** `useState` por campo, Formik, RHF; validação manual ou Zod.
- **Decisão:** RHF + Zod.
- **Motivo:** campos não controlados (menos re-render, escala para formulários
  grandes) e um esquema que é **fonte única** da validação **e** do tipo. O Zod
  ainda valida as respostas da API — a mesma ferramenta em dois lugares.
- **Trade-off:** duas dependências (~30 kB gzip somadas) e uma API nova para
  aprender. Para um formulário de dois campos, `useState` bastaria — mas
  padronizar na solução que escala evita reescrever depois.

### Tailwind CSS

- **Problema:** estilos.
- **Alternativas:** CSS puro, CSS Modules, styled-components, Tailwind.
- **Decisão:** Tailwind v4.
- **Motivo:** estilo junto do markup, sem inventar nome para cada div e sem o
  problema do "esta classe ainda é usada?". Zero CSS morto.
- **Trade-off:** markup mais poluído. A defesa é a de sempre: padrão que se
  repete vira **componente** (`Button`, `Alert`, `Field`), não classe copiada.
  CSS Modules seria igualmente defensável — o que não vale é misturar os dois.

### Tokens em `localStorage`

- **Problema:** persistir a sessão entre recarregamentos.
- **Alternativas:** memória, `localStorage`, cookie `HttpOnly`.
- **Decisão:** `localStorage`, **isolado em um único módulo** (a store, via
  `persist`).
- **Motivo:** a API devolve o token no corpo JSON, e só o servidor pode criar um
  cookie `HttpOnly`. Sem backend próprio, não há alternativa que sobreviva ao F5.
- **Trade-off:** **vulnerável a XSS**. É a decisão mais fraca do projeto, e está
  documentada como tal. Estar em um módulo só é o que torna a migração barata.

### MSW nos testes

- **Problema:** testar código que faz requisições.
- **Alternativas:** mockar o service, mockar `fetch`, MSW.
- **Decisão:** MSW.
- **Motivo:** intercepta na rede, então o caminho real (hook → service → cliente
  HTTP) é exercitado de verdade. Mockar o service esconderia bugs de URL, header
  e parse.
- **Trade-off:** uma dependência de desenvolvimento e handlers para manter.

### Ponte de autenticação (`auth-bridge`)

- **Problema:** a camada HTTP precisa do token; a feature de auth precisa da
  camada HTTP. Ciclo.
- **Alternativas:** passar o token em toda chamada de service; import circular;
  inversão de dependência.
- **Decisão:** a camada HTTP declara um contrato e a store de autenticação se
  registra nele.
- **Motivo:** mantém a seta de dependência apontando para um lado só. Passar o
  token por parâmetro poluiria todos os services com um detalhe global.
- **Trade-off:** um módulo com estado global — aceitável porque existe
  exatamente uma sessão por aba.

### Três versões seguradas de propósito

Nem sempre "a última major" é a escolha certa: uma ferramenta só sobe quando o
que depende dela acompanha. Situação conferida em novembro de 2026:

| Ferramenta | Usamos | Existe | O que segura                                                                      |
| ---------- | ------ | ------ | --------------------------------------------------------------------------------- |
| ESLint     | 9      | 10     | `eslint-plugin-jsx-a11y` ainda declara suporte só até o ESLint 9                  |
| TypeScript | 6      | 7      | `typescript-eslint` ainda exige `typescript < 6.1`                                |
| MSW        | 2      | 3      | com a v3 os testes de upload (XHR no jsdom) quebram; migrar é um trabalho à parte |

- **Motivo:** preferimos um conjunto coerente a forçar a instalação com
  `--force` e conviver com avisos de peer dependency ou testes quebrados.
- **Trade-off:** ficamos uma major atrás nessas três. Para conferir se já dá
  para subir: `npm outdated` e, em seguida, `npm view <pacote> peerDependencies`.

---

## 21. Segurança

### A regra que resume tudo

> **O frontend não é uma fronteira de segurança.**

Todo o código desta pasta roda no navegador do usuário. Ele pode ser lido,
alterado e contornado com o DevTools aberto. Qualquer regra que **importa** tem
de ser aplicada pelo backend.

Neste projeto isso é literalmente verificável: `POST /products/add` da DummyJSON
funciona **sem token nenhum**. Nossas permissões escondem botões — não protegem
dados.

### O que é real e o que é demonstração aqui

| Item                       | Situação                                               |
| -------------------------- | ------------------------------------------------------ |
| Login com JWT real         | ✅ Real — a DummyJSON emite e valida tokens de verdade |
| Refresh de token           | ✅ Real — inclusive com rotação                        |
| `/auth/me` exigindo Bearer | ✅ Real — responde 401 sem token                       |
| Permissões por papel       | ⚠️ **Só interface** — a API não valida                 |
| Rotas protegidas           | ⚠️ **Só navegação** — não protege dados                |
| Token em `localStorage`    | ⚠️ **Didático** — vulnerável a XSS                     |
| Escritas (POST/PUT/DELETE) | ⚠️ **Simuladas** pela API                              |

### XSS (Cross-Site Scripting)

Um atacante consegue executar JavaScript na sua página e, com isso, ler o
`localStorage`, roubar o token e agir como o usuário.

**O que nos protege:** o React **escapa por padrão** todo conteúdo interpolado.
`{product.title}` com `<script>` vira texto, não código.

**O que quebraria isso:**

```tsx
<div dangerouslySetInnerHTML={{ __html: conteudoDaApi }} /> // ← perigo real
```

O nome é assustador de propósito. **Este projeto não usa em lugar nenhum.** Se
um dia precisar renderizar HTML vindo da API, sanitize antes (DOMPurify) — e
pergunte primeiro se dá para evitar.

Cuidado também com `href={valorDaApi}`: um `javascript:...` executa código.

### Upload de arquivos

Aceitar arquivo do usuário é uma das superfícies de ataque mais perigosas.
O que fazemos aqui, e o que dependeria do servidor:

| Risco                                | Defesa no frontend                      | Defesa real (servidor)                         |
| ------------------------------------ | --------------------------------------- | ---------------------------------------------- |
| Arquivo executável disfarçado        | checa `type` e extensão (**forjáveis**) | inspecionar _magic bytes_ do conteúdo          |
| SVG com `<script>` (XSS)             | SVG fora dos formatos aceitos           | servir em outro domínio, `Content-Disposition` |
| Arquivo gigante (negação de serviço) | limite de 2 MB antes de enviar          | limite na borda, antes de ler na memória       |
| Nome com `../` (path traversal)      | —                                       | gerar nome novo, nunca usar o do usuário       |

A regra vale igual: **a validação do cliente é UX**. Quem envia por `curl` não
passa por ela. Veja [Upload de arquivos](#14-upload-de-arquivos).

### CORS

O navegador bloqueia requisições para outra origem, a menos que o **servidor**
autorize com os headers `Access-Control-Allow-*`. A DummyJSON autoriza, por isso
funciona direto do `localhost`.

Dois pontos que costumam confundir:

- CORS é uma proteção **do navegador**, aplicada pelo **servidor**. Você não
  "conserta" CORS no frontend;
- se aparecer erro de CORS, o problema está na configuração do servidor (ou você
  chamou a URL errada).

### CSRF

Ataque em que outro site faz o navegador enviar uma requisição autenticada em
nome do usuário, aproveitando cookies enviados automaticamente.

**Não nos afeta hoje** porque o token vai num header `Authorization`, que não é
enviado automaticamente por outros sites.

**Passaria a afetar** se migrássemos para cookies — e aí a defesa seria
`SameSite=Strict` mais um token anti-CSRF. É um trade-off consciente de trocar
"risco de XSS" por "risco de CSRF" (este último bem mais fácil de mitigar).

### Variáveis de ambiente — o mal-entendido mais comum

**Tudo que começa com `VITE_` é embutido no bundle JavaScript.** O Vite
substitui `import.meta.env.VITE_X` pelo valor literal em tempo de build.
Qualquer usuário lê abrindo o DevTools.

```bash
VITE_API_BASE_URL=https://dummyjson.com   # ✅ configuração pública
VITE_UPLOAD_API_BASE_URL=https://...      # ✅ configuração pública
VITE_API_SECRET=abc123                    # ❌ NUNCA — vai para o bundle
```

As variáveis usadas pelo projeto são exatamente estas quatro (todas públicas,
todas validadas no boot por `src/config/env.ts`):

| Variável                        | Para quê                                      |
| ------------------------------- | --------------------------------------------- |
| `VITE_API_BASE_URL`             | API de produtos e autenticação (DummyJSON)    |
| `VITE_UPLOAD_API_BASE_URL`      | API de upload de arquivos (Platzi Fake Store) |
| `VITE_ACCESS_TOKEN_TTL_MINUTES` | Validade do access token pedida no login      |
| `VITE_ENABLE_DEBUG_LOGS`        | Liga os `logger.debug` no console             |

**Nunca** coloque em `.env` de frontend: senha, API secret, chave privada,
credencial de banco, token de serviço.

Se uma chamada precisa de segredo, ela **não pode sair do navegador**: quem a faz
é o backend, que guarda o segredo e expõe um endpoint para o frontend.

### HTTPS

Sem ele, qualquer um na mesma rede lê o token em trânsito. Não é opcional em
produção. A API deste projeto já é HTTPS.

### Dependências

Cada dependência é código de terceiros rodando na sua página. Este projeto tem
poucas de propósito.

```bash
npm audit              # vulnerabilidades conhecidas
npm audit fix          # aplica as correções que não quebram nada
npm outdated           # o que tem versão mais nova
```

Na última verificação (novembro de 2026), o `npm audit` aponta **7 avisos de
severidade moderada, todos na mesma cadeia**: `typescript-eslint` → `minimatch`
(negação de serviço ao processar um padrão de glob malicioso). Vale ler o
relatório com critério em vez de só contar o número:

- é uma dependência **de desenvolvimento** (roda no lint), não vai para o
  bundle entregue ao usuário;
- a correção oferecida, `npm audit fix --force`, **rebaixaria** o
  `typescript-eslint` para uma versão antiga — pior que o problema;
- some sozinho quando o `typescript-eslint` atualizar essa dependência.

Nas dependências de produção (as que chegam ao navegador): **zero**. Confira
com `npm audit --omit=dev`.

### Validação

Validamos no frontend para dar **feedback rápido** — nunca por segurança. Quem
não passa pelo formulário (curl, DevTools, script) não passa pela nossa
validação. O servidor precisa validar tudo de novo, sempre.

### Boas práticas já aplicadas aqui

- Mensagem de login genérica ("Usuário ou senha inválidos"), sem revelar se a
  conta existe;
- tokens isolados em um módulo só, facilitando a migração para cookies;
- `.env` no `.gitignore` (só a configuração pública é versionada);
- sem `dangerouslySetInnerHTML`;
- sem `any`;
- respostas da API validadas em runtime com Zod;
- entrada de URL (parâmetros e query string) validada antes do uso.

---

## 22. Produção

O que ainda faltaria para colocar isto no ar de verdade.

### Indispensável

1. **Um backend próprio.** É o que destrava quase tudo abaixo: validação real,
   autorização real, escrita que persiste e cookies `HttpOnly`.
2. **Autenticação segura:** refresh token em cookie `HttpOnly; Secure;
SameSite`, access token curto em memória, rotação com detecção de reuso e
   revogação no logout.
3. **Autorização no servidor.** As permissões de `permissions.ts` precisam
   existir no backend — lá elas valem; aqui, só escondem botões.
4. **HTTPS** com redirecionamento de HTTP.
5. **Headers de segurança**, configurados no servidor/CDN:
   `Content-Security-Policy` (a melhor defesa contra XSS),
   `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`,
   `Referrer-Policy`.
6. **SPA fallback**: qualquer rota deve servir o `index.html`, senão o F5 em
   `/products/5` devolve 404 no servidor. (Verificado localmente com
   `npm run preview`.)

### Importante

7. **CI/CD** rodando `lint`, `typecheck`, `test` e `build` a cada PR. Os scripts
   já existem; falta o workflow.
8. **Monitoramento de erros** (Sentry ou similar) ligado em `lib/logger.ts` — o
   ponto de extensão já está pronto.
9. **Variáveis por ambiente de verdade**: `VITE_API_BASE_URL` apontando para
   staging e produção, injetadas no build de cada ambiente.
10. **Cache de assets**: os arquivos em `dist/assets` têm hash no nome, então
    podem ter cache longo; o `index.html`, **nunca**.

### Desejável

11. **Testes E2E** (Playwright) nos fluxos críticos, quando houver backend real.
12. **Acessibilidade auditada** com axe/Lighthouse, além das boas práticas já
    aplicadas.
13. **Orçamento de bundle**: hoje a primeira visita baixa cerca de 155 kB de
    JavaScript gzip (React DOM responde por ~57 deles), aceitável para um
    painel interno. O `npm run build` lista o tamanho de cada _chunk_; se
    crescer, investigue com um analisador de bundle.
14. **Internacionalização**, se o público não for só de língua portuguesa. Hoje
    os textos estão no código — o que é honesto para um projeto deste tamanho.

---

## 23. Checklist

Rode na ordem. Todos foram verificados neste projeto.

```bash
npm install
npm run lint
npm run typecheck
npm test
npm run build
npm run dev
```

- [ ] `npm install` conclui sem erros (`npm audit --omit=dev` sem vulnerabilidades)
- [ ] `npm run dev` sobe e a aplicação abre em http://localhost:5173
- [ ] `npm run lint` passa sem erros
- [ ] `npm run typecheck` passa sem erros
- [ ] `npm test` — 50 testes passando
- [ ] `npm run build` gera `dist/` com os chunks separados por rota
- [ ] `npm run preview` serve o build e rotas profundas funcionam
- [ ] Login com `emilys` / `emilyspass` funciona
- [ ] Recarregar a página (F5) **mantém** a sessão
- [ ] Sair e tentar `/products` redireciona para o login
- [ ] Logar de novo devolve à rota que você tentou acessar
- [ ] Entrar como `averyp` esconde criar/editar/excluir
- [ ] Acessar `/products/new` como `averyp` leva ao `/403`
- [ ] Buscar por algo inexistente mostra o **estado vazio** (não tela branca)
- [ ] Uma URL inválida mostra a página **404**
- [ ] `/products/abc` mostra erro, sem travar carregando
- [ ] Enviar o formulário vazio mostra erros **por campo**
- [ ] `.env.example` está atualizado com todas as variáveis usadas

### Para conferir você mesmo, sem confiar na documentação

- Filtros na URL: aplique uma busca, copie a URL, cole em outra aba — o filtro
  deve vir junto.
- Refresh de token: ponha `VITE_ACCESS_TOKEN_TTL_MINUTES=1` no `.env`, reinicie
  o `dev`, espere um minuto, navegue e observe o `POST /auth/refresh` na aba
  Network — sem ser deslogado.
- Escrita simulada: crie um produto, repare no id retornado e procure por ele na
  lista. Ele **não** estará lá — e a mensagem na tela já avisa disso.
