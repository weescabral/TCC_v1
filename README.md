# 📊 Sensus 5S — Sistema Inteligente de Gestão e Auditoria 5S

**Plataforma web para gestão organizacional, auditoria, monitoramento de desempenho e melhoria contínua baseada na metodologia japonesa 5S.**

<p align="center">
  <img src="https://img.shields.io/badge/Status-Em%20desenvolvimento-FFC107?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Node.js-Backend-339933?style=for-the-badge&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/MySQL-Database-4479A1?style=for-the-badge&logo=mysql&logoColor=white" />
  <img src="https://img.shields.io/badge/JavaScript-Frontend-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" />
</p>

---

## 📌 Sobre o Projeto

O **Sensus 5S** é um sistema web desenvolvido com o objetivo de digitalizar, automatizar e otimizar a gestão de auditorias organizacionais fundamentadas na metodologia japonesa 5S.

A plataforma substitui processos manuais e planilhas descentralizadas por um ambiente integrado, permitindo o cadastro de setores, gerenciamento de usuários, aplicação de checklists, registro de evidências, acompanhamento de indicadores e elaboração de planos de ação.

Além da realização das auditorias, o sistema oferece recursos de análise gerencial, histórico de desempenho e geração de relatórios em PDF, contribuindo para a tomada de decisões e para a melhoria contínua dos processos organizacionais.

O projeto busca oferecer uma solução acessível, intuitiva e funcional, especialmente para pequenos negócios que desejam implementar e acompanhar a metodologia 5S.

## 🎯 Objetivo

Desenvolver uma plataforma inteligente de gestão comercial e auditoria 5S capaz de centralizar informações organizacionais, mensurar o desempenho dos setores e auxiliar na identificação de oportunidades de melhoria.

## 🏗️ Os cinco sensos da metodologia 5S

A plataforma utiliza os cinco pilares da metodologia japonesa:

| Senso | Significado | Objetivo |
|---|---|---|
| **Seiri** | Utilização | Identificar e eliminar o que não é necessário. |
| **Seiton** | Organização | Organizar materiais e recursos de maneira eficiente. |
| **Seiso** | Limpeza | Manter ambientes limpos e adequados. |
| **Seiketsu** | Padronização | Estabelecer padrões para manter os resultados. |
| **Shitsuke** | Disciplina | Desenvolver hábitos e manter a melhoria contínua. |

---

## 🚀 Principais Funcionalidades

### 1. Dashboard Executivo
- Visualização dos principais indicadores organizacionais.
- Índice geral de desempenho.
- Média anual das auditorias finalizadas.
- Cobertura de auditorias por setor.
- Indicadores de planos de ação pendentes.
- Identificação dos melhores e menores resultados.
- Gráficos de evolução histórica e desempenho por senso.

### 2. Gestão de Setores
- Cadastro, edição e desativação de setores.
- Identificação padronizada por códigos sequenciais.
- Associação de auditores responsáveis.
- Definição de periodicidade das auditorias.
- Acompanhamento do último resultado de cada setor.
- Histórico de desempenho.

### 3. Auditoria Inteligente 5S
- Avaliação dos cinco sensos.
- Checklist com 10 critérios por senso, totalizando 50 critérios.
- Escala de avaliação de 1 a 5.
- Critérios com pesos diferenciados.
- Cálculo automatizado do desempenho percentual.
- Registro de observações e evidências fotográficas.
- Armazenamento de imagens no Cloudinary.
- Histórico de auditorias e consulta das evidências.
- Proteção do andamento da auditoria.

### 4. Sistema de Pontuação
O Sensus 5S utiliza uma metodologia de pontuação ponderada, considerando a nota atribuída a cada critério e seu respectivo peso.

A fórmula utilizada é:

\[
\text{Desempenho (\%)} =
\frac{\sum(\text{Nota}\times\text{Peso})}
{\sum(5\times\text{Peso})}
\times 100
\]

A classificação dos resultados segue quatro faixas:

| Desempenho | Classificação visual |
|---|---|
| 0% a 49,99% | 🔴 Vermelho |
| 50% a 69,99% | 🟠 Laranja |
| 70% a 84,99% | 🟡 Amarelo |
| 85% a 100% | 🟢 Verde |

### 5. Planos de Ação
- Geração de planos de ação vinculados aos critérios que necessitam de melhoria.
- Definição de responsáveis.
- Registro de prazos.
- Classificação por prioridade e status.
- Acompanhamento de ações pendentes, em andamento e concluídas.
- Organização dos planos em painéis expansíveis e recolhíveis.

### 6. Gestão de Usuários e Permissões
- Cadastro e gerenciamento de usuários.
- Perfis de administrador e auditor.
- Associação de auditores aos setores.
- Controle de permissões de acesso.
- Gerenciamento de credenciais.
- Visualização dos setores atribuídos a cada auditor.

### 7. Histórico de Auditorias
- Consulta das auditorias realizadas.
- Identificação por códigos sequenciais no padrão `AUD-AAAA-0001`.
- Visualização dos resultados e percentuais.
- Consulta das evidências fotográficas.
- Acompanhamento das avaliações finalizadas.

### 8. Central de Relatórios e Exportações

O sistema disponibiliza quatro modelos de relatórios:

| Relatório | Descrição |
|---|---|
| **Relatório de Auditoria** | Apresenta os resultados detalhados de uma auditoria individual. |
| **Relatório por Setor** | Reúne o histórico e a evolução do desempenho de um setor. |
| **Relatório Gerencial** | Apresenta indicadores consolidados e uma visão geral da empresa. |
| **Relatório Periódico** | Consolida resultados de auditorias em períodos selecionados. |

Recursos disponíveis:
- Seleção de modelos e filtros.
- Pré-visualização dos resultados.
- Exportação de documentos em PDF.
- Envio de relatórios por e-mail.
- Controle de acesso conforme o perfil do usuário.

### 9. Notificações
- Central de notificações do sistema.
- Avisos relacionados aos planos de ação.
- Acompanhamento de pendências.
- Suporte à comunicação de lembretes por e-mail.

### 10. Personalização e Experiência do Usuário
- Tema claro e tema escuro.
- Interface responsiva.
- Padronização visual dos componentes.
- Navegação intuitiva.
- Guia de primeiros passos.
- Área informativa sobre a metodologia 5S e funcionalidades do sistema.

---

## 🛠️ Tecnologias Utilizadas

O projeto adota uma arquitetura Full-Stack desacoplada, separando a interface do usuário, a lógica de negócio e o armazenamento de dados.

### Front-end

| Tecnologia | Aplicação |
|---|---|
| HTML5 | Estruturação das páginas. |
| CSS3 | Estilização e responsividade. |
| JavaScript ES6+ | Lógica e interatividade. |
| Chart.js | Visualização de indicadores e gráficos. |
| Lucide Icons | Ícones da interface. |

### Back-end

| Tecnologia | Aplicação |
|---|---|
| Node.js | Ambiente de execução. |
| Express.js | Construção da API REST. |
| MySQL2 | Comunicação com o banco de dados. |
| JWT | Autenticação e autorização. |
| Bcryptjs | Proteção de senhas. |
| Nodemailer | Envio de e-mails e relatórios. |
| Multer | Processamento de uploads de arquivos. |
| Cloudinary | Armazenamento de evidências fotográficas. |
| CORS | Controle de requisições entre origens. |
| Dotenv | Gerenciamento de variáveis de ambiente. |

### Banco de Dados e Infraestrutura

- **MySQL:** armazenamento relacional dos dados.
- **Railway:** hospedagem do banco de dados e backend.
- **Cloudinary:** armazenamento e disponibilização de imagens.
- **Vercel:** hospedagem da interface web.

---

## 🏛️ Arquitetura do Sistema

O projeto utiliza o padrão MVC (Model-View-Controller) no backend, promovendo a separação de responsabilidades e facilitando a manutenção e evolução do código.

```text
SENSUSGESTAO/
│
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── database/
│   │   └── migrations/
│   ├── middlewares/
│   ├── models/
│   ├── routes/
│   ├── uploads/
│   ├── utils/
│   ├── .env.example
│   ├── package.json
│   └── server.js
│
├── frontend/
│   ├── assets/
│   ├── css/
│   ├── js/
│   ├── pages/
│   └── index.html
│
├── vercel.json
└── README.md
```

*Estrutura ilustrativa das principais pastas do projeto.*

---

## ⚙️ Como Executar o Projeto Localmente

### Pré-requisitos

Antes de executar o projeto, instale:

- [Node.js](https://nodejs.org/)
- [Git](https://git-scm.com/)
- [MySQL](https://www.mysql.com/) ou uma instância MySQL hospedada.
- Conta no [Cloudinary](https://cloudinary.com/) para armazenamento de imagens.

### 1. Clonar o repositório

```bash
git clone https://github.com/weescabral/TCC_v1.git

cd TCC_v1
```

### 2. Configurar o backend

```bash
cd backend
npm install
```

### 3. Configurar as variáveis de ambiente

Crie um arquivo `.env` dentro da pasta `backend`, utilizando o `.env.example` como referência.

Exemplo:

```env
# SERVIDOR
PORT=3000

# BANCO DE DADOS
DB_HOST=localhost
DB_USER=seu_usuario
DB_PASSWORD=sua_senha
DB_DATABASE=sensus_db
DB_PORT=3306

# AUTENTICAÇÃO
JWT_SECRET=seu_segredo_seguro
JWT_EXPIRES_IN=8h

# FRONTEND
FRONTEND_URL=http://localhost:5500

# CLOUDINARY
CLOUDINARY_CLOUD_NAME=seu_cloud_name
CLOUDINARY_API_KEY=sua_api_key
CLOUDINARY_API_SECRET=seu_api_secret

# E-MAIL
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=seu_email
SMTP_PASS=sua_senha_de_aplicativo
SMTP_FROM=Sensus 5S <seu_email>
```

**Importante:** substitua os valores pelos dados reais do seu ambiente. Nunca compartilhe o arquivo `.env` ou publique credenciais no GitHub.

### 4. Executar o backend

Para desenvolvimento:

```bash
npm run dev
```

Para execução normal:

```bash
npm start
```

### 5. Executar o frontend

Abra o projeto utilizando uma extensão como Live Server no Visual Studio Code ou configure um servidor HTTP local para servir a pasta `frontend`.

A interface deverá estar configurada para consumir a URL da API correspondente ao ambiente utilizado.

---

## 📊 Checklist 5S

A versão atual utiliza um checklist composto por:

- 5 sensos avaliados.
- 10 critérios por senso.
- 50 critérios no total.
- Escala de avaliação de 1 a 5.
- Pesos diferenciados para os critérios.

O sistema utiliza migrations para organizar a evolução da estrutura do banco de dados e manter a consistência das informações.

---

## 🔐 Segurança

O Sensus 5S adota mecanismos de proteção para os dados e operações do sistema:

- Autenticação por JWT.
- Senhas protegidas por hash.
- Controle de permissões por perfil.
- Variáveis sensíveis armazenadas em arquivos de ambiente.
- Separação entre credenciais de desenvolvimento e produção.
- Controle de acesso aos recursos conforme a responsabilidade do usuário.

---

## 🎓 Contexto Acadêmico

O **Sensus 5S** é um projeto de desenvolvimento tecnológico e acadêmico, concebido para integrar conhecimentos de desenvolvimento de sistemas, gestão organizacional e melhoria contínua.

A proposta busca demonstrar como a tecnologia pode contribuir para a modernização dos processos de auditoria e gestão da qualidade, oferecendo ferramentas digitais para acompanhamento de resultados e apoio à tomada de decisões.

---

## 🔮 Evolução do Projeto

O Sensus 5S encontra-se em desenvolvimento contínuo, com possibilidade de expansão de suas funcionalidades, incluindo:

- Aprimoramento dos indicadores gerenciais.
- Automação de notificações.
- Expansão dos recursos de análise de desempenho.
- Novas ferramentas de acompanhamento organizacional.
- Evolução dos relatórios e recursos de exportação.

---

## 👨‍💻 Desenvolvimento

**Sensus 5S — Sistema Inteligente de Gestão Comercial com Indicadores 5S.**

Projeto desenvolvido com foco na integração entre tecnologia, gestão e melhoria contínua.

**Tecnologia a serviço da organização e da excelência operacional.**

---

<p align="center">
  © 2026 Sensus 5S. Todos os direitos reservados.
</p>