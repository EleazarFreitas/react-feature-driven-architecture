import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'

import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { HttpError } from '@/lib/http/errors'
import { getErrorMessage } from '@/lib/http/errors'

import { loginSchema, type LoginFormValues } from '../schemas/login.schema'
import { useAuthStore } from '../store/auth.store'

/**
 * Formulário de login.
 *
 * POR QUE REACT HOOK FORM + ZOD (e não useState por campo):
 *
 *   - RHF mantém os campos NÃO CONTROLADOS (lê o valor do DOM via ref). Com
 *     useState, cada tecla digitada re-renderiza o formulário inteiro. Com dois
 *     campos isso é irrelevante; num formulário de 20 campos é a diferença
 *     entre fluido e travado. Padronizar na solução que escala evita reescrever
 *     depois;
 *   - RHF já traz o que sempre acabamos reimplementando à mão: estado de
 *     "enviando", campos tocados, foco no primeiro campo inválido;
 *   - Zod descreve a regra UMA vez e o tipo do formulário sai dela por
 *     inferência — formulário e tipo não têm como divergir.
 *
 * Custo honesto: duas dependências (~13 KB gzip somados). Vale porque
 * formulários são o coração de um app administrativo.
 */

interface LoginFormProps {
  /** Para onde ir após o login. Quem decide isso é a página, não o formulário. */
  onSuccess: () => void
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const login = useAuthStore((state) => state.login)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
    // Valida ao sair do campo. "onChange" acusaria erro já na primeira letra
    // digitada, o que é hostil; "onSubmit" só avisa no fim. onBlur é o meio-termo.
    mode: 'onBlur',
  })

  /**
   * `useMutation` do TanStack Query: ele cuida de "enviando" (`isPending`) e de
   * capturar o erro (`error`) sem nenhum try/catch aqui.
   *
   * Repare que o callback de sucesso é passado no `mutate`, e não no hook: quem
   * sabe o que fazer depois do login é ESTE componente, e a mutação continua
   * ignorando o resultado quando o formulário já foi desmontado.
   */
  const loginMutation = useMutation({ mutationFn: login })

  const onSubmit = handleSubmit((values) => {
    // A trava de clique duplo é o botão desabilitado por `isPending`; esta
    // checagem cobre o envio por Enter, que o botão desabilitado não impede.
    if (loginMutation.isPending) return

    loginMutation.mutate(values, { onSuccess })
  })

  return (
    // `noValidate` desliga os balões de validação do navegador: as mensagens são
    // nossas, traduzidas e ligadas ao campo via aria-describedby.
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {loginMutation.error !== null && (
        <Alert variant="error" title="Não foi possível entrar">
          {describeLoginError(loginMutation.error)}
        </Alert>
      )}

      <Input
        label="Usuário"
        autoComplete="username"
        /**
         * A regra jsx-a11y/no-autofocus existe porque mover o foco sem o
         * usuário pedir desorienta quem usa leitor de tela — o cursor "pula"
         * para um lugar que a pessoa ainda não sabe que existe.
         *
         * Abrimos exceção aqui porque esta página tem UMA função e um único
         * formulário: o foco vai para onde a pessoa iria de qualquer forma,
         * nada é pulado no caminho, e quem usa teclado economiza os Tabs.
         * É a exceção reconhecida da regra, não um descuido.
         *
         * Em qualquer tela com mais conteúdo, a regra deve ser respeitada.
         */
        // eslint-disable-next-line jsx-a11y/no-autofocus -- ver justificativa acima
        autoFocus
        error={errors.username?.message}
        {...register('username')}
      />

      <Input
        label="Senha"
        type="password"
        // Ajuda o gerenciador de senhas do navegador a preencher corretamente.
        autoComplete="current-password"
        error={errors.password?.message}
        {...register('password')}
      />

      <Button type="submit" isLoading={loginMutation.isPending} className="mt-2">
        {loginMutation.isPending ? 'Entrando...' : 'Entrar'}
      </Button>
    </form>
  )
}

/**
 * A DummyJSON devolve 400 com a mensagem "Invalid credentials" para usuário ou
 * senha errados. Traduzimos aqui, na feature, porque é conhecimento específico
 * DESTA API — o tratamento genérico de erros (lib/http/errors) não deve
 * conhecer mensagens de um endpoint específico.
 *
 * Não dizemos QUAL dos dois está errado: informar "este usuário existe, a senha
 * é que está errada" ajuda quem está tentando adivinhar contas.
 */
function describeLoginError(error: unknown): string {
  if (error instanceof HttpError && error.status === 400) {
    return 'Usuário ou senha inválidos.'
  }
  return getErrorMessage(error)
}
