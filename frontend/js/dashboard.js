const API_URL = 'http://localhost:3000/api';

let graficoEvolucao;
let graficoSensos;
let graficoRadar;
let graficoPlanos;

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

function formatarPercentual(valor) {
  return `${Number(valor || 0).toFixed(1)}%`;
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
  if (valor >= 85) return { texto: 'Excelente', classe: 'success' };
  if (valor >= 70) return { texto: 'Regular', classe: 'warning' };
  if (valor >= 50) return { texto: 'Atenção', classe: 'warning' };
  if (valor > 0) return { texto: 'Crítico', classe: 'danger' };
  return { texto: 'Sem dados', classe: 'neutral' };
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

async function carregarDashboard() {
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

    const resposta = await fetch(`${API_URL}/dashboard`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
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

    window.dashboardSetoresAuditados = Number(dados.setoresAuditados || 0);
    preencherKPIs(dados.kpis);
    renderizarSetoresPendentes(dados.setoresPendentes || []);
    renderizarEvolucao(dados.evolucao);
    renderizarSensos(dados.porSenso);
    renderizarRadar(dados.porSenso);
    renderizarRanking(dados.porSetor);
    renderizarPlanos(dados.planos);
    preencherDiagnostico(dados);
  } catch (erro) {
    console.error('Erro ao carregar Dashboard:', erro);

    document.getElementById('diagnosticoTexto').textContent =
      erro.message;

    document.getElementById('diagnosticoStatus').textContent =
      'Erro ao carregar dados';

    document.getElementById('diagnosticoStatus').className =
      'danger';
  }
}

function preencherKPIs(kpis = {}) {
  const classificacao = obterClassificacao(kpis.indiceAtual);

  const indiceElemento = document.getElementById('indiceAtual');
  indiceElemento.textContent = formatarPercentual(kpis.indiceAtual);
  indiceElemento.className = classeDesempenho(kpis.indiceAtual);

  const mediaElemento = document.getElementById('mediaGeral');
  mediaElemento.textContent = formatarPercentual(kpis.mediaGeral);
  mediaElemento.className = classeDesempenho(kpis.mediaGeral);

  document.getElementById('totalAuditorias').textContent =
    Number(kpis.totalAuditorias || 0);

  const totalSetores = Number(kpis.totalSetores || 0);
  const setoresAuditados = Number(window.dashboardSetoresAuditados || 0);
  document.getElementById('coberturaSetores').textContent =
    `${setoresAuditados}/${totalSetores}`;

  document.getElementById('planosPendentes').textContent =
    Number(kpis.planosPendentes || 0);

  document.getElementById('melhorScore').textContent =
    formatarPercentual(kpis.melhorScore);

  document.getElementById('piorScoreTexto').textContent =
    `Pior resultado: ${formatarPercentual(kpis.piorScore)}`;

  const classificacaoAtual =
    document.getElementById('classificacaoAtual');

  classificacaoAtual.textContent = classificacao.texto;
  classificacaoAtual.className = classificacao.classe;
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
          tension: 0.35,
          fill: true,
          segment: {
            borderColor: (ctx) => corDesempenho((Number(ctx.p0.parsed.y) + Number(ctx.p1.parsed.y)) / 2)
          },
          pointBackgroundColor: (ctx) => corDesempenho(ctx.parsed.y),
          pointBorderColor: '#ffffff',
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
      labels: porSenso.map((item) => item.senso),
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
      labels: porSenso.map((item) => item.senso),
      datasets: [
        {
          label: 'Resultado 5S',
          data: porSenso.map((item) => Number(item.media || 0)),
          borderWidth: 2,
          fill: true,
          borderColor: '#0b2a52',
          backgroundColor: 'rgba(11, 42, 82, 0.10)',
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
          ticks: {
            stepSize: 20,
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

function preencherDiagnostico(dados) {
  const indice = Number(dados.kpis?.indiceAtual || 0);
  const pendentes = Number(dados.kpis?.planosPendentes || 0);
  const classificacao = obterClassificacao(indice);

  const texto = document.getElementById('diagnosticoTexto');
  const status = document.getElementById('diagnosticoStatus');

  if (!dados.kpis?.totalAuditorias) {
    texto.textContent =
      'Finalize uma auditoria para gerar indicadores executivos.';

    status.textContent = 'Aguardando auditoria';
    status.className = 'neutral';
    return;
  }

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

document.addEventListener('DOMContentLoaded', carregarDashboard);