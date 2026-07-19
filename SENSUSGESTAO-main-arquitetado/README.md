# 📊 Sensus 5S — Plataforma de Monitoramento & Avaliação

> **TCC** > Sistema Full-Stack para otimização, auditoria e mapeamento de conformidade baseado na metodologia ágil japonesa 5S.

---

## 📌 Sobre o Projeto

O **Sensus 5S** é uma plataforma desenvolvida para gerenciar ciclos de auditorias em ambientes organizacionais. O sistema permite o mapeamento de setores físicos, a aplicação de checklists dinâmicos para os 5 sensos (*Seiri, Seiton, Seiso, Seiketsu, Shitsuke*) e a visualização analítica do rendimento histórico através de gráficos de tendência suaves.

### 🚀 Principais Funcionalidades
* **Painel Geral (Dashboard):** Gráfico de linha dinâmico que plota a tendência de desempenho e o índice de aderência acumulado das auditorias.
* **Checklist Inteligente:** Avaliação em tempo real com cálculo automatizado de pontuação e classificação de status do ambiente.
* **Gestão de Setores:** Cadastro, listagem e remoção de áreas físicas integrados ao banco de dados relacional.
* **Plano de Ação:** Geração de tarefas corretivas instantâneas baseadas nos alertas de desvios críticos do ambiente.

---

## 🏗️ Arquitetura do Sistema

O projeto adota uma arquitetura limpa com total separação de responsabilidades (Decoupled Full-Stack Architecture):

```text
SENSUSGESTAO/
├── backend/          # API RESTful em Node.js & Banco Relacional SQLite
├── frontend/         # Interface do Usuário (HTML5, CSS3 Vanilla, JavaScript ES6)
└── vercel.json       # Configuração de deploy estático

````

# SensusGestão 📊

O **SensusGestão** é uma plataforma web Full-Stack projetada para digitalizar, monitorar e auditar a aplicação da metodologia 5S (*Seiri, Seiton, Seiso, Seiketsu e Shitsuke*) dentro de ambientes organizacionais. 

O sistema substitui planilhas manuais por uma interface automatizada capaz de centralizar o mapeamento de áreas físicas (setores), coletar avaliações de conformidade de forma ágil e exibir o desempenho histórico através de gráficos dinâmicos.

---

## 🛠️ Tecnologias e Arquitetura

O projeto adota uma **Arquitetura Cliente-Servidor Desacoplada**, onde o Front-end e o Back-end comunicam-se de forma assíncrona por meio de uma API RESTful.

### Front-end (Interface)
- **HTML5 & CSS3:** Estruturação semântica e estilização limpa focada na experiência do usuário (UX).
- **Vanilla JavaScript (ES6+):** Lógica de comportamento do cliente e consumo da API via `fetch` assíncrono (`async/await`).
- **Chart.js:** Renderização de gráficos dinâmicos para visualização de dados históricos.

### Back-end (Servidor e API)
- **Node.js:** Ambiente de execução focado na alta performance de requisições.
- **Express.js:** Framework minimalista para gerenciamento de rotas e middlewares HTTP.
- **CORS:** Gerenciamento seguro de requisições de origens cruzadas entre a interface e a API.

### Banco de Dados
- **SQLite (`sqlite3`):** Banco de dados relacional embarcado localmente. Dispensa servidores complexos, salvando as informações em um arquivo estruturado (`database.db`) e garantindo portabilidade para homologação acadêmica.

---

## 📦 Como Executar o Projeto

### Pré-requisitos
Antes de começar, você vai precisar ter instalado em sua máquina o [Node.js](https://nodejs.org/) e o [Git](https://git-scm.com/).

### 1. Clonar o Repositório
```bash
git clone [https://github.com/Brendhak/sensus-5s.git](https://github.com/Brendhak/sensus-5s.git)
cd sensus-5so de API), Cors.Banco de Dados: SQLite (sqlite3 driver assíncrono).Modelagem Conceitual: dbdiagram.io.
````

### 2. Configurar o Back-endNavegue até a pasta do servidor e instale as dependências:
cd backend
npm install


### 3. Executar o ServidorInicie a API Node.js:
npm start
O script do banco de dados irá verificar a existência do arquivo database.db. Caso não exista, ele criará a estrutura de tabelas e carregará os setores padrão automaticamente.


### 4. Executar o Front-end:
Basta abrir o arquivo frontend/index.html no seu navegador de preferência (ou utilizar a extensão Live Server no VS Code).

### ⚡ Testando a API de Forma Independente:
Caso queira testar as rotas da API isoladamente (usando ferramentas como o Thunder Client ou Postman), os principais endpoints configurados são: 
GET	/api/setores	Lista todos os setores cadastrados no banco
POST	/api/setores	Cadastra um novo setor
DELETE	/api/setores/:id	Remove um setor físico e seu histórico pelo ID
POST	/api/auditorias	Salva uma auditoria 5S e atualiza o Score do setor
GET	/api/auditorias/ultima	Alimenta o topo do Dashboard com a auditoria mais recente


## ou 

Fazendo a utilização da extensão **SQLite Viewer**. Cujo passo a passo para instalar no vscode está abaixo:
1. **Instalar a Extensão:**
   - Acesse o menu de **Extensões** no VS Code (`Ctrl + Shift + X`).
   - Pesquise por **`SQLite Viewer`** (desenvolvido por *qwtel*) e clique em **Instalar**.

2. **Abrir o Arquivo do Banco:**
   - No explorador do VS Code, navegue até a pasta `backend/`.
   - Dê um clique duplo sobre o arquivo **`database.db`**.
   - A extensão abrirá uma interface gráfica amigável dividida por tabelas.

3. **Visualizar os Dados:**
   - No menu esquerdo da extensão, expanda a aba `Tables` e selecione a tabela **`setores`**.
   - Clique na aba **`DATA`** no topo para visualizar as colunas (`id`, `name`, `description`, `score`).

4. **Sincronizar Alterações (Refresh):**
   - Como a extensão não atualiza automaticamente, sempre que cadastrar ou excluir um setor na interface web, clique no botão de **Seta Circular (↻)** no topo da tabela para recarregar os dados físicos salvos.
