const API_URL = window.SENSUS_API_URL || 'http://localhost:3000/api';
const API_ORIGIN = new URL(API_URL, window.location.href).origin;
let auditoriasCache = [];
const detalhesAbertos = new Set();

function obterTokenHistorico() { return localStorage.getItem('sensus_token') || localStorage.getItem('token') || localStorage.getItem('authToken'); }
async function api(endpoint) {
  const response = await fetch(`${API_URL}${endpoint}`, { headers: { Authorization: `Bearer ${obterTokenHistorico()}` } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.erro || data.mensagem || 'Falha ao consultar o histórico.');
  return data;
}
function esc(v='') { return String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;'); }
function dataBR(v) { if (!v) return '—'; const d = new Date(v); return Number.isNaN(d.getTime()) ? esc(v) : d.toLocaleDateString('pt-BR'); }
function percentual(v) { const n = Number(v); return Number.isFinite(n) ? `${n.toLocaleString('pt-BR',{maximumFractionDigits:1})}%` : '—'; }
function classePercentual(v) { const n=Number(v||0); return n<50?'performance-critical':n<70?'performance-low':n<85?'performance-medium':'performance-good'; }
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
        <div style="text-align:right"><span class="history-badge ${esc(a.status)}">${esc(statusLabel(a.status))}</span><h2 class="${classePercentual(a.percentual_geral)}" style="margin-top:8px">${percentual(a.percentual_geral)}</h2><small>${esc(a.classificacao || 'Sem classificação')}</small></div>
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
async function carregarDetalhe(id, mostrarErro=true) {
  const alvo = document.getElementById(`detalhe-${id}`); if (!alvo) return;
  alvo.hidden = false; alvo.innerHTML = '<p>Carregando detalhes da auditoria...</p>';
  try {
    const a = await api(`/auditorias/${id}`);
    const sensos = a.resultados_sensos || [];
    const respostas = a.respostas || [];
    const evidencias = a.evidencias || [];
    const planos = a.planos_acao || [];
    const urlEvidencia = (e) => {
      // Novas evidências usam URL absoluta do Cloudinary. Registros antigos
      // podem conter caminhos locais em formatos diferentes.
      const caminho = String(e.caminho || e.url || '').trim();
      if (/^https?:\/\//i.test(caminho)) return caminho;

      let relativo = caminho.replace(/\\/g, '/').replace(/^\.\//, '');
      relativo = relativo.replace(/^.*?backend\//i, '');
      if (relativo.startsWith('/uploads/')) return `${API_ORIGIN}${relativo}`;
      if (relativo.startsWith('uploads/')) return `${API_ORIGIN}/${relativo}`;
      if (relativo.startsWith('evidencias/')) return `${API_ORIGIN}/uploads/${relativo}`;
      if (relativo && !relativo.includes('://')) {
        const nome = relativo.split('/').pop();
        if (nome) return `${API_ORIGIN}/uploads/evidencias/${encodeURIComponent(nome)}`;
      }

      const nomeArquivo = String(e.nome_arquivo || '').replace(/\\/g, '/').split('/').pop();
      if (nomeArquivo && !nomeArquivo.includes('.')) return '';
      return nomeArquivo ? `${API_ORIGIN}/uploads/evidencias/${encodeURIComponent(nomeArquivo)}` : '';
    };
    const evidenciasHtml = resposta => (resposta.evidencias || evidencias.filter(e => Number(e.resposta_id) === Number(resposta.id))).map(e => {
      const url = urlEvidencia(e);
      const legenda = e.descricao ? ` — ${esc(e.descricao)}` : '';
      return `<li class="history-evidence-item"><div class="history-evidence-info"><span>${esc(e.nome_original || e.nome_arquivo || 'Evidência')}${legenda}</span></div><div class="history-evidence-action"><button class="history-photo-button" type="button" data-evidence-url="${esc(url)}" data-evidence-title="${esc(e.nome_original || 'Evidência')}" ${url ? '' : 'disabled'}><i class="icon icon-camera" aria-hidden="true"></i> Ver foto</button></div></li>`;
    }).join('');
    alvo.innerHTML = `
      <div class="history-sensos">${sensos.map(s => `<div class="history-senso"><small>${esc(s.codigo || s.nome)}</small><h3 class="${classePercentual(s.percentual)}">${percentual(s.percentual)}</h3><small>${esc(s.classificacao || '')}</small></div>`).join('') || '<p>Resultados por senso não disponíveis.</p>'}</div>
      <p><strong>Observação geral:</strong> ${esc(a.observacao_geral || 'Nenhuma observação registrada.')}</p>
      ${a.prazo ? `<p style="margin-top:6px"><strong>Prazo:</strong> ${dataBR(a.prazo)}</p>` : ''}
      <section class="history-answers-section">
        <h3 style="margin-top:18px">Respostas por Senso (${respostas.length})</h3>
        <p class="history-answers-hint">Selecione um Senso para visualizar suas perguntas, notas, observações e evidências.</p>
        ${respostas.length ? (() => {
          const nomesCanonicos = {
            1: 'Seiri — Utilização',
            2: 'Seiton — Organização',
            3: 'Seiso — Limpeza',
            4: 'Seiketsu — Padronização',
            5: 'Shitsuke — Disciplina'
          };
          const normalizarSenso = valor => String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
          const ordemPorTitulo = {
  "existem itens sem uso no ambiente": 1,
  "materiais obsoletos foram removidos": 1,
  "ferramentas duplicadas foram eliminadas": 1,
  "documentos antigos foram descartados": 1,
  "itens pessoais são mínimos no ambiente": 1,
  "há identificação de itens desnecessários": 1,
  "sobras de materiais foram reduzidas": 1,
  "equipamentos quebrados foram descartados": 1,
  "estoques excessivos foram eliminados": 1,
  "materiais sem função clara foram removidos": 1,
  "itens têm locais definidos": 2,
  "ferramentas são guardadas após uso": 2,
  "etiquetas de identificação estão visíveis": 2,
  "a organização facilita o acesso rápido": 2,
  "o layout do espaço é otimizado": 2,
  "materiais são organizados por frequência de uso": 2,
  "cores e padrões ajudam na identificação": 2,
  "há sinalização clara nos espaços": 2,
  "caminhos de circulação estão livres": 2,
  "a posição dos itens é lógica e intuitiva": 2,
  "o ambiente está limpo diariamente": 3,
  "não há sujeira acumulada": 3,
  "ferramentas são limpas após o uso": 3,
  "máquinas estão livres de poeira": 3,
  "a falta de limpeza é rapidamente detectada": 3,
  "há rotina de limpeza definida": 3,
  "os responsáveis pela limpeza são definidos": 3,
  "lixeiras estão disponíveis e são adequadas": 3,
  "resíduos são descartados corretamente": 3,
  "equipamentos são inspecionados durante a limpeza": 3,
  "existem padrões definidos de organização": 4,
  "procedimentos estão documentados": 4,
  "checklists são utilizados": 4,
  "treinamento é realizado regularmente": 4,
  "padrões visuais são aplicados": 4,
  "sinalizações são padronizadas": 4,
  "normas são seguidas por todos": 4,
  "auditorias internas são feitas": 4,
  "os processos são consistentes": 4,
  "o ambiente permanece organizado ao longo do tempo": 4,
  "funcionários seguem as regras espontaneamente": 5,
  "há disciplina no cumprimento das normas": 5,
  "a cultura 5s é disseminada": 5,
  "treinamentos contínuos acontecem": 5,
  "a liderança dá exemplo": 5,
  "há comprometimento da equipe": 5,
  "as regras são cumpridas sem cobrança constante": 5,
  "auditorias são bem aceitas": 5,
  "a melhoria contínua é incentivada": 5,
  "há reconhecimento de boas práticas": 5
};
          const grupos = new Map();
          // Inicializa os cinco grupos usando os resultados consolidados da auditoria.
          // Assim, nenhum Senso desaparece mesmo que uma resposta antiga tenha metadados incompletos.
          sensos.forEach(s => {
            const ordem = Number(s.ordem) || 99;
            const id = `ordem-${ordem}`;
            grupos.set(id, { label: nomesCanonicos[ordem] || `${s.codigo || 'Senso'} — ${s.nome || ''}`, ordem, itens: [] });
          });
          respostas.forEach(r => {
            const tituloNormalizado = normalizarSenso(r.titulo);
            const ordemPorTituloEncontrada = ordemPorTitulo[tituloNormalizado];
            const ordem = ordemPorTituloEncontrada || Number(r.ordem_senso) || 99;
            const grupoResultado = sensos.find(s => r.senso_id != null && String(s.senso_id) === String(r.senso_id));
            const id = `ordem-${ordemPorTituloEncontrada || Number(grupoResultado?.ordem) || ordem}`;
            const label = nomesCanonicos[ordem] || (r.senso && r.nome_senso ? `${r.senso} — ${r.nome_senso}` : r.nome_senso || r.senso || 'Senso não identificado');
            if (!grupos.has(id)) grupos.set(id, { label, ordem, itens: [] });
            grupos.get(id).itens.push(r);
          });
          const gruposOrdenados = [...grupos.entries()].sort((a, b) => a[1].ordem - b[1].ordem);
          return gruposOrdenados.map(([chave, grupo]) => {
            const notas = grupo.itens.map(r => Number(r.nota)).filter(n => Number.isFinite(n));
            const media = notas.length ? (notas.reduce((s, n) => s + n, 0) / notas.length).toFixed(1) : '—';
            return `<details class="history-senso-accordion">
              <summary>
                <span class="history-senso-summary-main"><strong>${esc(grupo.label)}</strong><small>${grupo.itens.length} ${grupo.itens.length === 1 ? 'pergunta' : 'perguntas'} · Média ${media}/5</small></span>
                <span class="history-senso-chevron" aria-hidden="true"></span>
              </summary>
              <div class="history-senso-accordion-content">
                ${grupo.itens.map(r => `<article class="history-answer">
                  <div class="history-answer-heading"><strong>${esc(r.titulo || 'Critério')}</strong><span class="history-answer-score"><strong>Nota:</strong> ${esc(r.nota)}/5</span></div>
                  <p class="history-answer-observation">${esc(r.observacao || 'Sem observação.')}</p>
                  ${evidenciasHtml(r) ? `<div class="history-answer-evidence"><strong>Evidências:</strong><ul>${evidenciasHtml(r)}</ul></div>` : ''}
                </article>`).join('')}
              </div>
            </details>`;
          }).join('');
        })() : '<p>Nenhuma resposta encontrada.</p>'}
      </section>
      <section class="history-answers-section history-plans-section">
        <h3 style="margin-top:18px">Planos de ação (${planos.length})</h3>
        <p class="history-answers-hint">Expanda um Senso para consultar as ações vinculadas a ele.</p>
        ${planos.length ? (() => {
          const nomesCanonicos = {
            1: 'Seiri — Utilização',
            2: 'Seiton — Organização',
            3: 'Seiso — Limpeza',
            4: 'Seiketsu — Padronização',
            5: 'Shitsuke — Disciplina'
          };
          const normalizarSenso = valor => String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
          const ordemPorTitulo = {
  "existem itens sem uso no ambiente": 1,
  "materiais obsoletos foram removidos": 1,
  "ferramentas duplicadas foram eliminadas": 1,
  "documentos antigos foram descartados": 1,
  "itens pessoais são mínimos no ambiente": 1,
  "há identificação de itens desnecessários": 1,
  "sobras de materiais foram reduzidas": 1,
  "equipamentos quebrados foram descartados": 1,
  "estoques excessivos foram eliminados": 1,
  "materiais sem função clara foram removidos": 1,
  "itens têm locais definidos": 2,
  "ferramentas são guardadas após uso": 2,
  "etiquetas de identificação estão visíveis": 2,
  "a organização facilita o acesso rápido": 2,
  "o layout do espaço é otimizado": 2,
  "materiais são organizados por frequência de uso": 2,
  "cores e padrões ajudam na identificação": 2,
  "há sinalização clara nos espaços": 2,
  "caminhos de circulação estão livres": 2,
  "a posição dos itens é lógica e intuitiva": 2,
  "o ambiente está limpo diariamente": 3,
  "não há sujeira acumulada": 3,
  "ferramentas são limpas após o uso": 3,
  "máquinas estão livres de poeira": 3,
  "a falta de limpeza é rapidamente detectada": 3,
  "há rotina de limpeza definida": 3,
  "os responsáveis pela limpeza são definidos": 3,
  "lixeiras estão disponíveis e são adequadas": 3,
  "resíduos são descartados corretamente": 3,
  "equipamentos são inspecionados durante a limpeza": 3,
  "existem padrões definidos de organização": 4,
  "procedimentos estão documentados": 4,
  "checklists são utilizados": 4,
  "treinamento é realizado regularmente": 4,
  "padrões visuais são aplicados": 4,
  "sinalizações são padronizadas": 4,
  "normas são seguidas por todos": 4,
  "auditorias internas são feitas": 4,
  "os processos são consistentes": 4,
  "o ambiente permanece organizado ao longo do tempo": 4,
  "funcionários seguem as regras espontaneamente": 5,
  "há disciplina no cumprimento das normas": 5,
  "a cultura 5s é disseminada": 5,
  "treinamentos contínuos acontecem": 5,
  "a liderança dá exemplo": 5,
  "há comprometimento da equipe": 5,
  "as regras são cumpridas sem cobrança constante": 5,
  "auditorias são bem aceitas": 5,
  "a melhoria contínua é incentivada": 5,
  "há reconhecimento de boas práticas": 5
};
          const grupos = new Map();
          sensos.forEach(s => {
            const ordem = Number(s.ordem) || 99;
            const id = `ordem-${ordem}`;
            grupos.set(id, { label: nomesCanonicos[ordem] || `${s.codigo || 'Senso'} — ${s.nome || ''}`, ordem, itens: [] });
          });
          planos.forEach(p => {
            const ordemTitulo = ordemPorTitulo[normalizarSenso(p.criterio_titulo)];
            const ordem = ordemTitulo || Number(p.ordem_senso) || 99;
            const resultado = sensos.find(s => p.criterio_senso_id != null && String(s.senso_id) === String(p.criterio_senso_id));
            const id = `ordem-${ordemTitulo || Number(resultado?.ordem) || ordem}`;
            const label = nomesCanonicos[ordem] || (p.senso && p.nome_senso ? `${p.senso} — ${p.nome_senso}` : p.nome_senso || p.senso || 'Outros planos');
            if (!grupos.has(id)) grupos.set(id, { label, ordem, itens: [] });
            grupos.get(id).itens.push(p);
          });
          return [...grupos.entries()]
            .sort((a, b) => a[1].ordem - b[1].ordem || a[0].localeCompare(b[0], 'pt-BR', { numeric: true }))
            .map(([idSenso, grupo]) => `<details class="history-senso-accordion history-plan-accordion">
              <summary>
                <span class="history-senso-summary-main"><strong>${esc(grupo.label)}</strong><small>${grupo.itens.length} ${grupo.itens.length === 1 ? 'plano de ação' : 'planos de ação'}</small></span>
                <span class="history-senso-chevron" aria-hidden="true"></span>
              </summary>
              <div class="history-senso-accordion-content">
                ${grupo.itens.map(p => `<article class="history-answer history-plan-item">
                  <div class="history-answer-heading">
                    <strong>${esc(p.criterio_titulo || 'Ação corretiva')}</strong>
                    <span class="history-plan-status">${esc(p.status || 'Pendente')}</span>
                  </div>
                  <p class="history-answer-observation">${esc(p.descricao || 'Sem descrição registrada.')}</p>
                  <div class="history-plan-meta"><span>Prioridade: <strong>${esc(p.prioridade || 'Não definida')}</strong></span>${p.responsavel_nome ? `<span>Responsável: <strong>${esc(p.responsavel_nome)}</strong></span>` : ''}</div>
                </article>`).join('')}
              </div>
            </details>`).join('');
        })() : '<p>Esta auditoria não gerou planos de ação.</p>'}
      </section>
      <div class="history-meta"><span><strong>Iniciada:</strong> ${dataBR(a.iniciada_em || a.data_auditoria)}</span><span><strong>Finalizada:</strong> ${dataBR(a.finalizada_em)}</span><span><strong>Duração:</strong> ${a.duracao_segundos != null ? `${Math.floor(Number(a.duracao_segundos)/60)} min` : '—'}</span></div>`;
  } catch (e) { alvo.innerHTML = `<p style="color:#b91c1c">${esc(e.message)}</p>`; if (mostrarErro) console.error(e); }
}
function visualizarEvidencia(urlCodificada, titulo = 'Evidência') {
  const url = decodeURIComponent(urlCodificada);
  let modal = document.getElementById('historyPhotoModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'historyPhotoModal';
    modal.className = 'history-photo-modal';
    modal.innerHTML = `<div class="history-photo-dialog" role="dialog" aria-modal="true" aria-labelledby="historyPhotoTitle"><div class="history-photo-header"><h3 id="historyPhotoTitle">Evidência</h3><button type="button" class="history-photo-close" aria-label="Fechar" onclick="fecharEvidencia()">&times;</button></div><div class="history-photo-content"><img id="historyPhotoImage" alt="Foto de evidência"><p id="historyPhotoError" hidden>Não foi possível carregar esta imagem. O arquivo pode ter sido removido do servidor ou o caminho salvo na auditoria antiga não está mais disponível.</p></div><div class="history-photo-footer"><button type="button" class="btn-secondary" onclick="fecharEvidencia()">Fechar</button><a id="historyPhotoOpen" class="history-photo-open" target="_blank" rel="noopener">Abrir em nova aba</a></div></div>`;
    modal.addEventListener('click', (event) => { if (event.target === modal) fecharEvidencia(); });
    document.body.appendChild(modal);
  }
  const img = document.getElementById('historyPhotoImage');
  const erro = document.getElementById('historyPhotoError');
  document.getElementById('historyPhotoTitle').textContent = titulo || 'Evidência';
  erro.hidden = true;
  img.hidden = false;
  img.onload = () => { img.hidden = false; erro.hidden = true; };
  img.onerror = () => { img.hidden = true; erro.hidden = false; };
  img.src = url;
  document.getElementById('historyPhotoOpen').href = url;
  modal.classList.add('is-open');
  document.body.style.overflow = 'hidden';
}
function fecharEvidencia() {
  const modal = document.getElementById('historyPhotoModal');
  if (modal) modal.classList.remove('is-open');
  document.body.style.overflow = '';
}
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') fecharEvidencia(); });
document.addEventListener('click', (event) => {
  const botao = event.target.closest('[data-evidence-url]');
  if (botao && !botao.disabled) visualizarEvidencia(encodeURIComponent(botao.dataset.evidenceUrl), botao.dataset.evidenceTitle);
});

document.getElementById('buscaHistorico').addEventListener('input', filtrar);
document.getElementById('filtroHistoricoStatus').addEventListener('change', filtrar);
(async function inicializar() {
  try {
    auditoriasCache = await api('/auditorias');
    auditoriasCache.sort((a,b) => new Date(b.data_auditoria || 0) - new Date(a.data_auditoria || 0));
    filtrar();
  } catch (e) {
    document.getElementById('listaHistorico').innerHTML = `<div class="card history-empty"><h3>Não foi possível carregar o histórico</h3><p style="margin-top:8px">${esc(e.message)}</p><button class="btn-primary" style="margin-top:14px" onclick="location.reload()">Tentar novamente</button></div>`;
  }
})();
