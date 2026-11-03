# Backend Sensus 3.0

## Como rodar

```bash
cd backend
npm install
copy .env.example .env
npm run dev
```

No arquivo `.env`, coloque a senha do MySQL.

## Teste rápido

Abra:

```txt
http://localhost:3000/teste-banco
```

## Fluxo inicial

1. Registrar empresa e administrador: `POST /api/auth/registrar`
2. Fazer login: `POST /api/auth/login`
3. Copiar o token JWT.
4. Nas outras rotas, usar header:

```txt
Authorization: Bearer SEU_TOKEN
```

## Rotas principais

- `POST /api/auth/registrar`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/empresas`
- `GET /api/usuarios`
- `GET /api/setores`
- `GET /api/5s/sensos`
- `GET /api/5s/criterios`
- `POST /api/auditorias`
- `POST /api/auditorias/:id/respostas`
- `POST /api/auditorias/:id/finalizar`
- `GET /api/dashboard/resumo`

## Migrações

As alterações estruturais do sistema ficam em `backend/database/migrations/`.

Para a primeira fase das melhorias, execute no MySQL/Railway:

`001_melhorias_setores_auditores.sql`

Ela adiciona código do setor, responsável pelo cadastro, auditor responsável, periodicidade, histórico de inativação, dados de prazo/execução da auditoria e a tabela de evidências.
<<<<<<< HEAD


## Checklist ponderado de 50 critérios (Fase 2)

Antes de executar, faça backup do banco local e finalize ou abandone auditorias que estejam em andamento. A migration `database/migrations/002_checklist_50_criterios_ponderados.sql` configura os 10 primeiros critérios de cada senso (50 no total), com pesos de 1 a 3. Ela desativa critérios antigos que não fazem parte do novo checklist, sem apagar seus registros ou respostas históricas.

Execute a migration no banco local correto, usando o MySQL Workbench. Se você já executou a migration anterior de 100 critérios, esta versão desativará os critérios excedentes e manterá o histórico. Faça backup antes de executar. Ao final, confira a consulta de verificação: cada senso deve apresentar 10 critérios ativos.

A escala de avaliação da auditoria é de 1 a 5. O cálculo ponderado usa `nota × peso_aplicado`, dividido pela pontuação máxima ponderada. O dashboard usa o peso registrado na resposta para não recalcular auditorias antigas com pesos alterados posteriormente.

## Configuração de ambiente

O arquivo `.env` contém credenciais e não deve ser compartilhado nem versionado. Use `.env.example` como modelo e preencha os valores locais antes de iniciar o backend.
=======
>>>>>>> 52b09e49628db99d4cb23762cc1539072231c357
