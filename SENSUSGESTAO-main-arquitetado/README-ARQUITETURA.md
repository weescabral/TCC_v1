# Sensus 3.0 - Arquitetura aplicada

Este pacote contém o frontend. Já o backend tem uma estrutura MVC em Node.js + Express + MySQL.

## Estrutura

```txt
backend/
  config/
  controllers/
  middlewares/
  models/
  routes/
  services/
  uploads/
  utils/
  server.js
frontend/
  index.html
  pages/
  css/
  js/
```

## Rodar backend

```bash
cd backend
npm install
copy .env.example .env -> significa "Computador, pegue o arquivo .env.example (o molde), tire uma cópia exata dele e dê o nome de .env para essa nova cópia."
Edite o `.env` e coloque sua senha do MySQL.


npm run dev
```



## Testar banco
Você digita http://localhost:3000/teste-banco no navegador e dá Enter.
Se o banco responder, o Node te devolve uma mensagem na tela do navegador, algo como: "Conexão com o banco efetuada com sucesso!". Se der erro, ele vai te mostrar o erro na tela ou travar o terminal.
```txt
http://localhost:3000/teste-banco
```

## Primeiro cadastro pelo Postman/Insomnia
Para liberar o primeiro acesso ao sistema, realize uma requisição POST para o endpoint de registro:

POST URL `http://localhost:3000/api/auth/registrar`


Body (JSON):
```json
{
  "empresa": {
    "nome": "Mercadinho Central",
    "cnpj": "12.345.678/0001-90",
    "telefone": "(98) 99999-9999",
    "email": "contato@mercado.com",
    "endereco": "Rua A, Centro"
  },
  "usuario": {
    "nome": "Administrador",
    "email": "admin@sensus.com",
    "senha": "123456",
    "perfil": "administrador"
  }
}
```

Depois faça login em POST `/api/auth/login`.
