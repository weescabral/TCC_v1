const API_URL = window.SENSUS_API_URL || 'http://localhost:3000/api';
const token = () => localStorage.getItem('sensus_token') || localStorage.getItem('token') || localStorage.getItem('authToken');
async function requisicao(endpoint, options = {}) {
  const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}`, ...(options.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.erro || data.mensagem || 'Não foi possível concluir a operação.');
  return data;
}
const esc = (v = '') => String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
const statusLabel = s => ({ pendente:'Pendente', em_andamento:'Em andamento', concluido:'Concluído', cancelado:'Cancelado' }[s] || s);
const dateLabel = d => d ? new Date(`${String(d).slice(0,10)}T12:00:00`).toLocaleDateString('pt-BR') : 'Não definido';
const todayISO = () => new Date().toISOString().slice(0,10);

async function carregarResumo() {
  const r = await requisicao('/planos-acao/resumo');
  document.getElementById('kpiTotal').textContent = r.total;
  document.getElementById('kpiPendentes').textContent = r.pendentes;
  document.getElementById('kpiAndamento').textContent = r.em_andamento;
  document.getElementById('kpiConcluidos').textContent = r.concluidos;
  document.getElementById('kpiAtrasados').textContent = r.atrasados;
}
async function carregarPlanos() {
  const params = new URLSearchParams();
  const status = document.getElementById('filtroStatus').value;
  const prioridade = document.getElementById('filtroPrioridade').value;
  const prazo = document.getElementById('filtroPrazo').value;
  if (status) params.set('status', status); if (prioridade) params.set('prioridade', prioridade); if (prazo) params.set('prazo', prazo);
  const planos = await requisicao(`/planos-acao?${params.toString()}`);
  const lista = document.getElementById('listaPlanos');
  if (!planos.length) { lista.innerHTML = '<div class="card management-empty"><i class="icon-clipboard-check"></i><h3>Nenhuma ação encontrada</h3><p>Quando uma auditoria gerar um apontamento crítico, ele aparecerá aqui para acompanhamento.</p></div>'; return; }
  lista.innerHTML = planos.map(p => {
    const atrasado = Number(p.atrasado) === 1;
    return `<article class="card management-plan ${atrasado ? 'is-overdue' : ''}" data-plan-id="${p.id}">
      <div class="management-plan-head"><div><div class="management-tags"><span class="management-tag priority-${esc(p.prioridade)}">Prioridade ${esc(p.prioridade || 'média')}</span><span class="management-tag status-${esc(p.status)}">${statusLabel(p.status)}</span>${atrasado ? '<span class="management-tag overdue-tag">Prazo vencido</span>' : ''}</div><h3>${esc(p.setor_nome || 'Setor')}</h3><p class="management-meta">Auditoria ${esc(p.auditoria_codigo || '—')} · ${dateLabel(p.data_auditoria)}</p></div><span class="management-plan-number">#${p.id}</span></div>
      <div class="management-context"><strong>Critério identificado</strong><p>${esc(p.criterio_titulo || 'Critério não informado')}</p></div>
      <div class="management-edit-grid"><label class="management-field management-field-wide">Ação corretiva / o que será feito<textarea class="form-control plano-descricao" rows="3" data-id="${p.id}" maxlength="2000">${esc(p.descricao || '')}</textarea></label>
      <label class="management-field">Causa raiz<textarea class="form-control plano-causa" rows="2" data-id="${p.id}" maxlength="2000" placeholder="Por que o problema aconteceu?">${esc(p.causa_raiz || '')}</textarea></label>
      <label class="management-field">Resultado esperado<textarea class="form-control plano-resultado" rows="2" data-id="${p.id}" maxlength="2000" placeholder="Qual melhoria deve ser alcançada?">${esc(p.resultado_esperado || '')}</textarea></label>
      <label class="management-field">Prazo de conclusão<input class="form-control plano-prazo" type="date" data-id="${p.id}" min="${todayISO()}" value="${p.prazo_conclusao ? String(p.prazo_conclusao).slice(0,10) : ''}"></label>
      <label class="management-field">Prioridade<select class="form-control plano-prioridade" data-id="${p.id}"><option value="baixa" ${p.prioridade==='baixa'?'selected':''}>Baixa</option><option value="media" ${p.prioridade==='media'?'selected':''}>Média</option><option value="alta" ${p.prioridade==='alta'?'selected':''}>Alta</option></select></label>
      <label class="management-field">Status<select class="form-control plano-status" data-id="${p.id}"><option value="pendente" ${p.status==='pendente'?'selected':''}>Pendente</option><option value="em_andamento" ${p.status==='em_andamento'?'selected':''}>Em andamento</option><option value="concluido" ${p.status==='concluido'?'selected':''}>Concluído</option><option value="cancelado" ${p.status==='cancelado'?'selected':''}>Cancelado</option></select></label></div>
      <div class="management-plan-footer"><span><i class="icon-user-round"></i> Responsável atual: ${esc(p.responsavel_nome || 'Não definido')}</span><span><i class="icon-calendar-days"></i> Prazo: ${dateLabel(p.prazo_conclusao)}</span><button class="btn-primary" type="button" onclick="salvarPlano(${p.id}, this)"><i class="icon-save"></i> Salvar alterações</button></div>
    </article>`;
  }).join('');
}
async function salvarPlano(id, button) {
  const card = document.querySelector(`[data-plan-id="${id}"]`);
  const payload = { descricao: card.querySelector('.plano-descricao').value.trim(), causa_raiz: card.querySelector('.plano-causa').value.trim(), resultado_esperado: card.querySelector('.plano-resultado').value.trim(), prazo_conclusao: card.querySelector('.plano-prazo').value || null, prioridade: card.querySelector('.plano-prioridade').value, status: card.querySelector('.plano-status').value };
  if (!payload.descricao) { alert('Descreva a ação corretiva antes de salvar.'); return; }
  button.disabled = true; button.textContent = 'Salvando...';
  try { await requisicao(`/planos-acao/${id}`, { method:'PATCH', body:JSON.stringify(payload) }); await Promise.all([carregarPlanos(), carregarResumo()]); }
  catch (e) { alert(e.message); button.disabled = false; button.textContent = 'Salvar alterações'; }
}
window.salvarPlano = salvarPlano;
['filtroStatus','filtroPrioridade','filtroPrazo'].forEach(id => document.getElementById(id).addEventListener('change', () => carregarPlanos().catch(mostrarErro)));
function mostrarErro(e) { document.getElementById('listaPlanos').innerHTML = `<div class="card"><h3>Não foi possível carregar a gestão</h3><p>${esc(e.message)}</p></div>`; }
Promise.all([carregarResumo(), carregarPlanos()]).catch(mostrarErro);
