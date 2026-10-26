const API_URL = "http://localhost:3000/api";

const sectorForm = document.getElementById("sectorForm");
const listaSetores = document.getElementById("listaSetores");
const auditorSelect = document.getElementById("sectorAuditor");
const periodicidadeSelect = document.getElementById("sectorPeriodicity");
const sectorIdInput = document.getElementById("sectorId");
const tituloFormulario = document.getElementById("tituloFormularioSetor");
const botaoSalvar = document.getElementById("botaoSalvarSetor");
const botaoCancelar = document.getElementById("botaoCancelarEdicao");

function getToken() {
  return localStorage.getItem("sensus_token")
    || localStorage.getItem("token")
    || localStorage.getItem("authToken");
}

async function requisicao(endpoint, options = {}) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (response.status === 401) {
    localStorage.removeItem("sensus_token");
    localStorage.removeItem("token");
    localStorage.removeItem("authToken");
    localStorage.removeItem("sensus_usuario");
    window.location.href = "../index.html";
    throw new Error("Sua sessão expirou.");
  }

  if (!response.ok) {
    throw new Error(data.erro || data.mensagem || "Erro na comunicação com a API.");
  }

  return data;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function carregarAuditores() {
  try {
    const dados = await requisicao("/setores/auditores");
    const auditores = Array.isArray(dados) ? dados : dados.auditores || [];

    auditorSelect.innerHTML = '<option value="">Selecione o auditor responsável</option>';

    auditores.forEach((auditor) => {
      const option = document.createElement("option");
      option.value = auditor.id;
      option.textContent = `${auditor.nome} — ${auditor.perfil}`;
      auditorSelect.appendChild(option);
    });

    if (!auditores.length) {
      auditorSelect.innerHTML = '<option value="">Nenhum auditor ativo cadastrado</option>';
    }
  } catch (erro) {
    auditorSelect.innerHTML = '<option value="">Erro ao carregar auditores</option>';
    console.error(erro);
  }
}

function iniciarEdicao(setor) {
  sectorIdInput.value = setor.id;
  document.getElementById("sectorName").value = setor.nome || "";
  document.getElementById("sectorDesc").value = setor.descricao || "";
  auditorSelect.value = setor.auditor_id ? String(setor.auditor_id) : "";
  periodicidadeSelect.value = setor.periodicidade_auditoria || "mensal";

  tituloFormulario.textContent = `Editar Setor — ${setor.nome}`;
  botaoSalvar.textContent = "Salvar alterações";
  botaoCancelar.style.display = "inline-block";

  document.getElementById("cadastroSetor").scrollIntoView({ behavior: "smooth", block: "start" });
}

function cancelarEdicao() {
  sectorIdInput.value = "";
  sectorForm.reset();
  periodicidadeSelect.value = "mensal";
  tituloFormulario.textContent = "Cadastrar Setor";
  botaoSalvar.textContent = "Salvar Setor";
  botaoCancelar.style.display = "none";
}

async function carregarSetores() {
  try {
    const setores = await requisicao("/setores");
    listaSetores.innerHTML = "";

    if (!setores.length) {
      listaSetores.innerHTML = `
        <div class="card">
          <h3>Nenhum setor cadastrado</h3>
          <p style="color:#64748b; margin-top:8px;">Cadastre o primeiro ambiente para iniciar as auditorias 5S.</p>
        </div>
      `;
      return;
    }

    setores.forEach((setor) => {
      const scoreNumber = Number(setor.score_atual || 0);
      const scoreClass = scoreNumber >= 80 ? "success" : scoreNumber >= 60 ? "" : "danger";
      const auditorDefinido = Boolean(setor.auditor_id);
      const periodicidade = setor.periodicidade_auditoria || "mensal";

      const card = document.createElement("div");
      card.className = "card sector-card";
      card.innerHTML = `
        <div>
          <div style="display:flex; justify-content:space-between; gap:16px; align-items:flex-start;">
            <div>
              <h3><i class="icon-building-2"></i> ${escapeHtml(setor.nome)}</h3>
              <p>${escapeHtml(setor.descricao || "Sem descrição.")}</p>
            </div>
            <span class="badge">${escapeHtml(setor.codigo || "-")}</span>
          </div>

          <p style="margin-top:12px;color:#64748b;">
            <strong>Auditor:</strong> ${escapeHtml(setor.auditor_nome || "Não definido")}<br>
            <strong>Periodicidade:</strong> ${escapeHtml(periodicidade)}
          </p>

          ${!auditorDefinido ? `
            <div class="mensagem-checklist erro" style="margin-top:12px;">
              Este setor ainda não possui auditor responsável. Edite o setor antes de iniciar uma auditoria.
            </div>
          ` : ""}
        </div>

        <div class="sector-footer">
          <span>Último Score: <strong class="${scoreClass}">${scoreNumber.toFixed(2)}%</strong></span>
          <div style="display:flex; gap:8px; flex-wrap:wrap; justify-content:flex-end;">
            <button class="btn-outline" type="button" onclick='iniciarEdicao(${JSON.stringify(setor)})'>Editar</button>
            ${auditorDefinido
              ? `<a href="./checklist.html?setor=${encodeURIComponent(setor.id)}" class="btn-outline">Auditar</a>`
              : `<button type="button" class="btn-outline disabled" disabled title="Defina um auditor responsável antes de auditar">Auditar</button>`}
            <button class="btn-outline" type="button" onclick='desativarSetor(${setor.id}, ${JSON.stringify(setor.nome)})'>Desativar</button>
          </div>
        </div>
      `;

      listaSetores.appendChild(card);
    });
  } catch (erro) {
    console.error("Erro ao carregar setores:", erro);
    listaSetores.innerHTML = `<div class="card"><h3>Erro ao carregar setores</h3><p style="color:#64748b;margin-top:8px;">${escapeHtml(erro.message)}</p></div>`;
  }
}

sectorForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const id = sectorIdInput.value;
  const nome = document.getElementById("sectorName").value.trim();
  const descricao = document.getElementById("sectorDesc").value.trim();
  const auditor_id = Number(auditorSelect.value);
  const periodicidade_auditoria = periodicidadeSelect.value || "mensal";

  if (!nome || !descricao || !auditor_id) {
    alert("Preencha nome, descrição e auditor responsável.");
    return;
  }

  try {
    const endpoint = id ? `/setores/${id}` : "/setores";
    const method = id ? "PUT" : "POST";

    await requisicao(endpoint, {
      method,
      body: JSON.stringify({ nome, descricao, auditor_id, periodicidade_auditoria }),
    });

    alert(id ? "Setor atualizado com sucesso!" : "Setor cadastrado com sucesso!");
    cancelarEdicao();
    await carregarSetores();
  } catch (erro) {
    console.error(erro);
    alert(erro.message);
  }
});

async function desativarSetor(id, nome) {
  const motivo = prompt(`Informe o motivo da desativação do setor "${nome}":`);
  if (motivo === null) return;

  if (!motivo.trim()) {
    alert("O motivo é obrigatório.");
    return;
  }

  try {
    await requisicao(`/setores/${id}`, {
      method: "DELETE",
      body: JSON.stringify({ motivo: motivo.trim() }),
    });

    alert("Setor desativado. O histórico foi preservado no banco.");
    await carregarSetores();
  } catch (erro) {
    console.error(erro);
    alert(erro.message);
  }
}

window.iniciarEdicao = iniciarEdicao;
window.desativarSetor = desativarSetor;

botaoCancelar?.addEventListener("click", cancelarEdicao);

carregarAuditores();
carregarSetores();
