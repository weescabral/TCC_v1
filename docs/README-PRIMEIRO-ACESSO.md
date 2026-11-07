# Assistente de primeiro acesso — Sensus 5S

## O que foi adicionado
- Guia inicial com cinco etapas orientativas.
- Salvamento da etapa atual no banco por empresa.
- Opção **Pular tutorial por agora**, que grava o estado como `adiado`.
- Empresas que pularem podem retomar pelo card no dashboard.
- Ao concluir, o guia não é exibido automaticamente novamente.

## Instalação
1. Faça backup do banco `sensus_db`.
2. No MySQL Workbench, selecione `sensus_db`.
3. Execute `backend/database/migrations/005_onboarding_empresa.sql` uma única vez.
4. Reinicie o backend (`npm run dev`).
5. Abra o sistema pelo Live Server e entre com um usuário administrador.

## Comportamento
- Na primeira entrada do administrador, o sistema abre `pages/configuracao-inicial.html`.
- **Próxima etapa** salva o progresso.
- **Pular tutorial por agora** registra `adiado` e leva ao dashboard. Não marca o guia como concluído.
- O card "Continue preparando sua empresa" aparece no dashboard para retomar o guia.
- **Concluir configuração** registra `concluido`.

A sequência do guia é: configurar perfil; cadastrar auditores; cadastrar setores e atribuir seus responsáveis; definir periodicidade; iniciar a primeira auditoria.

A página é um guia orientativo: os cadastros de setores e usuários continuam sendo realizados nas telas próprias, abertas pelos atalhos de cada etapa.
