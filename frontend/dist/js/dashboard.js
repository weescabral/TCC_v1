const API_URL = 'http://localhost:3000/api';

let graficoEvolucao;
let graficoSensos;
let graficoRadar;
let graficoPlanos;
let graficoComparativoSensos;
let dadosDashboardAtual = null;
let setorDashboardSelecionado = null;
let carregamentoDashboardEmAndamento = false;
let perfilDashboardAtual = null;

function obterToken() {
  return localStorage.getItem('sensus_token');
}

function classeDesempenho(valor) {
  const n = Number(valor || 0);
  if (n < 50) return 'performance-critical';
  if (n < 70) return 'performance-low';
  if (n < 85) return 'performance-medium';
  return 'performance-good';
}

function corDesempenho(valor) {
  const n = Number(valor || 0);
  if (n < 50) return '#dc2626';
  if (n < 70) return '#f97316';
  if (n < 85) return '#eab308';
  return '#16a34a';
}

function aplicarBrilhoIndicador(elemento, percentual) {
  const cartao = elemento?.closest('.stat-card');
  if (!cartao) return;
  cartao.classList.remove('glow-critical', 'glow-low', 'glow-medium', 'glow-good');
  const faixa = classeDesempenho(percentual);
  const classes = {
    'performance-critical': 'glow-critical',
    'performance-low': 'glow-low',
    'performance-medium': 'glow-medium',
    'performance-good': 'glow-good',
  };
  cartao.classList.add(classes[faixa] || 'glow-medium');
}

function formatarPercentual(valor) {
  return `${Number(valor || 0).toFixed(1)}%`;
}

function nomeSensoEmPortugues(nome) {
  const chave = String(nome || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  const nomes = {
    seiri: 'Utilização', utilizacao: 'Utilização',
    seiton: 'Organização', organizacao: 'Organização',
    seiso: 'Limpeza', limpeza: 'Limpeza',
    seiketsu: 'Padronização', padronizacao: 'Padronização',
    shitsuke: 'Disciplina', disciplina: 'Disciplina'
  };
  return nomes[chave] || String(nome || 'Senso');
}

function formatarData(data) {
  if (!data) {
    return 'Sem data';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(data));
}

function obterClassificacao(percentual) {
  const valor = Number(percentual || 0);
  if (valor >= 85) return { texto: 'Excelente', classe: 'good' };
  if (valor >= 70) return { texto: 'Regular', classe: 'low' };
  if (valor >= 50) return { texto: 'Atenção', classe: 'attention' };
  if (valor > 0) return { texto: 'Crítico', classe: 'critical' };
  return { texto: 'Sem dados', classe: 'neutral' };
}

function atualizarBadgeStatus(id, percentual, textoPersonalizado = null) {
  const badge = document.getElementById(id);
  if (!badge) return;
  const status = obterClassificacao(percentual);
  badge.className = `status-pill status-${status.classe}`;
  badge.textContent = textoPersonalizado || status.texto;
}

async function verificarPrimeiroAcesso() {
  // Permite abrir o perfil pelo primeiro passo do tutorial sem redirecionar de volta.
  const parametros = new URLSearchParams(window.location.search);
  if (parametros.get('abrirPerfil') === '1') return false;
  const usuario = JSON.parse(localStorage.getItem('sensus_usuario') || '{}');
  if (usuario.perfil !== 'administrador') return;
  try {
    const resposta = await fetch(`${API_URL}/onboarding`, { headers: { Authorization: `Bearer ${obterToken()}` } });
    if (!resposta.ok) return;
    const estado = await resposta.json();
    if (estado.status === 'pendente') {
      window.location.href = './configuracao-inicial.html';
      return true;
    }
    const card = document.getElementById('onboardingResume');
    if (card && estado.status === 'adiado') card.hidden = false;
    return false;
  } catch (erro) {
    console.warn('Não foi possível verificar o primeiro acesso:', erro);
    return false;
  }
}

function aplicarVisibilidadeCardsAdministrativos(perfilAutenticado = null) {
  let perfil = perfilAutenticado || '';
  try {
    if (!perfil) perfil = JSON.parse(localStorage.getItem('sensus_usuario') || '{}').perfil || '';
  } catch (erro) {
    console.warn('Não foi possível identificar o perfil do usuário:', erro);
  }

  const ehAdministrador = perfil === 'administrador';
  document.body.classList.toggle('dashboard-auditor', !ehAdministrador);
  document.querySelectorAll('.admin-only-dashboard').forEach((card) => {
    card.classList.toggle('escondido', !ehAdministrador);
  });
  document.getElementById('dashboardAuditorToolbar')?.classList.toggle('escondido', ehAdministrador);

  return ehAdministrador;
}

async function carregarDashboard(setorId = null) {
  if (carregamentoDashboardEmAndamento) return;
  carregamentoDashboardEmAndamento = true;
  let ehAdministrador = aplicarVisibilidadeCardsAdministrativos(perfilDashboardAtual);
  const temaEscuro = document.documentElement.dataset.theme === 'escuro';
  if (window.Chart) {
    Chart.defaults.color = temaEscuro ? '#cbd5e1' : '#64748b';
    Chart.defaults.borderColor = temaEscuro ? 'rgba(148,163,184,.22)' : 'rgba(100,116,139,.18)';
  }
  const token = obterToken();

  if (!token) {
    window.location.href = '../index.html';
    return;
  }

  try {
    // Verifica o assistente antes de carregar o dashboard.
    // Se for o primeiro acesso, redireciona para a configuração inicial.
    const redirecionandoParaConfiguracao = await verificarPrimeiroAcesso();
    if (redirecionandoParaConfiguracao) return;

    const parametrosDashboard = !ehAdministrador && setorId && setorId !== 'geral'
      ? `?setorId=${encodeURIComponent(setorId)}`
      : '';
    const resposta = await fetch(`${API_URL}/dashboard${parametrosDashboard}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (resposta.status === 401) {
      localStorage.removeItem('sensus_token');
      window.location.href = '../index.html';
      return;
    }

    const dados = await resposta.json();

    if (!resposta.ok) {
      throw new Error(
        dados.erro || 'Não foi possível carregar o Dashboard.'
      );
    }

    dadosDashboardAtual = dados;
    perfilDashboardAtual = dados.perfil || perfilDashboardAtual;
    ehAdministrador = perfilDashboardAtual === 'administrador';
    aplicarVisibilidadeCardsAdministrativos(perfilDashboardAtual);
    if (!ehAdministrador) {
      setorDashboardSelecionado = dados.setorSelecionado ? String(dados.setorSelecionado) : 'geral';
      atualizarSeletorSetoresAuditor(dados);
    }
    window.dashboardSetoresAuditados = Number(dados.setoresAuditados || 0);
    preencherKPIs(dados.kpis);
    if (ehAdministrador) renderizarSetoresPendentes(dados.setoresPendentes || []);
    renderizarEvolucao(dados.evolucao);
    renderizarSensos(dados.porSenso);
    renderizarRadar(dados.porSenso);
    if (ehAdministrador) renderizarRanking(dados.porSetor);
    renderizarPlanos(dados.planos);
    preencherFiltroComparacao(dados.porSetor || []);
    renderizarComparativoSensos(dados.comparativoSensos || [], dados.setoresComparados || 0);
    renderizarHistoricoSetores(dados.evolucao || [], dados.porSetor || []);
    preencherDiagnostico(dados);
    atualizarTextosDashboardPorPerfil(dados, ehAdministrador);
  } catch (erro) {
    console.error('Erro ao carregar Dashboard:', erro);

    document.getElementById('diagnosticoTexto').textContent =
      'Não foi possível atualizar os indicadores neste momento. Verifique sua conexão e tente novamente.';

    document.getElementById('diagnosticoStatus').textContent =
      'Dados temporariamente indisponíveis';

    document.getElementById('diagnosticoStatus').className =
      'warning';
  } finally {
    carregamentoDashboardEmAndamento = false;
  }
}

function atualizarSeletorSetoresAuditor(dados) {
  const toolbar = document.getElementById('dashboardAuditorToolbar');
  const select = document.getElementById('dashboardSetorSelect');
  const descricao = document.getElementById('dashboardAuditorDescricao');
  if (!toolbar || !select) return;
  const setores = dados.meusSetores || [];
  toolbar.classList.remove('escondido');
  if (!setores.length) {
    select.innerHTML = '<option value="geral">Nenhum setor atribuído</option>';
    select.disabled = true;
    if (descricao) descricao.textContent = 'Você ainda não possui setores ativos atribuídos. Solicite ao administrador a vinculação de um setor.';
    return;
  }
  select.disabled = false;
  const opcoes = setores.length > 1
    ? '<option value="geral">Visão consolidada dos meus setores</option>'
    : '';
  select.innerHTML = opcoes + setores.map(setor =>
    `<option value="${Number(setor.id)}">${escaparHtml(setor.nome)}</option>`
  ).join('');
  const valor = dados.setorSelecionado ? String(dados.setorSelecionado) : 'geral';
  if ([...select.options].some(option => option.value === valor)) select.value = valor;
  if (descricao) {
    const setor = setores.find(item => String(item.id) === valor);
    descricao.textContent = setor
      ? `Indicadores, auditorias e planos de ação do setor ${setor.nome}.`
      : `Visão consolidada de ${setores.length} setores sob sua responsabilidade.`;
  }
}

function atualizarTextosDashboardPorPerfil(dados, ehAdministrador) {
  if (ehAdministrador) return;
  const setorSelecionado = (dados.meusSetores || []).find(item => Number(item.id) === Number(dados.setorSelecionado));
  const historicoTitulo = document.querySelector('.dashboard-sector-history .card-heading h3');
  const historicoDescricao = document.querySelector('.dashboard-sector-history .card-heading p');
  if (historicoTitulo) historicoTitulo.textContent = setorSelecionado ? `Histórico de ${setorSelecionado.nome}` : 'Histórico dos meus setores';
  if (historicoDescricao) historicoDescricao.textContent = setorSelecionado
    ? `Acompanhe a trajetória do índice 5S de ${setorSelecionado.nome}.`
    : 'Acompanhe a trajetória do índice 5S dos setores atribuídos a você.';
  const comparacaoTitulo = document.querySelector('.dashboard-comparison-card .card-heading h3');
  const comparacaoDescricao = document.querySelector('.dashboard-comparison-card .card-heading p');
  if (comparacaoTitulo) comparacaoTitulo.textContent = setorSelecionado ? `Evolução dos cinco sensos — ${setorSelecionado.nome}` : 'Evolução dos cinco sensos';
  if (comparacaoDescricao) comparacaoDescricao.textContent = setorSelecionado
    ? 'Compare a auditoria atual com a auditoria anterior deste setor.'
    : 'Compare os resultados dos setores sob sua responsabilidade.';
  const planosTitulo = document.querySelector('.planos-card .card-heading h3');
  const planosDescricao = document.querySelector('.planos-card .card-heading p');
  if (planosTitulo) planosTitulo.textContent = setorSelecionado ? `Planos de ação — ${setorSelecionado.nome}` : 'Planos de ação dos meus setores';
  if (planosDescricao) planosDescricao.textContent = 'Distribuição dos planos por status nos setores atribuídos a você.';

  const descricoes = document.querySelectorAll('.dashboard-kpis .stat-card p');
  if (descricoes[0]) descricoes[0].textContent = setorSelecionado
    ? 'Resultado da auditoria finalizada mais recente deste setor.'
    : 'Média dos resultados mais recentes dos setores sob sua responsabilidade.';
  if (descricoes[1]) descricoes[1].textContent = setorSelecionado
    ? 'Média das auditorias finalizadas neste setor no ano.'
    : 'Média das auditorias finalizadas no ano nos seus setores.';
  if (descricoes[3]) descricoes[3].textContent = 'Setores atribuídos que já possuem auditoria finalizada.';
  if (descricoes[4]) descricoes[4].textContent = setorSelecionado
    ? 'Ciclos concluídos neste setor.'
    : 'Ciclos concluídos nos seus setores.';
  if (descricoes[5]) descricoes[5].textContent = 'Ações que exigem acompanhamento nos seus setores.';
  const diagnosticoLabel = document.querySelector('.dashboard-alert .diagnostico-label small');
  if (diagnosticoLabel) diagnosticoLabel.textContent = setorSelecionado ? 'Diagnóstico do Setor' : 'Diagnóstico dos Meus Setores';
}

function preencherKPIs(kpis = {}) {
  const indiceElemento = document.getElementById('indiceAtual');
  indiceElemento.textContent = formatarPercentual(kpis.indiceAtual);
  indiceElemento.className = classeDesempenho(kpis.indiceAtual);
  aplicarBrilhoIndicador(indiceElemento, kpis.indiceAtual);
  atualizarBadgeStatus('badgeIndiceAtual', kpis.indiceAtual);

  const mediaElemento = document.getElementById('mediaGeral');
  mediaElemento.textContent = formatarPercentual(kpis.mediaGeral);
  mediaElemento.className = classeDesempenho(kpis.mediaGeral);
  aplicarBrilhoIndicador(mediaElemento, kpis.mediaGeral);
  atualizarBadgeStatus('badgeMediaGeral', kpis.mediaGeral);

  document.getElementById('totalAuditorias').textContent =
    Number(kpis.totalAuditorias || 0);

  const totalSetores = Number(kpis.totalSetores || 0);
  const setoresAuditados = Number(window.dashboardSetoresAuditados || 0);
  document.getElementById('coberturaSetores').textContent =
    `${setoresAuditados}/${totalSetores}`;
  const coberturaCompleta = totalSetores > 0 && setoresAuditados >= totalSetores;
  atualizarBadgeStatus('badgeCobertura', coberturaCompleta ? 100 : (totalSetores ? setoresAuditados / totalSetores * 100 : 0),
    coberturaCompleta ? 'Completa' : (setoresAuditados > 0 ? 'Parcial' : 'Sem cobertura'));

  document.getElementById('planosPendentes').textContent =
    Number(kpis.planosPendentes || 0);

  const melhorElemento = document.getElementById('melhorScore');
  melhorElemento.textContent = formatarPercentual(kpis.melhorScore);
  melhorElemento.className = classeDesempenho(kpis.melhorScore);
  aplicarBrilhoIndicador(melhorElemento, kpis.melhorScore);
  atualizarBadgeStatus('badgeMelhorScore', kpis.melhorScore);

  const piorElemento = document.getElementById('piorScoreTexto');
  piorElemento.textContent = `Pior resultado: ${formatarPercentual(kpis.piorScore)}`;
  piorElemento.className = classeDesempenho(kpis.piorScore);
  atualizarBadgeStatus('badgePiorScore', kpis.piorScore);

}

function renderizarEvolucao(evolucao = []) {
  const contexto = document
    .getElementById('graficoEvolucao')
    .getContext('2d');

  if (graficoEvolucao) {
    graficoEvolucao.destroy();
  }

  graficoEvolucao = new Chart(contexto, {
    type: 'line',
    data: {
      labels: evolucao.map((item) => formatarData(item.data)),
      datasets: [
        {
          label: 'Índice geral',
          data: evolucao.map((item) => Number(item.score || 0)),
          borderWidth: 3,
          borderColor: '#38bdf8',
          tension: 0.35,
          fill: true,
          segment: {
            borderColor: '#38bdf8',
          },
          pointBackgroundColor: (ctx) => corDesempenho(ctx.parsed?.y ?? ctx.raw ?? 0),
          pointBorderColor: document.documentElement.dataset.theme === 'escuro' ? '#182437' : '#ffffff',
          pointBorderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: {
            callback(value) {
              return `${value}%`;
            },
          },
        },
      },
      plugins: {
        tooltip: {
          callbacks: {
            afterLabel(context) {
              const item = evolucao[context.dataIndex];

              return item?.setor
                ? `Setor: ${item.setor}`
                : '';
            },
          },
        },
      },
    },
  });
}

function renderizarSensos(porSenso = []) {
  const contexto = document
    .getElementById('graficoSensos')
    .getContext('2d');

  if (graficoSensos) {
    graficoSensos.destroy();
  }

  graficoSensos = new Chart(contexto, {
    type: 'bar',
    data: {
      labels: porSenso.map((item) => nomeSensoEmPortugues(item.senso)),
      datasets: [
        {
          label: 'Média',
          data: porSenso.map((item) => Number(item.media || 0)),
          borderWidth: 1,
          borderRadius: 8,
          backgroundColor: porSenso.map(item => corDesempenho(item.media)),
          borderColor: porSenso.map(item => corDesempenho(item.media)),
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      scales: {
        x: {
          beginAtZero: true,
          max: 100,
          ticks: {
            callback(value) {
              return `${value}%`;
            },
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
      },
    },
  });
}

function renderizarRadar(porSenso = []) {
  const contexto = document
    .getElementById('graficoRadar')
    .getContext('2d');

  if (graficoRadar) {
    graficoRadar.destroy();
  }

  graficoRadar = new Chart(contexto, {
    type: 'radar',
    data: {
      labels: porSenso.map((item) => nomeSensoEmPortugues(item.senso)),
      datasets: [
        {
          label: 'Resultado 5S',
          data: porSenso.map((item) => Number(item.media || 0)),
          borderWidth: 2,
          fill: true,
          borderColor: '#38bdf8',
          backgroundColor: 'rgba(56, 189, 248, 0.16)',
          pointBackgroundColor: porSenso.map(item => corDesempenho(item.media)),
          pointBorderColor: '#ffffff',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          beginAtZero: true,
          max: 100,
          angleLines: { color: document.documentElement.dataset.theme === 'escuro' ? 'rgba(148,163,184,.62)' : 'rgba(100,116,139,.18)' },
          grid: { color: document.documentElement.dataset.theme === 'escuro' ? 'rgba(148,163,184,.58)' : 'rgba(100,116,139,.18)' },
          pointLabels: { color: document.documentElement.dataset.theme === 'escuro' ? '#cbd5e1' : '#64748b', font: { weight: '600' } },
          ticks: {
            stepSize: 20,
            color: document.documentElement.dataset.theme === 'escuro' ? '#cbd5e1' : '#64748b',
            backdropColor: 'transparent',
            showLabelBackdrop: false,
          },
        },
      },
    },
  });
}

function renderizarRanking(setores = []) {
  const container = document.getElementById('rankingSetores');

  if (!setores.length) {
    container.innerHTML = `
      <p class="empty-state">
        Nenhum setor encontrado.
      </p>
    `;
    return;
  }

  container.innerHTML = setores
    .map((setor, indice) => {
      const score = Number(setor.score || 0);

      return `
        <div class="ranking-item">
          <div class="ranking-position">
            ${indice + 1}
          </div>

          <div class="ranking-content">
            <div class="ranking-header">
              <strong>${setor.nome}</strong>
              <span class="${classeDesempenho(score)}">${formatarPercentual(score)}</span>
            </div>

            <div class="progress-track">
              <div
                class="progress-value ${classeDesempenho(score)}"
                style="width: ${Math.max(0, Math.min(score, 100))}%"
              ></div>
            </div>
          </div>
        </div>
      `;
    })
    .join('');
}

function renderizarPlanos(planos = []) {
  const contexto = document
    .getElementById('graficoPlanos')
    .getContext('2d');

  if (graficoPlanos) {
    graficoPlanos.destroy();
  }

  graficoPlanos = new Chart(contexto, {
    type: 'doughnut',
    data: {
      labels: planos.map((item) => item.status),
      datasets: [
        {
          data: planos.map((item) => Number(item.total || 0)),
          backgroundColor: planos.map((item) => {
            const status = String(item.status || '').toLowerCase();
            if (status.includes('conclu') || status.includes('finaliz')) return '#16a34a';
            if (status.includes('andamento') || status.includes('execu')) return '#eab308';
            if (status.includes('pend') || status.includes('atras')) return '#dc2626';
            return '#64748b';
          }),
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: document.documentElement.dataset.theme === 'escuro' ? '#cbd5e1' : '#64748b' },
        },
      },
    },
  });
}

function renderizarSetoresPendentes(setores = []) {
  const container = document.getElementById('setoresPendentes');

  if (!setores.length) {
    container.innerHTML = '<p class="empty-state">Nenhum setor pendente de auditoria.</p>';
    return;
  }

  container.innerHTML = setores.map((setor) => {
    const data = setor.proxima_auditoria
      ? formatarData(setor.proxima_auditoria)
      : 'Nunca auditado';

    return `
      <div class="ranking-item">
        <div class="ranking-content">
          <div class="ranking-header">
            <strong>${setor.nome}</strong>
            <span>${data}</span>
          </div>
          <small>Auditor: ${setor.auditor_nome || 'Não definido'} • Periodicidade: ${setor.periodicidade_auditoria || 'mensal'}</small>
        </div>
      </div>
    `;
  }).join('');
}


function preencherFiltroComparacao(setores = []) {
  const select = document.getElementById('filtroComparacaoSetor');
  if (!select) return;
  const valorAtual = select.value || 'geral';
  const perfilAtual = perfilDashboardAtual || JSON.parse(localStorage.getItem('sensus_usuario') || '{}').perfil;
  const opcaoGeral = perfilAtual === 'auditor' ? 'Todos os meus setores — visão consolidada' : 'Todos os setores ativos — visão geral';
  select.innerHTML = `<option value="geral">${opcaoGeral}</option>` +
    setores.map(setor => `<option value="${Number(setor.id)}">${escaparHtml(setor.nome)}</option>`).join('');
  if ([...select.options].some(option => option.value === valorAtual)) select.value = valorAtual;
}

function renderizarGraficoComparativo(itens = []) {
  const canvas = document.getElementById('graficoComparativoSensos');
  if (!canvas || !window.Chart) return;
  if (graficoComparativoSensos) graficoComparativoSensos.destroy();
  const cores = valores => valores.map(corDesempenho);
  graficoComparativoSensos = new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels: itens.map(item => nomeSensoEmPortugues(item.nome || item.senso)),
      datasets: [
        { label: 'Auditoria anterior', data: itens.map(item => item.anterior == null ? null : Number(item.anterior)),
          backgroundColor: '#8290a3', borderRadius: 6, barThickness: 14 },
        { label: 'Auditoria atual', data: itens.map(item => Number(item.atual || 0)),
          backgroundColor: cores(itens.map(item => item.atual)), borderRadius: 6, barThickness: 14 }
      ]
    },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      scales: {
        x: { min: 0, max: 100, ticks: { callback: value => `${value}%` }, grid: { color: 'rgba(148,163,184,.14)' } },
        y: { grid: { color: 'rgba(148,163,184,.12)' } }
      },
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${Number(ctx.raw || 0).toFixed(1)}%` } } }
    }
  });
}

function renderizarComparativoSensos(itens = [], quantidadeSetores = 0) {
  const corpo = document.getElementById('comparativoSensos');
  const contador = document.getElementById('setoresComparados');
  if (!corpo) return;
  if (contador) contador.textContent = `${Number(quantidadeSetores)} setor(es) comparado(s)`;

  renderizarGraficoComparativo(itens);
  if (!itens.length) {
    corpo.innerHTML = '<tr><td colspan="4" class="empty-state">Ainda não há setores com duas auditorias finalizadas para comparar.</td></tr>';
    return;
  }

  corpo.innerHTML = itens.map(item => {
    const variacao = Number(item.variacao || 0);
    const sinal = variacao > 0.05 ? '+' : '';
    const classe = variacao > 0.05 ? 'trend-up' : variacao < -0.05 ? 'trend-down' : 'trend-flat';
    const icone = variacao > 0.05 ? '↑' : variacao < -0.05 ? '↓' : '—';
    return `<tr>
      <td><strong>${escaparHtml(nomeSensoEmPortugues(item.nome || item.senso))}</strong></td>
      <td>${item.anterior == null ? '—' : `<strong class="comparison-previous-value">${formatarPercentual(item.anterior)}</strong>`}</td>
      <td><strong class="${classeDesempenho(item.atual)}">${formatarPercentual(item.atual)}</strong></td>
      <td><span class="comparison-trend ${classe}">${icone} ${sinal}${variacao.toFixed(1)} p.p.</span></td>
    </tr>`;
  }).join('');
}

async function atualizarComparacaoSetor(setorId) {
  if (!setorId || setorId === 'geral') {
    const dados = dadosDashboardAtual || {};
    renderizarComparativoSensos(dados.comparativoSensos || [], dados.setoresComparados || 0);
    return;
  }
  const token = obterToken();
  const resposta = await fetch(`${API_URL}/setores/${encodeURIComponent(setorId)}/historico`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const dados = await resposta.json();
  if (!resposta.ok) throw new Error(dados.erro || 'Não foi possível carregar a comparação do setor.');
  const auditorias = dados.auditorias || [];
  const sensos = dados.sensos || [];
  const atual = auditorias[auditorias.length - 1];
  const anterior = auditorias[auditorias.length - 2];
  const mapaAtual = new Map(sensos.filter(item => Number(item.auditoria_id) === Number(atual?.id)).map(item => [item.nome, Number(item.media || 0)]));
  const mapaAnterior = new Map(sensos.filter(item => Number(item.auditoria_id) === Number(anterior?.id)).map(item => [item.nome, Number(item.media || 0)]));
  const itens = [...mapaAtual.entries()].map(([nome, valor]) => ({
    nome, atual: valor, anterior: mapaAnterior.has(nome) ? mapaAnterior.get(nome) : null,
    variacao: mapaAnterior.has(nome) ? valor - mapaAnterior.get(nome) : 0
  }));
  const contador = document.getElementById('setoresComparados');
  if (contador) contador.textContent = `${dados.setor?.nome || 'Setor selecionado'} · 1 setor`;
  renderizarComparativoSensos(itens, 1);
}

function escaparHtml(valor) {
  return String(valor ?? '').replace(/[&<>"']/g, caractere => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  })[caractere]);
}

function renderizarHistoricoSetores(evolucao = [], setores = []) {
  const container = document.getElementById('historicoSetores');
  if (!container) return;
  if (!setores.length) {
    container.innerHTML = '<p class="empty-state">Cadastre setores e finalize auditorias para visualizar a evolução.</p>';
    return;
  }

  const porSetor = new Map();
  evolucao.forEach(item => {
    const nome = item.setor || 'Setor';
    if (!porSetor.has(nome)) porSetor.set(nome, []);
    porSetor.get(nome).push(item);
  });

  container.innerHTML = setores.map(setor => {
    const historico = (porSetor.get(setor.nome) || []).sort((a,b) => new Date(a.data) - new Date(b.data));
    const ultimo = Number(setor.score || 0);
    const anterior = historico.length > 1 ? Number(historico[historico.length - 2].score || 0) : null;
    const delta = anterior === null ? null : ultimo - anterior;
    const evolucaoTexto = delta === null ? 'Primeira auditoria registrada' :
      `${delta > 0 ? '+' : ''}${delta.toFixed(1)} p.p. em relação à anterior`;
    return `<article class="sector-history-item">
      <div class="sector-history-heading"><strong>${escaparHtml(setor.nome)}</strong><span class="${classeDesempenho(ultimo)}">${formatarPercentual(ultimo)}</span></div>
      <div class="progress-track"><div class="progress-value ${classeDesempenho(ultimo)}" style="width:${Math.max(0,Math.min(ultimo,100))}%"></div></div>
      <small>${evolucaoTexto}</small>
      <small>${historico.length} auditoria(s) finalizada(s)</small>
    </article>`;
  }).join('');
}

function preencherDiagnostico(dados) {
  const indice = Number(dados.kpis?.indiceAtual || 0);
  const pendentes = Number(dados.kpis?.planosPendentes || 0);
  const classificacao = obterClassificacao(indice);

  const texto = document.getElementById('diagnosticoTexto');
  const status = document.getElementById('diagnosticoStatus');

  const cardDiagnostico = texto.closest('.alert-card');
  if (!dados.kpis?.totalAuditorias) {
    cardDiagnostico?.classList.add('diagnostico-sem-dados');
    texto.textContent =
      'Assim que as primeiras auditorias forem concluídas, seus indicadores, resultados e recomendações aparecerão aqui. Comece realizando uma auditoria para acompanhar a evolução da sua empresa.';

    status.textContent = 'Aguardando primeiras auditorias';
    status.className = 'neutral';
    return;
  }

  cardDiagnostico?.classList.remove('diagnostico-sem-dados');
  if (indice < 60) {
    texto.textContent =
      `O índice atual é ${formatarPercentual(indice)}. ` +
      'Existem não conformidades que exigem atenção imediata.';
  } else if (pendentes > 0) {
    texto.textContent =
      `O índice atual é ${formatarPercentual(indice)}, ` +
      `mas existem ${pendentes} plano(s) de ação pendente(s).`;
  } else {
    texto.textContent =
      `O índice atual é ${formatarPercentual(indice)} ` +
      'e não existem planos de ação pendentes.';
  }

  status.textContent = classificacao.texto;
  status.className = classificacao.classe;
}


function atualizarCoresGraficos() {
  if (!window.Chart) return;
  const escuro = document.documentElement.dataset.theme === 'escuro';
  const texto = escuro ? '#cbd5e1' : '#64748b';
  const grade = escuro ? 'rgba(148,163,184,.22)' : 'rgba(100,116,139,.18)';
  Chart.defaults.color = texto;
  Chart.defaults.borderColor = grade;
  [graficoEvolucao, graficoSensos, graficoRadar, graficoPlanos, graficoComparativoSensos].filter(Boolean).forEach(grafico => {
    if (grafico.options.scales) {
      Object.values(grafico.options.scales).forEach(eixo => {
        if (eixo.ticks) eixo.ticks.color = texto;
        if (eixo.grid) eixo.grid.color = grade;
        if (eixo.pointLabels) eixo.pointLabels.color = texto;
        if (eixo.angleLines) eixo.angleLines.color = grade;
        if (eixo.ticks && grafico.config.type === 'radar') {
          eixo.ticks.backdropColor = 'transparent';
          eixo.ticks.showLabelBackdrop = false;
        }
      });
    }
    if (grafico.options.plugins?.legend?.labels) grafico.options.plugins.legend.labels.color = texto;

    // Mantém a identidade visual do radar ao alternar entre os temas.
    if (grafico === graficoRadar && grafico.data.datasets[0]) {
      grafico.data.datasets[0].borderColor = '#38bdf8';
      grafico.data.datasets[0].backgroundColor = 'rgba(56, 189, 248, 0.16)';
      grafico.data.datasets[0].pointBorderColor = escuro ? '#182437' : '#ffffff';
    }

    grafico.update('none');
  });
}
window.addEventListener('sensus:tema-alterado', atualizarCoresGraficos);

document.getElementById('filtroComparacaoSetor')?.addEventListener('change', async event => {
  try { await atualizarComparacaoSetor(event.target.value); }
  catch (erro) { console.error(erro); }
});

document.getElementById('dashboardSetorSelect')?.addEventListener('change', event => {
  setorDashboardSelecionado = event.target.value;
  carregarDashboard(setorDashboardSelecionado === 'geral' ? null : setorDashboardSelecionado);
});

document.addEventListener('DOMContentLoaded', () => carregarDashboard());