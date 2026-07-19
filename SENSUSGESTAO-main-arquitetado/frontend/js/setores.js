const API_URL = "http://localhost:3000/api";

const sectorForm = document.getElementById("sectorForm");
const listaSetores = document.getElementById("listaSetores");

async function carregarSetores() {
  try {
    const resposta = await fetch(`${API_URL}/setores`);
    const setores = await resposta.json();

    listaSetores.innerHTML = "";

    if (!setores.length) {
      listaSetores.innerHTML = `
        <div class="card">
          <h3>Nenhum setor cadastrado</h3>
          <p style="color:#64748b; margin-top:8px;">
            Cadastre o primeiro ambiente para iniciar as auditorias 5S.
          </p>
        </div>
      `;
      return;
    }

    setores.forEach(setor => {
      const score = setor.score || "0%";
      const scoreNumber = Number(String(score).replace("%", ""));

      let scoreClass = "danger";

      if (scoreNumber >= 80) {
        scoreClass = "success";
      } else if (scoreNumber >= 60) {
        scoreClass = "";
      }

      const card = document.createElement("div");
      card.className = "card sector-card";

      card.innerHTML = `
        <div>
          <h3>
            <i class="icon-building-2"></i>
            ${setor.name}
          </h3>

          <p>${setor.description}</p>
        </div>

        <div class="sector-footer">
          <span>
            Último Score:
            <strong class="${scoreClass}">${score}</strong>
          </span>

          <div style="display:flex; gap:8px;">
            <a href="./checklist.html" class="btn-outline">
              Auditar
            </a>

            <button class="btn-outline" onclick="deletarSetor(${setor.id})">
              Excluir
            </button>
          </div>
        </div>
      `;

      listaSetores.appendChild(card);
    });

  } catch (erro) {
    console.error("Erro ao carregar setores:", erro);

    listaSetores.innerHTML = `
      <div class="card">
        <h3>Erro ao carregar setores</h3>
        <p style="color:#64748b; margin-top:8px;">
          Verifique se o backend está rodando em http://localhost:3000
        </p>
      </div>
    `;
  }
}

sectorForm.addEventListener("submit", async function(event) {
  event.preventDefault();

  const name = document.getElementById("sectorName").value.trim();
  const description = document.getElementById("sectorDesc").value.trim();

  if (!name || !description) {
    alert("Preencha todos os campos.");
    return;
  }

  try {
    const resposta = await fetch(`${API_URL}/setores`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name, description })
    });

    if (!resposta.ok) {
      alert("Erro ao cadastrar setor.");
      return;
    }

    alert("Setor cadastrado com sucesso!");

    sectorForm.reset();
    carregarSetores();

  } catch (erro) {
    console.error("Erro ao cadastrar setor:", erro);
    alert("Erro ao conectar com o servidor.");
  }
});

async function deletarSetor(id) {
  const confirmar = confirm("Deseja realmente excluir este setor?");

  if (!confirmar) return;

  try {
    const resposta = await fetch(`${API_URL}/setores/${id}`, {
      method: "DELETE"
    });

    if (!resposta.ok) {
      alert("Erro ao excluir setor.");
      return;
    }

    alert("Setor removido com sucesso!");
    carregarSetores();

  } catch (erro) {
    console.error("Erro ao excluir setor:", erro);
    alert("Erro ao conectar com o servidor.");
  }
}

carregarSetores();