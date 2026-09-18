# Catálogo Admin

Painel administrativo de produtos em **React + TypeScript**, criado como projeto
de estudo que se parece com uma aplicação real: autenticação JWT, rotas
protegidas, autorização por papel, CRUD, formulários validados, tratamento de
erros e testes.

O código é comentado explicando **por que** cada decisão foi tomada — inclusive
as alternativas descartadas.

## Stack

|             |                                                                         |
| ----------- | ----------------------------------------------------------------------- |
| Interface   | React 19, React Router 7, Tailwind CSS 4                                |
| Linguagem   | TypeScript 6 (`strict`)                                                 |
| Build       | Vite 8                                                                  |
| Formulários | React Hook Form 7 + Zod 4                                               |
| Estado      | TanStack Query 5 (servidor) + Zustand 5 (sessão)                        |
| Testes      | Vitest 4, Testing Library, MSW 2                                        |
| Qualidade   | ESLint 9, Prettier 3                                                    |
| API         | [DummyJSON](https://dummyjson.com) — pública, com JWT real              |
| Upload      | [Platzi Fake Store](https://fakeapi.platzi.com) — upload multipart real |

Estado de SERVIDOR (produtos, categorias) vive no cache do TanStack Query, com
invalidação automática após cada mutação; estado de SESSÃO vive numa store
Zustand persistida em `localStorage`. Estado de tela mora onde é usado, e os
filtros da listagem moram na URL. As decisões — inclusive as alternativas
descartadas — estão em [`docs.md`](./docs.md#20-decisões-arquiteturais).

## Como executar

Requer **Node 20.19+ ou 22.12+**.

```bash
npm install
npm run dev          # http://localhost:5173
```

Não precisa configurar nada: `.env.development` já vem com a configuração
pública necessária.

### Entre com uma destas contas

| Usuário   | Senha         | Papel           | Pode                   |
| --------- | ------------- | --------------- | ---------------------- |
| `emilys`  | `emilyspass`  | Administrador   | criar, editar, excluir |
| `oliviaw` | `oliviawpass` | Moderador       | criar, editar          |
| `averyp`  | `averyppass`  | Somente leitura | visualizar             |

> Entre com papéis diferentes e repare nos botões de ação aparecendo e sumindo —
> é a autorização em funcionamento.

## Scripts

| Comando                | O que faz                             |
| ---------------------- | ------------------------------------- |
| `npm run dev`          | Servidor de desenvolvimento           |
| `npm run build`        | Checa tipos e gera o build em `dist/` |
| `npm run preview`      | Serve o build de produção             |
| `npm test`             | Roda os testes (73)                   |
| `npm run test:watch`   | Testes em modo observador             |
| `npm run lint`         | ESLint                                |
| `npm run lint:fix`     | ESLint corrigindo o automatizável     |
| `npm run typecheck`    | Só checagem de tipos                  |
| `npm run format`       | Formata com Prettier                  |
| `npm run format:check` | Verifica a formatação (CI)            |

## O que o projeto demonstra

- **Autenticação JWT real** — login, `/auth/me`, refresh automático no 401
  (com proteção contra refresh duplicado), restauração de sessão após F5
- **Autorização** por permissão, com rotas e ações que respeitam o papel
- **Arquitetura por feature** com direção de dependência única e sem ciclos
- **Camada HTTP** centralizada sobre `fetch`, com erros tipados
- **Quatro estados de interface** em toda tela que consome API: carregando,
  erro (com nova tentativa), vazio e sucesso
- **Formulários** com validação, acessibilidade e proteção contra envio duplo
- **Upload de imagem** com arrastar-e-soltar, prévia, barra de progresso real
  (via XHR, porque `fetch` não reporta progresso de envio) e validação
- **Estado no lugar certo**: local, na URL, global, de servidor e derivado
- **73 testes** de comportamento, com a rede interceptada pelo MSW

## Estrutura

```
src/
├── app/          Composição: providers, rotas, guardas
├── components/   UI compartilhada (ui, feedback, layout)
├── config/       Variáveis de ambiente validadas
├── features/     auth/ e products/ — o coração do projeto
├── hooks/        Hooks genéricos
├── lib/          HTTP, server state, log, formatação
├── pages/        Telas transversais (404, 403)
└── test/         Infraestrutura de teste
```

## Limitações conhecidas

A API pública tem restrições que o projeto **não esconde** — pelo contrário,
avisa o usuário na interface:

- **Escritas são simuladas**: `POST`/`PUT`/`DELETE` respondem com sucesso mas
  não persistem nada;
- **Escritas não exigem token**, o que torna as permissões puramente de
  interface — a demonstração perfeita de que _frontend não é fronteira de
  segurança_;
- **Busca e filtro por categoria não se combinam** (são endpoints distintos);
- **Tokens ficam em `localStorage`** por limitação da API — documentado como
  didático, não como padrão de produção;
- **O upload usa uma segunda API** (Platzi Fake Store), porque a DummyJSON não
  aceita arquivo. O arquivo é enviado de verdade, mas o vínculo com o produto
  não persiste.

Detalhes e o que mudaria com um backend próprio em
[`docs.md`](./docs.md#11-api).

## Documentação

O **[`docs.md`](./docs.md)** é o manual completo: explica pasta por pasta, o
fluxo da aplicação, JWT em profundidade, a estratégia de erros, um guia de
depuração ("o login não funciona, como investigar?"), como adicionar uma feature
nova passo a passo e todas as decisões arquiteturais com seus trade-offs.
