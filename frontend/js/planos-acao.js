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
  const progresso = Number(r.progresso || 0);
  document.getElementById('kpiProgressoGeral').textContent = `${progresso.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
  document.getElementById('barraProgressoGeral').style.width = `${Math.max(0, Math.min(100, progresso))}%`;
}

function agruparPorAuditoria(planos) {
  const grupos = new Map();
  planos.forEach(plano => {
    const chave = String(plano.auditoria_id || `sem-auditoria-${plano.id}`);
    if (!grupos.has(chave)) {
      grupos.set(chave, {
        id: chave,
        codigo: plano.auditoria_codigo || 'Auditoria sem código',
        data: plano.data_auditoria,
        setor: plano.setor_nome || 'Setor não identificado',
        resumo: {
          total: Number(plano.auditoria_total_planos ?? 0),
          pendentes: Number(plano.auditoria_planos_pendentes ?? 0),
          em_andamento: Number(plano.auditoria_planos_em_andamento ?? 0),
          concluidos: Number(plano.auditoria_planos_concluidos ?? 0),
          cancelados: Number(plano.auditoria_planos_cancelados ?? 0),
          atrasados: Number(plano.auditoria_planos_atrasados ?? 0)
        },
        itens: []
      });
    }
    grupos.get(chave).itens.push(plano);
  });
  return [...grupos.values()].sort((a, b) => {
    const dataA = a.data ? new Date(`${String(a.data).slice(0,10)}T12:00:00`).getTime() : 0;
    const dataB = b.data ? new Date(`${String(b.data).slice(0,10)}T12:00:00`).getTime() : 0;
    return dataB - dataA || String(b.id).localeCompare(String(a.id), 'pt-BR', { numeric: true });
  });
}

function renderizarPlano(p) {
  const atrasado = Number(p.atrasado) === 1;
  const preenchido = Boolean(String(p.descricao || '').trim() && String(p.causa_raiz || '').trim() && String(p.resultado_esperado || '').trim() && p.prazo_conclusao);
  const recorrencia = Number(p.recorrente) === 1
    ? `<div class="management-recurrence"><i class="icon-repeat-2"></i><span><strong>Critério identificado novamente.</strong> Plano anterior #${Number(p.plano_anterior_id)} — ${esc(statusLabel(p.plano_anterior_status))}${p.plano_anterior_auditoria_codigo ? ` · Auditoria ${esc(p.plano_anterior_auditoria_codigo)}` : ''}${['pendente','em_andamento'].includes(p.plano_anterior_status) ? ' · Ação anterior ainda não resolvida' : ''}</span></div>`
    : '';
  return `<article class="card management-plan ${atrasado ? 'is-overdue' : ''}" data-plan-id="${p.id}">
    <button class="management-plan-toggle" type="button" aria-expanded="true" onclick="alternarPlano(this)"><span class="management-plan-toggle-title"><i class="icon-chevron-down"></i> ${preenchido ? '<span class="plan-complete"><i class="icon-check-circle-2"></i> Preenchido</span>' : '<span class="plan-incomplete">Em preenchimento</span>'}</span><span class="management-plan-number">#${p.id}</span></button><div class="management-plan-content"><div class="management-plan-head"><div><div class="management-tags"><span class="management-tag priority-${esc(p.prioridade)}">Prioridade ${esc(p.prioridade || 'média')}</span><span class="management-tag status-${esc(p.status)}">${statusLabel(p.status)}</span>${atrasado ? '<span class="management-tag overdue-tag">Prazo vencido</span>' : ''}${Number(p.recorrente) === 1 ? '<span class="management-tag recurrence-tag">Recorrente</span>' : ''}</div><h3>${esc(p.setor_nome || 'Setor')}</h3><p class="management-meta">Auditoria ${esc(p.auditoria_codigo || '—')} · ${dateLabel(p.data_auditoria)}</p></div></div>
    ${recorrencia}
    <div class="management-context"><strong>Critério identificado</strong><p>${esc(p.criterio_titulo || 'Critério não informado')}</p></div>
    <div class="management-edit-grid"><label class="management-field management-field-wide">Ação corretiva / o que será feito<textarea class="form-control plano-descricao" rows="3" data-id="${p.id}" maxlength="2000">${esc(p.descricao || '')}</textarea></label>
    <label class="management-field">Causa raiz<textarea class="form-control plano-causa" rows="2" data-id="${p.id}" maxlength="2000" placeholder="Por que o problema aconteceu?">${esc(p.causa_raiz || '')}</textarea></label>
    <label class="management-field">Resultado esperado<textarea class="form-control plano-resultado" rows="2" data-id="${p.id}" maxlength="2000" placeholder="Qual melhoria deve ser alcançada?">${esc(p.resultado_esperado || '')}</textarea></label>
    <label class="management-field">Prazo de conclusão<input class="form-control plano-prazo" type="date" data-id="${p.id}" min="${todayISO()}" value="${p.prazo_conclusao ? String(p.prazo_conclusao).slice(0,10) : ''}"></label>
    <label class="management-field">Prioridade<select class="form-control plano-prioridade" data-id="${p.id}"><option value="baixa" ${p.prioridade==='baixa'?'selected':''}>Baixa</option><option value="media" ${p.prioridade==='media'?'selected':''}>Média</option><option value="alta" ${p.prioridade==='alta'?'selected':''}>Alta</option></select></label>
    <label class="management-field">Status<select class="form-control plano-status" data-id="${p.id}"><option value="pendente" ${p.status==='pendente'?'selected':''}>Pendente</option><option value="em_andamento" ${p.status==='em_andamento'?'selected':''}>Em andamento</option><option value="concluido" ${p.status==='concluido'?'selected':''}>Concluído</option><option value="cancelado" ${p.status==='cancelado'?'selected':''}>Cancelado</option></select></label></div>
    <div class="management-plan-footer"><span><i class="icon-user-round"></i> Responsável atual: ${esc(p.responsavel_nome || 'Não definido')}</span><span><i class="icon-calendar-days"></i> Prazo: ${dateLabel(p.prazo_conclusao)}</span><button class="btn-primary" type="button" onclick="salvarPlano(${p.id}, this)"><i class="icon-save"></i> Salvar alterações</button></div></div>
  </article>`;
}

function renderizarGrupoAuditoria(grupo, indice) {
  const itens = grupo.itens;
  const totalExibido = itens.length;
  const total = grupo.resumo.total || totalExibido;
  const concluidos = grupo.resumo.concluidos;
  const cancelados = grupo.resumo.cancelados;
  const pendentes = grupo.resumo.pendentes;
  const andamento = grupo.resumo.em_andamento;
  const atrasados = grupo.resumo.atrasados;
  const recorrentes = itens.filter(p => Number(p.recorrente) === 1).length;
  const baseValida = Math.max(0, total - cancelados);
  const progresso = baseValida ? (concluidos / baseValida) * 100 : 0;
  const aberto = indice === 0;
  return `<section class="card management-audit-group ${aberto ? 'is-open' : 'is-collapsed'}" data-audit-group="${esc(grupo.id)}">
    <button class="management-audit-toggle" type="button" aria-expanded="${aberto}" onclick="alternarGrupoAuditoria(this)">
      <span class="management-audit-toggle-main"><span class="management-audit-chevron"><i class="icon-chevron-down"></i></span><span><strong>${esc(grupo.codigo)}</strong><small>${esc(grupo.setor)} · ${dateLabel(grupo.data)}</small></span></span>
      <span class="management-audit-toggle-stats"><strong>${total} ${total === 1 ? 'ação' : 'ações'} no total</strong><small>${progresso.toLocaleString('pt-BR',{maximumFractionDigits:1})}% concluído${totalExibido < total ? ` · ${totalExibido} exibidas pelo filtro` : ''}</small></span>
    </button>
    <div class="management-audit-body">
      <div class="management-audit-progress"><div class="management-audit-progress-track"><span style="width:${Math.max(0,Math.min(100,progresso))}%"></span></div><div class="management-audit-counts"><span class="count-done">${concluidos} concluídas</span><span class="count-progress">${andamento} em andamento</span><span class="count-pending">${pendentes} pendentes</span>${atrasados ? `<span class="count-overdue">${atrasados} atrasadas</span>` : ''}${cancelados ? `<span>${cancelados} canceladas</span>` : ''}${recorrentes ? `<span class="count-recurring">${recorrentes} recorrentes</span>` : ''}</div></div>
      <div class="management-audit-plans">${itens.map(renderizarPlano).join('')}</div>
    </div>
  </section>`;
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
  const grupos = agruparPorAuditoria(planos);
  lista.innerHTML = grupos.map(renderizarGrupoAuditoria).join('');
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
window.alternarPlano = function(botao) { const card = botao.closest('.management-plan'); const aberto = botao.getAttribute('aria-expanded') === 'true'; botao.setAttribute('aria-expanded', String(!aberto)); card.classList.toggle('is-collapsed', aberto); };
window.alternarGrupoAuditoria = function(botao) { const grupo = botao.closest('.management-audit-group'); const aberto = botao.getAttribute('aria-expanded') === 'true'; botao.setAttribute('aria-expanded', String(!aberto)); grupo.classList.toggle('is-collapsed', aberto); grupo.classList.toggle('is-open', !aberto); };
document.getElementById('collapseAllPlans')?.addEventListener('click', () => { document.querySelectorAll('.management-audit-toggle').forEach(b => { b.setAttribute('aria-expanded','false'); b.closest('.management-audit-group').classList.add('is-collapsed'); b.closest('.management-audit-group').classList.remove('is-open'); }); document.querySelectorAll('.management-plan-toggle').forEach(b => { b.setAttribute('aria-expanded','false'); b.closest('.management-plan').classList.add('is-collapsed'); }); });
document.getElementById('expandAllPlans')?.addEventListener('click', () => { document.querySelectorAll('.management-audit-toggle').forEach(b => { b.setAttribute('aria-expanded','true'); b.closest('.management-audit-group').classList.add('is-open'); b.closest('.management-audit-group').classList.remove('is-collapsed'); }); document.querySelectorAll('.management-plan-toggle').forEach(b => { b.setAttribute('aria-expanded','true'); b.closest('.management-plan').classList.remove('is-collapsed'); }); });
['filtroStatus','filtroPrioridade','filtroPrazo'].forEach(id => document.getElementById(id).addEventListener('change', () => carregarPlanos().catch(mostrarErro)));
function mostrarErro(e) { document.getElementById('listaPlanos').innerHTML = `<div class="card"><h3>Não foi possível carregar a gestão</h3><p>${esc(e.message)}</p></div>`; }
Promise.all([carregarResumo(), carregarPlanos()]).catch(mostrarErro);
