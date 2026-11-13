const API_URL = "http://localhost:3000/api";

const sectorForm = document.getElementById("sectorForm");
const listaSetores = document.getElementById("listaSetores");
const auditorSelect = document.getElementById("sectorAuditor");
const periodicidadeSelect = document.getElementById("sectorPeriodicity");
const sectorIdInput = document.getElementById("sectorId");
const tituloFormulario = document.getElementById("tituloFormularioSetor");
const botaoSalvar = document.getElementById("botaoSalvarSetor");
const botaoCancelar = document.getElementById("botaoCancelarEdicao");
let setoresAtivos = [];
let setoresInativos = [];
let abaSetoresAtual = "ativos";

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
  if (JSON.parse(localStorage.getItem("sensus_usuario") || "{}").perfil !== "administrador") return;
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
    const isAdmin = JSON.parse(localStorage.getItem("sensus_usuario") || "{}").perfil === "administrador";
    const setores = await requisicao("/setores");
    setoresAtivos = Array.isArray(setores) ? setores : [];
    if (isAdmin) {
      const inativos = await requisicao("/setores/inativos");
      setoresInativos = Array.isArray(inativos) ? inativos : [];
    }
    document.getElementById("totalSetoresAtivos")?.replaceChildren(document.createTextNode(String(setoresAtivos.length)));
    document.getElementById("totalSetoresInativos")?.replaceChildren(document.createTextNode(String(setoresInativos.length)));
    renderizarSetores(); 
  } catch (erro) {
    console.error("Erro ao carregar setores:", erro);
    listaSetores.innerHTML = `<div class="card"><h3>Erro ao carregar setores</h3><p style="color:#64748b;margin-top:8px;">${escapeHtml(erro.message)}</p></div>`;
  }
}

function renderizarSetores() {
    const isAdmin = JSON.parse(localStorage.getItem("sensus_usuario") || "{}").perfil === "administrador";
    const setores = isAdmin && abaSetoresAtual === "inativos" ? setoresInativos : setoresAtivos;
    listaSetores.innerHTML = "";

    if (!setores.length) {
      listaSetores.innerHTML = `
        <div class="card">
          <h3>${abaSetoresAtual === "inativos" ? "Nenhum setor desativado" : "Nenhum setor cadastrado"}</h3>
          <p style="color:#64748b; margin-top:8px;">${abaSetoresAtual === "inativos" ? "Os setores desativados aparecerão aqui e poderão ser reativados." : "Cadastre o primeiro ambiente para iniciar as auditorias 5S."}</p>
        </div>
      `;
      return;
    }

    setores.forEach((setor, indice) => {
      const possuiScoreFinalizado = setor.score_atual !== null && setor.score_atual !== undefined;
      const scoreNumber = possuiScoreFinalizado ? Number(setor.score_atual) : null;
      // Faixas de desempenho: <50 vermelho, 50–69 laranja,
      // 70–84 amarelo e 85–100 verde.
      const scoreClass = !possuiScoreFinalizado ? "" :
        scoreNumber < 50 ? "performance-critical" :
        scoreNumber < 70 ? "performance-low" :
        scoreNumber < 85 ? "performance-medium" : "performance-good";
      const auditorDefinido = Boolean(setor.auditor_id);
      const periodicidade = setor.periodicidade_auditoria || "mensal";
      const isAdmin = JSON.parse(localStorage.getItem("sensus_usuario") || "{}").perfil === "administrador";
      // Código visual sequencial: 001, 002, 003...
      // O ID real do banco permanece inalterado.
      const codigoExibicao = String(indice + 1).padStart(3, "0");

      if (abaSetoresAtual === "inativos" && isAdmin) {
        const cardInativo = document.createElement("div");
        cardInativo.className = "card sector-card sector-card-inactive";
        cardInativo.innerHTML = `
          <div>
            <div style="display:flex;justify-content:space-between;gap:16px;align-items:flex-start;">
              <div><h3><i class="icon-building-2"></i> ${escapeHtml(setor.nome)}</h3>
              <p>${escapeHtml(setor.descricao || "Sem descrição.")}</p></div>
              <span class="badge">${escapeHtml(setor.codigo || codigoExibicao)}</span>
            </div>
            <p style="margin-top:12px;color:#64748b;">
              <strong>Auditor:</strong> ${escapeHtml(setor.auditor_nome || "Não definido")}
              ${setor.auditor_ativo === 0 || setor.auditor_ativo === false ? '<br><strong style="color:#d97706;">Auditor atualmente inativo</strong>' : ''}
              <br><strong>Periodicidade:</strong> ${escapeHtml(periodicidade)}
              <br><strong>Desativado em:</strong> ${setor.inativado_em ? new Date(setor.inativado_em).toLocaleDateString("pt-BR") : "Data não informada"}
            </p>
            ${setor.motivo_inativacao ? `<p class="sector-inactive-reason"><strong>Motivo:</strong> ${escapeHtml(setor.motivo_inativacao)}</p>` : ""}
          </div>
          <div class="sector-footer">
            <span class="sector-no-score">Setor desativado</span>
            <div class="sector-inactive-actions">
              <button class="btn-primary" type="button" data-reactivate-sector="${setor.id}">Reativar setor</button>
              <button class="btn-danger-outline" type="button" data-delete-sector="${setor.id}">Excluir definitivamente</button>
            </div>
          </div>`;
        listaSetores.appendChild(cardInativo);
        return;
      }

      const card = document.createElement("div");
      card.className = "card sector-card";
      card.innerHTML = `
        <div>
          <div style="display:flex; justify-content:space-between; gap:16px; align-items:flex-start;">
            <div>
              <h3><i class="icon-building-2"></i> ${escapeHtml(setor.nome)}</h3>
              <p>${escapeHtml(setor.descricao || "Sem descrição.")}</p>
            </div>
            <span class="badge">${escapeHtml(codigoExibicao)}</span>
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
          <span>${possuiScoreFinalizado
            ? `Último Score: <strong class="${scoreClass}">${scoreNumber.toFixed(2)}%</strong>`
            : '<span class="sector-no-score">Nunca auditado</span>'}</span>
          <div style="display:flex; gap:8px; flex-wrap:wrap; justify-content:flex-end;">
            ${isAdmin ? `<button class="btn-primary" type="button" onclick='iniciarEdicao(${JSON.stringify(setor)})'>Editar</button>` : ''}
            ${auditorDefinido && (isAdmin || Number(setor.auditor_id) === Number(JSON.parse(localStorage.getItem("sensus_usuario") || "{}").id))
              ? `<a href="./checklist.html?setor=${encodeURIComponent(setor.id)}" class="btn-primary">Auditar</a>`
              : `<button type="button" class="btn-primary disabled" disabled title="Este setor não está atribuído a você">Auditar</button>`}
            ${isAdmin ? `<button class="btn-primary" type="button" onclick='desativarSetor(${setor.id}, ${JSON.stringify(setor.nome)})'>Desativar</button>` : ''}
          </div>
        </div>
      `;

      listaSetores.appendChild(card);
    });
}

function selecionarAbaSetores(aba) {
  abaSetoresAtual = aba;
  const ativos = aba === "ativos";
  document.getElementById("tabSetoresAtivos")?.classList.toggle("is-active", ativos);
  document.getElementById("tabSetoresInativos")?.classList.toggle("is-active", !ativos);
  document.getElementById("tabSetoresAtivos")?.setAttribute("aria-selected", String(ativos));
  document.getElementById("tabSetoresInativos")?.setAttribute("aria-selected", String(!ativos));
  renderizarSetores();
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
  const motivo = await window.sensusPrompt(
    `Informe o motivo da desativação do setor "${nome}".`,
    { title: 'Desativar setor', placeholder: 'Motivo da desativação', confirmText: 'Continuar' }
  );
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

document.getElementById("tabSetoresAtivos")?.addEventListener("click", () => selecionarAbaSetores("ativos"));
document.getElementById("tabSetoresInativos")?.addEventListener("click", () => selecionarAbaSetores("inativos"));
listaSetores?.addEventListener("click", async (event) => {
  const deleteButton = event.target.closest("[data-delete-sector]");
  if (deleteButton) {
    const id = deleteButton.dataset.deleteSector;
    const setor = setoresInativos.find(item => String(item.id) === String(id));
    if (!setor) return;

    const mensagem = `Você está solicitando a exclusão definitiva do setor "${setor.nome}". Essa ação só será permitida se não houver auditorias vinculadas. Se houver histórico, o sistema bloqueará a exclusão. Deseja continuar?`;
    const confirmarExclusao = window.sensusConfirm
      ? await window.sensusConfirm(mensagem, {
          title: "Excluir setor definitivamente",
          type: "danger",
          confirmText: "Excluir definitivamente"
        })
      : window.confirm(mensagem);
    if (!confirmarExclusao) return;

    try {
      await requisicao(`/setores/${id}/definitivo`, { method: "DELETE" });
      await carregarSetores();
      if (window.sensusNotificar) window.sensusNotificar("Setor excluído definitivamente.", "success");
      else alert("Setor excluído definitivamente.");
    } catch (erro) {
      if (window.sensusNotificar) window.sensusNotificar(erro.message, "error");
      else alert(erro.message);
    }
    return;
  }

  const button = event.target.closest("[data-reactivate-sector]");
  if (!button) return;
  const id = button.dataset.reactivateSector;
  const setor = setoresInativos.find(item => String(item.id) === String(id));
  if (!setor) return;
  const confirmar = window.sensusConfirm
    ? await window.sensusConfirm(
        `Deseja reativar o setor "${setor.nome}"? O histórico de auditorias será preservado. Confira se o auditor responsável continua ativo.`,
        { title: "Reativar setor", type: "success", confirmText: "Reativar setor" }
      )
    : window.confirm(`Deseja reativar o setor "${setor.nome}"?`);
  if (!confirmar) return;
  try {
    await requisicao(`/setores/${id}/reativar`, { method: "PATCH" });
    await carregarSetores();
    selecionarAbaSetores("ativos");
    if (window.sensusNotificar) window.sensusNotificar("Setor reativado com sucesso. O histórico foi preservado.", "success");
    else alert("Setor reativado com sucesso. O histórico foi preservado.");
  } catch (erro) {
    if (window.sensusNotificar) window.sensusNotificar(erro.message, "error");
    else alert(erro.message);
  }
});

botaoCancelar?.addEventListener("click", cancelarEdicao);

carregarAuditores();
carregarSetores();
