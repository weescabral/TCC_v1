const API_URL = 'http://localhost:3000/api';

let graficoEvolucao;
let graficoSensos;
let graficoRadar;
let graficoPlanos;

function obterToken() {
  return localStorage.getItem('sensus_token');
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

  if (valor >= 90) {
    return {
      texto: 'Excelente',
      classe: 'success',
    };
  }

  if (valor >= 75) {
    return {
      texto: 'Bom',
      classe: 'success',
    };
  }

  if (valor >= 60) {
    return {
      texto: 'Regular',
      classe: 'warning',
    };
  }

  if (valor > 0) {
    return {
      texto: 'Crítico',
      classe: 'danger',
    };
  }

  return {
    texto: 'Sem dados',
    classe: 'neutral',
  };
}

async function carregarDashboard() {
  const token = obterToken();

  if (!token) {
    window.location.href = '../index.html';
    return;
  }

  try {
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

    preencherKPIs(dados.kpis);
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

  document.getElementById('indiceAtual').textContent =
    formatarPercentual(kpis.indiceAtual);

  document.getElementById('mediaGeral').textContent =
    formatarPercentual(kpis.mediaGeral);

  document.getElementById('totalAuditorias').textContent =
    Number(kpis.totalAuditorias || 0);

  document.getElementById('totalSetores').textContent =
    Number(kpis.totalSetores || 0);

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
              <span>${formatarPercentual(score)}</span>
            </div>

            <div class="progress-track">
              <div
                class="progress-value"
                style="width: ${Math.min(score, 100)}%"
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