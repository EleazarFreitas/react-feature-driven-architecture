import { z } from 'zod'

/**
 * Esquema de validação do formulário de login.
 *
 * POR QUE ZOD (e não validação manual ou só o `required` do HTML):
 *   1. O esquema é a ÚNICA fonte da verdade: o tipo do formulário é derivado
 *      dele com `z.infer`. Não existe o risco clássico de mudar o formulário e
 *      esquecer de atualizar a interface (ou o contrário);
 *   2. as mensagens ficam junto da regra, não espalhadas pela UI;
 *   3. é a mesma ferramenta que valida as respostas da API (ver auth.service):
 *      uma biblioteca só para "o que entra no app precisa ter este formato".
 *
 * Validação de formato aqui é sobre EXPERIÊNCIA (avisar cedo, sem ida à rede).
 * Não substitui a validação do servidor, que é a que realmente protege os dados.
 */
export const loginSchema = z.object({
  username: z.string().trim().min(1, 'Informe seu usuário'),
  // Só exigimos "não vazio": regras de força de senha pertencem ao CADASTRO.
  // Exigir 8+ caracteres no login apenas impediria o usuário de tentar uma
  // senha legada e mostraria um erro que não é dele.
  password: z.string().min(1, 'Informe sua senha'),
})

/** Tipo derivado do esquema — nunca escrito à mão. */
export type LoginFormValues = z.infer<typeof loginSchema>
