(() => {
  const API_URL = 'http://localhost:3000/api';
  let auditoriasCache = [];
  const detalhesAbertos = new Set();

function token() { return localStorage.getItem('sensus_token') || localStorage.getItem('token') || localStorage.getItem('authToken'); }
async function api(endpoint) {
  const authToken = token();
  if (!authToken) throw new Error('Sua sessão não foi encontrada. Saia e entre novamente no sistema.');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  let response;
  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
      headers: { Authorization: `Bearer ${authToken}`, Accept: 'application/json' }
    });
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('A API demorou mais de 12 segundos para responder. Confira se o backend está iniciado e se a consulta ao banco terminou.');
    throw new Error('Não foi possível conectar à API do Sensus. Confira se o backend está iniciado em http://localhost:3000.');
  } finally { clearTimeout(timeout); }
  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json().catch(() => ({})) : {};
  if (!response.ok) throw new Error(data.erro || data.mensagem || `Falha ao consultar o histórico (HTTP ${response.status}).`);
  if (!contentType.includes('application/json')) throw new Error('A API não retornou JSON. Verifique a URL base e as rotas do backend.');
  return data;
}
function esc(v='') { return String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;'); }
function dataBR(v) { if (!v) return '—'; const d = new Date(v); return Number.isNaN(d.getTime()) ? esc(v) : d.toLocaleDateString('pt-BR'); }
function percentual(v) { const n = Number(v); return Number.isFinite(n) ? `${n.toLocaleString('pt-BR',{maximumFractionDigits:1})}%` : '—'; }
function statusLabel(v) { return v === 'finalizada' ? 'Finalizada' : v === 'em_andamento' ? 'Em andamento' : (v || 'Não informado'); }
function textoTipo(v) { return v === 'extraordinaria' ? 'Extraordinária' : 'Periódica'; }
function filtrar() {
  const termo = document.getElementById('buscaHistorico').value.trim().toLocaleLowerCase('pt-BR');
  const status = document.getElementById('filtroHistoricoStatus').value;
  const lista = auditoriasCache.filter(a => {
    const busca = `${a.codigo || ''} ${a.setor_nome || ''} ${a.auditor_nome || ''}`.toLocaleLowerCase('pt-BR');
    return (!termo || busca.includes(termo)) && (!status || a.status === status);
  });
  renderizar(lista);
}
function renderizar(lista) {
  const alvo = document.getElementById('listaHistorico');
  if (!lista.length) { alvo.innerHTML = '<div class="card history-empty"><h3>Nenhuma auditoria encontrada</h3><p style="margin-top:8px">Tente alterar os filtros ou realize uma nova auditoria.</p></div>'; return; }
  alvo.innerHTML = lista.map(a => `
    <article class="card history-item">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap">
        <div><h3>${esc(a.setor_nome || 'Setor não identificado')}</h3>
          <div class="history-meta"><span><strong>Código:</strong> ${esc(a.codigo || `AUD-${a.id}`)}</span><span><strong>Data:</strong> ${dataBR(a.data_auditoria)}</span><span><strong>Auditor:</strong> ${esc(a.auditor_nome || 'Não informado')}</span><span><strong>Tipo:</strong> ${textoTipo(a.tipo)}</span></div>
        </div>
        <div style="text-align:right"><span class="history-badge ${esc(a.status)}">${esc(statusLabel(a.status))}</span><h2 style="margin-top:8px">${percentual(a.percentual_geral)}</h2><small>${esc(a.classificacao || 'Sem classificação')}</small></div>
      </div>
      ${a.motivo_extraordinaria ? `<p style="margin-top:12px"><strong>Motivo da auditoria extraordinária:</strong> ${esc(a.motivo_extraordinaria)}</p>` : ''}
      <div class="history-actions"><button class="btn-primary" type="button" onclick="alternarDetalhe(${Number(a.id)})">${detalhesAbertos.has(Number(a.id)) ? 'Ocultar detalhes' : 'Ver respostas e evidências'}</button></div>
      <div id="detalhe-${Number(a.id)}" class="history-detail" ${detalhesAbertos.has(Number(a.id)) ? '' : 'hidden'}></div>
    </article>`).join('');
  for (const id of detalhesAbertos) { if (lista.some(a => Number(a.id) === id)) carregarDetalhe(id, false); }
}
async function alternarDetalhe(id) {
  if (detalhesAbertos.has(id)) { detalhesAbertos.delete(id); filtrar(); return; }
  detalhesAbertos.add(id); filtrar(); await carregarDetalhe(id, true);
}

window.alternarDetalhe = alternarDetalhe;

async function carregarDetalhe(id, mostrarErro=true) {
  const alvo = document.getElementById(`detalhe-${id}`); if (!alvo) return;
  alvo.hidden = false; alvo.innerHTML = '<p>Carregando detalhes da auditoria...</p>';
  try {
    const a = await api(`/auditorias/${id}`);
    const sensos = a.resultados_sensos || [];
    const respostas = a.respostas || [];
    const evidencias = a.evidencias || [];
    const planos = a.planos_acao || [];
    const evidenciasHtml = resposta => (resposta.evidencias || evidencias.filter(e => Number(e.resposta_id) === Number(resposta.id))).map(e => `<li>${esc(e.nome_original || e.nome_arquivo || 'Evidência')} ${e.descricao ? `— ${esc(e.descricao)}` : ''}</li>`).join('');
    alvo.innerHTML = `
      <div class="history-sensos">${sensos.map(s => `<div class="history-senso"><small>${esc(s.codigo || s.nome)}</small><h3>${percentual(s.percentual)}</h3><small>${esc(s.classificacao || '')}</small></div>`).join('') || '<p>Resultados por senso não disponíveis.</p>'}</div>
      <p><strong>Observação geral:</strong> ${esc(a.observacao_geral || 'Nenhuma observação registrada.')}</p>
      ${a.prazo ? `<p style="margin-top:6px"><strong>Prazo:</strong> ${dataBR(a.prazo)}</p>` : ''}
      <h3 style="margin-top:18px">Respostas por critério (${respostas.length})</h3>
      ${respostas.length ? respostas.map(r => `<div class="history-answer"><div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap"><strong>${esc(r.nome_senso || r.senso || 'Senso')} — ${esc(r.titulo || 'Critério')}</strong><span><strong>Nota:</strong> ${esc(r.nota)}/5</span></div><p style="margin-top:6px;color:#64748b">${esc(r.observacao || 'Sem observação.')}</p>${evidenciasHtml(r) ? `<div style="margin-top:8px"><strong>Evidências:</strong><ul>${evidenciasHtml(r)}</ul></div>` : ''}</div>`).join('') : '<p>Nenhuma resposta encontrada.</p>'}
      <h3 style="margin-top:18px">Planos de ação (${planos.length})</h3>
      ${planos.length ? `<ul>${planos.map(p => `<li style="margin:8px 0"><strong>${esc(p.criterio_titulo || 'Ação corretiva')}:</strong> ${esc(p.descricao)} — ${esc(p.status)} (prioridade ${esc(p.prioridade)})</li>`).join('')}</ul>` : '<p>Esta auditoria não gerou planos de ação.</p>'}
      <div class="history-meta"><span><strong>Iniciada:</strong> ${dataBR(a.iniciada_em || a.data_auditoria)}</span><span><strong>Finalizada:</strong> ${dataBR(a.finalizada_em)}</span><span><strong>Duração:</strong> ${a.duracao_segundos != null ? `${Math.floor(Number(a.duracao_segundos)/60)} min` : '—'}</span></div>`;
  } catch (e) { alvo.innerHTML = `<p style="color:#b91c1c">${esc(e.message)}</p>`; if (mostrarErro) console.error(e); }
}
document.getElementById('buscaHistorico').addEventListener('input', filtrar);
document.getElementById('filtroHistoricoStatus').addEventListener('change', filtrar);
(async function inicializar() {
  const alvo = document.getElementById('listaHistorico');
  alvo.innerHTML = '<div class="card history-empty"><p>Carregando auditorias...</p></div>';
  try {
    const retorno = await api('/auditorias');
    // Aceita o formato atual (array) e envelopes comuns de APIs sem quebrar a tela.
    const lista = Array.isArray(retorno) ? retorno
      : Array.isArray(retorno.auditorias) ? retorno.auditorias
      : Array.isArray(retorno.dados) ? retorno.dados
      : Array.isArray(retorno.data) ? retorno.data : null;
    if (!lista) throw new Error('A API respondeu, mas não retornou uma lista de auditorias. Verifique o endpoint GET /api/auditorias.');
    auditoriasCache = lista;
    auditoriasCache.sort((a,b) => new Date(b.data_auditoria || b.iniciada_em || b.finalizada_em || 0) - new Date(a.data_auditoria || a.iniciada_em || a.finalizada_em || 0));
    filtrar();
  } catch (e) {
    console.error('[Histórico de Auditorias]', e);
    alvo.innerHTML = `<div class="card history-empty"><h3>Não foi possível carregar o histórico</h3><p style="margin-top:8px">${esc(e.message)}</p><button class="btn-primary" style="margin-top:14px" onclick="location.reload()">Tentar novamente</button></div>`;
  }
})();
})();
