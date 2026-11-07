# Sensus 5S — Fase 3: Usuários e permissões

Esta entrega parte do pacote da Fase 2 e adiciona a área administrativa de usuários, além de reforçar a separação entre administrador e auditor.

## Funcionalidades

- Página `frontend/pages/usuarios.html` para administradores.
- Cadastro de usuários com perfil Administrador ou Auditor.
- Edição de nome, e-mail e perfil.
- Redefinição administrativa de senha (mínimo de 8 caracteres).
- Inativação com motivo, preservando o histórico.
- Indicadores de equipe e quantidade de setores atribuídos.
- Menu Usuários exibido apenas para administradores.
- Para auditores, a página de setores passa a ser apresentada como **Meus Setores**.
- Auditores visualizam somente setores atribuídos a eles; a API também valida a consulta individual.
- Criação, edição e desativação de setores e listagem de auditores são restritas ao administrador na API.
- Um administrador não pode rebaixar ou inativar a própria conta pela gestão de usuários.

## Banco de dados

Esta fase reutiliza os campos já adicionados pela migration `001_melhorias_setores_auditores.sql` (`usuarios.ativo`, `usuarios.motivo_inativacao`, `usuarios.inativado_em` e `setores.auditor_id`). **Não há nova migration nesta fase**, desde que as migrations anteriores da Fase 1 e Fase 2 já tenham sido executadas.

## Como testar

1. Faça backup do banco e mantenha uma cópia da pasta atual.
2. Extraia o ZIP em uma pasta nova e abra essa pasta no VS Code.
3. Confirme que as migrations `001`, `002` e `003` já foram executadas no banco utilizado.
4. Inicie o backend (`npm run dev` dentro de `backend`).
5. Entre com uma conta Administrador e abra **Usuários** na sidebar.
6. Cadastre um usuário Auditor com senha inicial de pelo menos 8 caracteres.
7. Encerre a sessão e entre com o usuário Auditor. A sidebar deve mostrar **Meus Setores**, sem acesso ao cadastro/edição de setores nem à gestão de usuários.
8. Atribua um setor ao auditor pela tela Setores usando a conta Administrador; entre novamente como auditor e confirme que somente os setores atribuídos aparecem.

## Observações de segurança

- As permissões são aplicadas no backend, não apenas escondidas na interface.
- A senha é armazenada com bcrypt.
- A inativação não apaga o registro nem o histórico.
- A atribuição de setor usa o campo `setores.auditor_id` já existente.
- A redefinição de senha feita por administrador não exige a senha atual do usuário; restrinja o acesso à tela de usuários a pessoas confiáveis.
