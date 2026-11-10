(() => {
  const $ = (id) => document.getElementById(id);
  let opcoes = { setores: [], auditorias: [] };
  let relatorioAtual = null;
  let tituloAtual = 'Relatório Sensus 5S';
  let arquivoAtual = 'relatorio-sensus-5s.pdf';

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
  const numero = (value, casas = 1) => Number(value || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: casas, maximumFractionDigits: casas
  });
  // Faixas oficiais de desempenho do Sensus 5S:
  // 0–49% vermelho; 50–69,99% laranja; 70–84,99% amarelo; 85–100% verde.
  const classePercentual = (valor) => {
    const n = Number(valor);
    if (!Number.isFinite(n)) return 'percent-sem-cor';
    if (n < 50) return 'percent-vermelho';
    if (n < 70) return 'percent-laranja';
    if (n < 85) return 'percent-amarelo';
    return 'percent-verde';
  };
  const celulaPercentual = (valor) => ({
    texto: `${numero(valor)}%`,
    classe: classePercentual(valor)
  });
  const dataBR = (value) => {
    if (!value) return '—';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('pt-BR');
  };
  const statusMsg = (id, msg, tipo = '') => {
    const el = $(id); el.textContent = msg; el.className = `report-status ${tipo}`;
  };
  const dataPadrao = () => {
    const hoje = new Date();
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    $('dataInicio').value = inicio.toISOString().slice(0,10);
    $('dataFim').value = hoje.toISOString().slice(0,10);
  };

  async function carregarOpcoes() {
    try {
      opcoes = await api.relatoriosOpcoes();
      $('setorRelatorio').innerHTML = '<option value="">Selecione um setor</option>' +
        opcoes.setores.map(s => `<option value="${s.id}">${escapeHtml(s.nome)}</option>`).join('');
      $('auditoriaRelatorio').innerHTML = '<option value="">Selecione uma auditoria</option>' +
        opcoes.auditorias.map(a => `<option value="${a.id}">${escapeHtml(a.codigo)} — ${escapeHtml(a.setor_nome)} — ${dataBR(a.data_auditoria)}</option>`).join('');
    } catch (e) {
      statusMsg('reportStatus', e.message || 'Não foi possível carregar os filtros.', 'error');
    }
  }

  function atualizarFiltros() {
    const tipo = $('tipoRelatorio').value;
    $('filtroAuditoria').hidden = tipo !== 'auditoria';
    $('filtroSetor').hidden = tipo !== 'setor';
    $('filtroPeriodo').hidden = !['setor','periodico'].includes(tipo);
    if (tipo === 'gerencial' && getUsuarioPerfil() !== 'administrador') {
      statusMsg('reportStatus', 'O relatório gerencial completo está disponível apenas para administradores.', 'error');
    } else statusMsg('reportStatus', '');
  }

  function getUsuarioPerfil() {
    try { return JSON.parse(localStorage.getItem('sensus_usuario') || '{}').perfil; } catch (_) { return ''; }
  }

  function construirParametros() {
    const tipo = $('tipoRelatorio').value;
    const params = { tipo };
    if (tipo === 'auditoria') params.auditoria_id = $('auditoriaRelatorio').value;
    if (tipo === 'setor') params.setor_id = $('setorRelatorio').value;
    if (['setor','periodico'].includes(tipo)) {
      params.inicio = $('dataInicio').value;
      params.fim = $('dataFim').value;
    }
    return params;
  }

  async function gerarPrevia(event) {
    event?.preventDefault();
    statusMsg('reportStatus', 'Consultando dados...');
    $('gerarRelatorioBtn').disabled = true;
    try {
      const params = construirParametros();
      if (params.tipo === 'auditoria' && !params.auditoria_id) throw new Error('Selecione uma auditoria finalizada.');
      if (params.tipo === 'setor' && !params.setor_id) throw new Error('Selecione um setor.');
      if (['setor','periodico'].includes(params.tipo) && (!params.inicio || !params.fim || params.inicio > params.fim)) {
        throw new Error('Informe um período válido.');
      }
      relatorioAtual = await api.gerarRelatorio(params);
      tituloAtual = ({
        auditoria: 'Relatório de Auditoria 5S',
        setor: 'Relatório de Desempenho por Setor',
        gerencial: 'Relatório Gerencial Sensus 5S',
        periodico: 'Relatório Periódico Sensus 5S'
      })[params.tipo];
      arquivoAtual = `${params.tipo}-sensus-5s-${new Date().toISOString().slice(0,10)}.pdf`;
      renderizarPrevia(relatorioAtual);
      $('exportCard').hidden = false;
      $('emailForm').hidden = true;
      statusMsg('reportStatus', 'Prévia gerada com sucesso.', 'success');
    } catch (e) {
      relatorioAtual = null;
      $('exportCard').hidden = true;
      statusMsg('reportStatus', e.message || 'Erro ao gerar relatório.', 'error');
    } finally {
      $('gerarRelatorioBtn').disabled = false;
    }
  }

  function valorTabela(valor) {
    if (valor && typeof valor === 'object' && Object.prototype.hasOwnProperty.call(valor, 'texto')) {
      return `<span class="report-percent ${escapeHtml(valor.classe)}">${escapeHtml(valor.texto)}</span>`;
    }
    return escapeHtml(valor ?? '—');
  }

  function tabela(titulos, linhas) {
    if (!linhas?.length) return '<p class="reports-help">Não há registros para os filtros selecionados.</p>';
    return `<div class="report-table-wrap"><table class="report-table"><thead><tr>${titulos.map(t=>`<th>${escapeHtml(t)}</th>`).join('')}</tr></thead><tbody>${linhas.map(row=>`<tr>${row.map(v=>`<td>${valorTabela(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }

  function kpis(items) {
    return `<div class="report-kpis">${items.map(([label,value])=>{
      const formatado = value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'texto')
        ? `<strong class="report-percent ${escapeHtml(value.classe)}">${escapeHtml(value.texto)}</strong>`
        : `<strong>${escapeHtml(value)}</strong>`;
      return `<div class="report-kpi"><small>${escapeHtml(label)}</small>${formatado}</div>`;
    }).join('')}</div>`;
  }

  function renderizarPrevia(r) {
    let html = `<h2>${escapeHtml(tituloAtual)}</h2><p class="reports-help">Gerado em ${dataBR(new Date())}. Dados de auditorias finalizadas.</p>`;
    if (r.tipo === 'auditoria') {
      const a = r.auditoria;
      html += `<h3>${escapeHtml(a.codigo)} — ${escapeHtml(a.setor_nome)}</h3>
        <p class="reports-help">Auditor: ${escapeHtml(a.auditor_nome)} · Data: ${dataBR(a.data_auditoria)} · Tipo: ${escapeHtml(a.tipo || '—')}</p>`;
      html += kpis([['Resultado geral', celulaPercentual(a.percentual_geral)],['Classificação',a.classificacao || '—'],['Sensos concluídos',`${(a.resultados_sensos||[]).filter(s=>s.status==='concluido').length}/5`]]);
      html += '<h4 class="report-section-title">Desempenho por senso</h4>' + tabela(['Senso','Pontuação','Máximo','Resultado','Classificação'],(a.resultados_sensos||[]).map(s=>[s.nome,s.pontuacao_total,s.pontuacao_maxima,`${numero(s.percentual)}%`,s.classificacao]));
      html += '<h4 class="report-section-title">Critérios avaliados</h4>' + tabela(['Senso','Critério','Nota','Peso','Observação'],(a.respostas||[]).map(x=>[x.nome_senso,x.titulo,x.nota,x.peso_aplicado,x.observacao||'—']));
      html += '<h4 class="report-section-title">Evidências registradas</h4>' + tabela(['Arquivo','Descrição','Data'],(a.evidencias||[]).map(e=>[e.nome_original||e.nome_arquivo,e.descricao||'—',dataBR(e.criado_em)]));
      html += '<h4 class="report-section-title">Planos de ação</h4>' + tabela(['Ação','Status','Prioridade','Prazo','Responsável'],(a.planos_acao||[]).map(p=>[p.descricao,p.status,p.prioridade,dataBR(p.prazo_conclusao),p.responsavel_nome||'—']));
      if (a.observacao_geral) html += `<h4 class="report-section-title">Observação geral</h4><p>${escapeHtml(a.observacao_geral)}</p>`;
    } else if (r.tipo === 'setor') {
      html += `<h3>${escapeHtml(r.setor.nome)}</h3><p class="reports-help">${escapeHtml(r.setor.descricao||'')} · Auditor responsável: ${escapeHtml(r.setor.auditor_responsavel||'—')}</p>`;
      html += kpis([['Auditorias',r.indicadores.totalAuditorias],['Média do período',celulaPercentual(r.indicadores.media)],['Último resultado',r.indicadores.ultimoScore==null?'—':celulaPercentual(r.indicadores.ultimoScore)]]);
      html += '<h4 class="report-section-title">Histórico de auditorias</h4>' + tabela(['Código','Data','Auditor','Resultado','Classificação'],r.auditorias.map(a=>[a.codigo,dataBR(a.data_auditoria),a.auditor_nome,celulaPercentual(a.percentual_geral),a.classificacao]));
      html += '<h4 class="report-section-title">Planos de ação do setor</h4>' + tabela(['Ação','Auditoria','Status','Prioridade','Prazo','Responsável'],r.planos.map(p=>[p.descricao,p.auditoria_codigo,p.status,p.prioridade,dataBR(p.prazo_conclusao),p.responsavel_nome||'—']));
    } else if (r.tipo === 'gerencial') {
      const d = r.dashboard, k = d.kpis || {};
      html += `<h3>${escapeHtml(r.empresa?.nome || 'Empresa')}</h3>`;
      html += kpis([['Auditorias finalizadas',k.totalAuditorias],['Índice atual',`${numero(k.indiceAtual)}%`],['Média anual',`${numero(k.mediaGeral)}%`],['Setores ativos',k.totalSetores],['Planos pendentes',k.planosPendentes]]);
      html += '<h4 class="report-section-title">Desempenho por senso</h4>' + tabela(['Senso','Média'],(d.porSenso||[]).map(s=>[s.nome,celulaPercentual(s.media)]));
      html += '<h4 class="report-section-title">Ranking de setores</h4>' + tabela(['Setor','Resultado'],(d.porSetor||[]).map(s=>[s.nome,celulaPercentual(s.score)]));
      html += '<h4 class="report-section-title">Auditorias recentes</h4>' + tabela(['Código','Setor','Data','Auditor','Resultado'],(r.auditoriasRecentes||[]).map(a=>[a.codigo,a.setor_nome,dataBR(a.data_auditoria),a.auditor_nome,celulaPercentual(a.percentual_geral)]));
      html += '<h4 class="report-section-title">Planos por status e prioridade</h4>' + tabela(['Status','Prioridade','Quantidade'],(r.planos||[]).map(p=>[p.status,p.prioridade,p.total]));
    } else {
      html += `<p class="reports-help">Período: ${dataBR(r.inicio)} até ${dataBR(r.fim)}</p>`;
      html += kpis([['Auditorias',r.indicadores.totalAuditorias],['Média do período',`${numero(r.indicadores.media)}%`]]);
      html += '<h4 class="report-section-title">Resumo mensal</h4>' + tabela(['Mês','Auditorias','Média','Melhor','Menor'],r.porMes.map(m=>[m.mes,m.total,celulaPercentual(m.media),celulaPercentual(m.melhor),celulaPercentual(m.menor)]));
      html += '<h4 class="report-section-title">Desempenho por setor</h4>' + tabela(['Setor','Auditorias','Média'],r.porSetor.map(s=>[s.setor,s.total,celulaPercentual(s.media)]));
      html += '<h4 class="report-section-title">Auditorias do período</h4>' + tabela(['Código','Setor','Data','Auditor','Resultado'],r.auditorias.map(a=>[a.codigo,a.setor_nome,dataBR(a.data_auditoria),a.auditor_nome,celulaPercentual(a.percentual_geral)]));
    }
    $('reportPreview').innerHTML = html;
  }

  function textoPDF(doc, texto, x, y, largura = 180) {
    const linhas = doc.splitTextToSize(String(texto ?? '—'), largura);
    doc.text(linhas, x, y);
    return y + linhas.length * 5;
  }
  function tituloPDF(doc, titulo) {
    doc.setFillColor(16,33,59); doc.rect(0,0,210,28,'F');
    doc.setTextColor(255,191,0); doc.setFontSize(18); doc.setFont('helvetica','bold');
    doc.text('SENSUS 5S',14,12);
    doc.setTextColor(255,255,255); doc.setFontSize(10); doc.setFont('helvetica','normal');
    doc.text('Gestão inteligente da metodologia 5S',14,20);
    doc.setTextColor(16,33,59); doc.setFontSize(16); doc.setFont('helvetica','bold');
    doc.text(titulo,14,40);
    doc.setTextColor(90,105,125); doc.setFontSize(9);
    doc.text(`Emitido em ${new Date().toLocaleString('pt-BR')}`,14,47);
    return 57;
  }
  function secaoPDF(doc, titulo, y) {
    if (y > 260) { doc.addPage(); y = 20; }
    doc.setTextColor(16,33,59); doc.setFont('helvetica','bold'); doc.setFontSize(11);
    doc.text(titulo,14,y);
    return y+4;
  }
  function tabelaPDF(doc, head, body, y) {
    if (!body?.length) body = [['—']];
    doc.autoTable({
      startY:y, head:[head], body, theme:'grid',
      styles:{font:'helvetica',fontSize:8,cellPadding:2.5,textColor:[40,52,70],overflow:'linebreak'},
      headStyles:{fillColor:[255,191,0],textColor:[16,33,59],fontStyle:'bold'},
      alternateRowStyles:{fillColor:[246,248,251]},
      margin:{left:14,right:14}
    });
    return doc.lastAutoTable.finalY+10;
  }

  function criarPDF() {
    if (!relatorioAtual) throw new Error('Gere uma prévia antes de exportar.');
    if (!window.jspdf?.jsPDF) throw new Error('A biblioteca de PDF não carregou. Verifique sua conexão e atualize a página.');
    const doc = new window.jspdf.jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
    let y = tituloPDF(doc,tituloAtual);
    const r = relatorioAtual;
    if (r.tipo === 'auditoria') {
      const a=r.auditoria;
      y=textoPDF(doc,`${a.codigo} | Setor: ${a.setor_nome} | Auditor: ${a.auditor_nome} | Data: ${dataBR(a.data_auditoria)}`,14,y);
      y=textoPDF(doc,`Resultado geral: ${numero(a.percentual_geral)}% | Classificação: ${a.classificacao||'—'}`,14,y+2);
      y=secaoPDF(doc,'Desempenho por senso',y+5);
      y=tabelaPDF(doc,['Senso','Pontos','Máximo','Resultado','Classificação'],(a.resultados_sensos||[]).map(s=>[s.nome,s.pontuacao_total,s.pontuacao_maxima,`${numero(s.percentual)}%`,s.classificacao||'—']),y);
      y=secaoPDF(doc,'Critérios avaliados',y);
      y=tabelaPDF(doc,['Senso','Critério','Nota','Peso','Observação'],(a.respostas||[]).map(x=>[x.nome_senso,x.titulo,x.nota,x.peso_aplicado,x.observacao||'—']),y);
      y=secaoPDF(doc,'Evidências registradas',y);
      y=tabelaPDF(doc,['Arquivo','Descrição','Data'],(a.evidencias||[]).map(e=>[e.nome_original||e.nome_arquivo,e.descricao||'—',dataBR(e.criado_em)]),y);
      y=secaoPDF(doc,'Planos de ação',y);
      tabelaPDF(doc,['Ação','Status','Prioridade','Prazo','Responsável'],(a.planos_acao||[]).map(p=>[p.descricao,p.status,p.prioridade,dataBR(p.prazo_conclusao),p.responsavel_nome||'—']),y);
    } else if (r.tipo === 'setor') {
      y=textoPDF(doc,`Setor: ${r.setor.nome} | Auditor responsável: ${r.setor.auditor_responsavel||'—'}`,14,y);
      y=textoPDF(doc,`Auditorias: ${r.indicadores.totalAuditorias} | Média: ${numero(r.indicadores.media)}% | Último resultado: ${r.indicadores.ultimoScore==null?'—':numero(r.indicadores.ultimoScore)+'%'}`,14,y+2);
      y=secaoPDF(doc,'Histórico de auditorias',y+6);
      y=tabelaPDF(doc,['Código','Data','Auditor','Resultado'],r.auditorias.map(a=>[a.codigo,dataBR(a.data_auditoria),a.auditor_nome,celulaPercentual(a.percentual_geral)]),y);
      y=secaoPDF(doc,'Planos de ação',y);
      tabelaPDF(doc,['Ação','Status','Prioridade','Prazo','Responsável'],r.planos.map(p=>[p.descricao,p.status,p.prioridade,dataBR(p.prazo_conclusao),p.responsavel_nome||'—']),y);
    } else if (r.tipo === 'gerencial') {
      const k=r.dashboard.kpis||{};
      y=textoPDF(doc,`Empresa: ${r.empresa?.nome||'—'}`,14,y);
      y=textoPDF(doc,`Auditorias finalizadas: ${k.totalAuditorias} | Índice atual: ${numero(k.indiceAtual)}% | Média anual: ${numero(k.mediaGeral)}% | Setores: ${k.totalSetores} | Planos pendentes: ${k.planosPendentes}`,14,y+2);
      y=secaoPDF(doc,'Desempenho por senso',y+6);
      y=tabelaPDF(doc,['Senso','Média'],r.dashboard.porSenso.map(s=>[s.nome,celulaPercentual(s.media)]),y);
      y=secaoPDF(doc,'Ranking dos setores',y);
      y=tabelaPDF(doc,['Setor','Resultado'],r.dashboard.porSetor.map(s=>[s.nome,celulaPercentual(s.score)]),y);
      y=secaoPDF(doc,'Auditorias recentes',y);
      tabelaPDF(doc,['Código','Setor','Data','Auditor','Resultado'],r.auditoriasRecentes.map(a=>[a.codigo,a.setor_nome,dataBR(a.data_auditoria),a.auditor_nome,celulaPercentual(a.percentual_geral)]),y);
    } else {
      y=textoPDF(doc,`Período: ${dataBR(r.inicio)} até ${dataBR(r.fim)} | Auditorias: ${r.indicadores.totalAuditorias} | Média: ${numero(r.indicadores.media)}%`,14,y);
      y=secaoPDF(doc,'Resumo mensal',y+6);
      y=tabelaPDF(doc,['Mês','Total','Média','Melhor','Menor'],r.porMes.map(m=>[m.mes,m.total,celulaPercentual(m.media),celulaPercentual(m.melhor),celulaPercentual(m.menor)]),y);
      y=secaoPDF(doc,'Desempenho por setor',y);
      y=tabelaPDF(doc,['Setor','Auditorias','Média'],r.porSetor.map(s=>[s.setor,s.total,celulaPercentual(s.media)]),y);
      y=secaoPDF(doc,'Auditorias do período',y);
      tabelaPDF(doc,['Código','Setor','Data','Auditor','Resultado'],r.auditorias.map(a=>[a.codigo,a.setor_nome,dataBR(a.data_auditoria),a.auditor_nome,celulaPercentual(a.percentual_geral)]),y);
    }
    const pages=doc.getNumberOfPages();
    for(let i=1;i<=pages;i++){
      doc.setPage(i); doc.setFontSize(8); doc.setTextColor(120,130,145);
      doc.text('© 2026 Sensus 5S. Todos os direitos reservados.',14,288);
      doc.text(`Página ${i} de ${pages}`,196,288,{align:'right'});
    }
    return doc;
  }

  function baixarPDF() {
    try { criarPDF().save(arquivoAtual); statusMsg('emailStatus','PDF gerado e baixado com sucesso.','success'); }
    catch(e) { statusMsg('emailStatus',e.message,'error'); }
  }

  async function enviarPDF(event) {
    event.preventDefault();
    const btn=$('enviarPdfBtn'); btn.disabled=true;
    statusMsg('emailStatus','Preparando PDF e enviando...');
    try {
      const doc=criarPDF();
      const dataUri=doc.output('datauristring');
      const base64=dataUri.split(',')[1];
      await api.enviarRelatorio({
        destinatario:$('destinatarioEmail').value.trim(),
        assunto:$('assuntoEmail').value,
        mensagem:$('mensagemEmail').value,
        nomeArquivo:arquivoAtual,
        pdfBase64:base64
      });
      statusMsg('emailStatus','Relatório enviado por e-mail com sucesso.','success');
    } catch(e) {
      statusMsg('emailStatus',e.message || 'Não foi possível enviar o relatório.','error');
    } finally { btn.disabled=false; }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    dataPadrao();
    $('tipoRelatorio').addEventListener('change',atualizarFiltros);
    $('reportForm').addEventListener('submit',gerarPrevia);
    $('baixarPdfBtn').addEventListener('click',baixarPDF);
    $('mostrarEmailBtn').addEventListener('click',()=>{$('emailForm').hidden=!$('emailForm').hidden;});
    $('emailForm').addEventListener('submit',enviarPDF);
    atualizarFiltros();
    await carregarOpcoes();
  });
})();
