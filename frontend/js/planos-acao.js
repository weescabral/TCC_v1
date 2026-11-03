const API_URL = 'http://localhost:3000/api';

function getToken() {
  return localStorage.getItem('sensus_token') || localStorage.getItem('token') || localStorage.getItem('authToken');
}

async function requisicao(endpoint, options = {}) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.erro || data.mensagem || 'Não foi possível concluir a operação.');
  return data;
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function labelStatus(status) {
  return {
    pendente: 'Pendente',
    em_andamento: 'Em andamento',
    concluido: 'Concluído',
    cancelado: 'Cancelado'
  }[status] || status;
}

function formatarData(data) {
  if (!data) return '-';
  return new Date(data).toLocaleDateString('pt-BR');
}

async function carregarPlanos() {
  const filtro = document.getElementById('filtroStatus').value;
  const endpoint = filtro ? `/planos-acao?status=${encodeURIComponent(filtro)}` : '/planos-acao';
  const planos = await requisicao(endpoint);
  const lista = document.getElementById('listaPlanos');

  if (!planos.length) {
    lista.innerHTML = `<div class="card"><h3>Nenhum plano encontrado</h3><p style="color:#64748b;margin-top:8px;">Não existem ações para o filtro selecionado.</p></div>`;
    return;
  }

  lista.innerHTML = planos.map((plano) => `
    <article class="card">
      <div style="display:flex;justify-content:space-between;gap:16px;align-items:flex-start;flex-wrap:wrap;">
        <div>
          <span class="badge">${escapeHtml(plano.prioridade || 'media')}</span>
          <h3 style="margin-top:8px;">${escapeHtml(plano.setor_nome || 'Setor')}</h3>
          <p style="color:#64748b;margin-top:6px;">Auditoria ${escapeHtml(plano.auditoria_codigo || '-')} • ${formatarData(plano.data_auditoria)}</p>
          <p style="margin-top:12px;"><strong>Critério:</strong> ${escapeHtml(plano.criterio_titulo || 'Não informado')}</p>
        </div>
        <span class="badge">${escapeHtml(labelStatus(plano.status))}</span>
      </div>

      <label style="display:block;margin-top:16px;"><strong>Ação / correção</strong></label>
      <textarea class="form-control plano-descricao" data-id="${plano.id}" rows="4">${escapeHtml(plano.descricao || '')}</textarea>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px;">
        <div>
          <label><strong>Prioridade</strong></label>
          <select class="form-control plano-prioridade" data-id="${plano.id}">
            <option value="baixa" ${plano.prioridade === 'baixa' ? 'selected' : ''}>Baixa</option>
            <option value="media" ${plano.prioridade === 'media' ? 'selected' : ''}>Média</option>
            <option value="alta" ${plano.prioridade === 'alta' ? 'selected' : ''}>Alta</option>
          </select>
        </div>
        <div>
          <label><strong>Status</strong></label>
          <select class="form-control plano-status" data-id="${plano.id}">
            <option value="pendente" ${plano.status === 'pendente' ? 'selected' : ''}>Pendente</option>
            <option value="em_andamento" ${plano.status === 'em_andamento' ? 'selected' : ''}>Em andamento</option>
            <option value="concluido" ${plano.status === 'concluido' ? 'selected' : ''}>Concluído</option>
            <option value="cancelado" ${plano.status === 'cancelado' ? 'selected' : ''}>Cancelado</option>
          </select>
        </div>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:16px;flex-wrap:wrap;">
        <small style="color:#64748b;">Responsável: ${escapeHtml(plano.responsavel_nome || 'Não definido')}</small>
        <button class="btn-primary" type="button" onclick="salvarPlano(${plano.id})">Salvar ação</button>
      </div>
    </article>
  `).join('');
}

async function salvarPlano(id) {
  const descricao = document.querySelector(`.plano-descricao[data-id="${id}"]`).value.trim();
  const prioridade = document.querySelector(`.plano-prioridade[data-id="${id}"]`).value;
  const status = document.querySelector(`.plano-status[data-id="${id}"]`).value;

  if (!descricao) {
    alert('Informe a ação/correção.');
    return;
  }

  try {
    await requisicao(`/planos-acao/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ descricao, prioridade, status })
    });
    alert('Plano de ação atualizado com sucesso.');
    await carregarPlanos();
  } catch (error) {
    alert(error.message);
  }
}

window.salvarPlano = salvarPlano;
document.getElementById('filtroStatus').addEventListener('change', carregarPlanos);
carregarPlanos().catch((error) => {
  document.getElementById('listaPlanos').innerHTML = `<div class="card"><h3>Erro ao carregar planos</h3><p style="color:#64748b;margin-top:8px;">${escapeHtml(error.message)}</p></div>`;
});
