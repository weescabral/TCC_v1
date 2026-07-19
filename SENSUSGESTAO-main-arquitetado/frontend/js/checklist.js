const API_URL = 'http://localhost:3000/api';

const token =
  localStorage.getItem('token')
  || localStorage.getItem('authToken')
  || localStorage.getItem('sensus_token');

if (!token) {
  window.location.href = '../index.html';
}

const elementos = {
  configuracaoAuditoria:
    document.getElementById('configuracaoAuditoria'),

  areaAuditoria:
    document.getElementById('areaAuditoria'),

  resultadoFinal:
    document.getElementById('resultadoFinal'),

  setorId:
    document.getElementById('setorId'),

  observacaoGeral:
    document.getElementById('observacaoGeral'),

  botaoIniciar:
    document.getElementById('botaoIniciar'),

  botaoAnterior:
    document.getElementById('botaoAnterior'),

  botaoSalvar:
    document.getElementById('botaoSalvar'),

  botaoNovaAuditoria:
    document.getElementById('botaoNovaAuditoria'),

  timelineSensos:
    document.getElementById('timelineSensos'),

  textoProgresso:
    document.getElementById('textoProgresso'),

  barraProgresso:
    document.getElementById('barraProgresso'),

  sensoCodigo:
    document.getElementById('sensoCodigo'),

  sensoNome:
    document.getElementById('sensoNome'),

  sensoDescricao:
    document.getElementById('sensoDescricao'),

  etapaAtual:
    document.getElementById('etapaAtual'),

  mensagemChecklist:
    document.getElementById('mensagemChecklist'),

  checklistForm:
    document.getElementById('checklistForm'),

  listaCriterios:
    document.getElementById('listaCriterios'),

  resultadoPercentual:
    document.getElementById('resultadoPercentual'),

  resultadoClassificacao:
    document.getElementById('resultadoClassificacao'),

  carregamento:
    document.getElementById('carregamento')
};

const estado = {
  auditoriaId: null,
  sensos: [],
  etapaAtual: 0,
  etapasConcluidas: new Set(),
  respostasLocais: {}
};

function extrairDados(dados) {
  if (dados?.data !== undefined) {
    return dados.data;
  }

  if (dados?.resultado !== undefined) {
    return dados.resultado;
  }

  return dados;
}

async function requisicao(rota, opcoes = {}) {
  const resposta = await fetch(
    `${API_URL}${rota}`,
    {
      ...opcoes,

      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(opcoes.headers || {})
      }
    }
  );

  let dados = {};

  try {
    dados = await resposta.json();
  } catch (erro) {
    dados = {};
  }

  if (resposta.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('authToken');
    localStorage.removeItem('sensus_token');

    window.location.href = '../index.html';

    throw new Error('Sua sessão expirou.');
  }

  if (!resposta.ok) {
    throw new Error(
      dados.erro
      || dados.mensagem
      || 'Não foi possível concluir a operação.'
    );
  }

  return extrairDados(dados);
}

function mostrarCarregamento() {
  elementos.carregamento.classList.remove('escondido');
}

function esconderCarregamento() {
  elementos.carregamento.classList.add('escondido');
}

function mostrarMensagem(texto, tipo = 'erro') {
  elementos.mensagemChecklist.textContent = texto;

  elementos.mensagemChecklist.className =
    `mensagem-checklist ${tipo}`;
}

function limparMensagem() {
  elementos.mensagemChecklist.textContent = '';

  elementos.mensagemChecklist.className =
    'mensagem-checklist escondido';
}

async function carregarSetores() {
  try {
    const dados = await requisicao('/setores');

    const setores = Array.isArray(dados)
      ? dados
      : dados.setores || [];

    elementos.setorId.innerHTML = `
      <option value="">
        Selecione um setor
      </option>
    `;

    if (setores.length === 0) {
      elementos.setorId.innerHTML = `
        <option value="">
          Nenhum setor cadastrado
        </option>
      `;

      elementos.botaoIniciar.disabled = true;
      return;
    }

    setores.forEach((setor) => {
      const option = document.createElement('option');

      option.value = setor.id;
      option.textContent = setor.nome;

      elementos.setorId.appendChild(option);
    });
  } catch (erro) {
    elementos.setorId.innerHTML = `
      <option value="">
        Erro ao carregar setores
      </option>
    `;

    alert(erro.message);
  }
}

async function carregarSensos() {
  const dados = await requisicao('/sensos');

  estado.sensos = Array.isArray(dados)
    ? dados
    : dados.sensos || [];

  estado.sensos.sort(
    (a, b) => Number(a.ordem) - Number(b.ordem)
  );

  if (estado.sensos.length !== 5) {
    throw new Error(
      'O sistema precisa possuir exatamente cinco sensos cadastrados.'
    );
  }

  renderizarTimeline();
}

function renderizarTimeline() {
  elementos.timelineSensos.innerHTML = '';

  estado.sensos.forEach((senso, indice) => {
    const item = document.createElement('div');

    item.classList.add('step');

    if (indice === estado.etapaAtual) {
      item.classList.add('active');
    }

    if (estado.etapasConcluidas.has(indice)) {
      item.classList.add('completed');
    }

    const concluido =
      estado.etapasConcluidas.has(indice);

    item.innerHTML = `
      <i class="${
        concluido
          ? 'icon-check-circle'
          : 'icon-circle'
      }"></i>

      <div>
        <strong>
          ${senso.codigo}
        </strong>

        <span>
          ${senso.nome}
        </span>
      </div>
    `;

    elementos.timelineSensos.appendChild(item);
  });
}

function descricaoNota(nota) {
  const descricoes = {
    1: 'Não atende',
    2: 'Atende pouco',
    3: 'Regular',
    4: 'Bom',
    5: 'Excelente'
  };

  return descricoes[nota];
}

async function carregarCriteriosDoSenso() {
  limparMensagem();
  mostrarCarregamento();

  try {
    const senso = estado.sensos[estado.etapaAtual];

    elementos.sensoCodigo.textContent =
      senso.codigo || `Senso ${estado.etapaAtual + 1}`;

    elementos.sensoNome.textContent =
      senso.nome;

    elementos.sensoDescricao.textContent =
      senso.descricao
      || 'Avalie todos os critérios relacionados a este senso.';

    elementos.etapaAtual.textContent =
      `Etapa ${estado.etapaAtual + 1} de ${estado.sensos.length}`;

    const dados = await requisicao(
      `/criterios/senso/${senso.id}`
    );

    const criterios = Array.isArray(dados)
      ? dados
      : dados.criterios || [];

    renderizarCriterios(criterios);
    atualizarBotoes();
    atualizarProgresso();
    renderizarTimeline();
  } catch (erro) {
    mostrarMensagem(erro.message);
  } finally {
    esconderCarregamento();
  }
}

function renderizarCriterios(criterios) {
  elementos.listaCriterios.innerHTML = '';

  if (criterios.length === 0) {
    elementos.listaCriterios.innerHTML = `
      <div class="mensagem-checklist erro">
        Nenhum critério ativo foi encontrado para este senso.
      </div>
    `;

    elementos.botaoSalvar.disabled = true;
    return;
  }

  criterios.forEach((criterio, indice) => {
    const respostaSalva =
      estado.respostasLocais[criterio.id] || {};

    const artigo = document.createElement('article');

    artigo.className = 'criterio-checklist';
    artigo.dataset.criterioId = criterio.id;

    const opcoesNotas = [1, 2, 3, 4, 5]
      .map((nota) => {
        const marcado =
          Number(respostaSalva.nota) === nota
            ? 'checked'
            : '';

        return `
          <label class="opcao-nota">
            <input
              type="radio"
              name="criterio-${criterio.id}"
              value="${nota}"
              ${marcado}
            >

            <span>
              <strong>${nota}</strong>
              <small>${descricaoNota(nota)}</small>
            </span>
          </label>
        `;
      })
      .join('');

    artigo.innerHTML = `
      <div class="criterio-titulo">
        <span class="criterio-numero">
          ${indice + 1}
        </span>

        <div>
          <h3>${criterio.titulo}</h3>

          <p>
            ${criterio.objetivo || ''}
          </p>
        </div>
      </div>

      <div class="grade-notas">
        ${opcoesNotas}
      </div>

      <label class="rotulo-observacao">
        Observação
      </label>

      <textarea
        class="form-control observacao-criterio"
        rows="3"
        placeholder="Descreva observações ou não conformidades..."
      >${respostaSalva.observacao || ''}</textarea>
    `;

    elementos.listaCriterios.appendChild(artigo);
  });

  elementos.botaoSalvar.disabled = false;
}

function coletarRespostas() {
  const blocos = [
    ...document.querySelectorAll('.criterio-checklist')
  ];

  const respostas = [];

  for (const bloco of blocos) {
    const criterioId = Number(
      bloco.dataset.criterioId
    );

    const notaSelecionada = bloco.querySelector(
      'input[type="radio"]:checked'
    );

    const observacao = bloco
      .querySelector('.observacao-criterio')
      .value
      .trim();

    if (!notaSelecionada) {
      const titulo = bloco
        .querySelector('h3')
        .textContent
        .trim();

      throw new Error(
        `Selecione uma nota para o critério "${titulo}".`
      );
    }

    const resposta = {
      criterio_id: criterioId,
      nota: Number(notaSelecionada.value),
      observacao
    };

    estado.respostasLocais[criterioId] = {
      nota: resposta.nota,
      observacao: resposta.observacao
    };

    respostas.push(resposta);
  }

  return respostas;
}

async function iniciarAuditoria() {
  const setorId = Number(elementos.setorId.value);

  if (!setorId) {
    alert('Selecione um setor para iniciar a auditoria.');
    return;
  }

  mostrarCarregamento();
  elementos.botaoIniciar.disabled = true;

  try {
    const auditoria = await requisicao(
      '/auditorias',
      {
        method: 'POST',

        body: JSON.stringify({
          setor_id: setorId,

          observacao_geral:
            elementos.observacaoGeral.value.trim()
        })
      }
    );

    estado.auditoriaId =
      auditoria.id
      || auditoria.auditoria?.id;

    if (!estado.auditoriaId) {
      throw new Error(
        'A auditoria foi criada, mas o ID não foi retornado.'
      );
    }

    await carregarSensos();

    elementos.configuracaoAuditoria.classList.add(
      'escondido'
    );

    elementos.areaAuditoria.classList.remove(
      'escondido'
    );

    await carregarCriteriosDoSenso();
  } catch (erro) {
    alert(erro.message);
    elementos.botaoIniciar.disabled = false;
  } finally {
    esconderCarregamento();
  }
}

async function salvarEtapaAtual(evento) {
  evento.preventDefault();

  limparMensagem();

  let respostas;

  try {
    respostas = coletarRespostas();
  } catch (erro) {
    mostrarMensagem(erro.message);
    return;
  }

  mostrarCarregamento();

  elementos.botaoSalvar.disabled = true;
  elementos.botaoAnterior.disabled = true;

  try {
    for (const resposta of respostas) {
      await requisicao(
        `/auditorias/${estado.auditoriaId}/respostas`,
        {
          method: 'POST',
          body: JSON.stringify(resposta)
        }
      );
    }

    estado.etapasConcluidas.add(
      estado.etapaAtual
    );

    atualizarProgresso();
    renderizarTimeline();

    const ultimaEtapa =
      estado.etapaAtual === estado.sensos.length - 1;

    if (ultimaEtapa) {
      await finalizarAuditoria();
      return;
    }

    estado.etapaAtual += 1;

    await carregarCriteriosDoSenso();

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  } catch (erro) {
    mostrarMensagem(erro.message);
  } finally {
    esconderCarregamento();
    atualizarBotoes();
  }
}

async function finalizarAuditoria() {
  const resultado = await requisicao(
    `/auditorias/${estado.auditoriaId}/finalizar`,
    {
      method: 'POST'
    }
  );

  elementos.areaAuditoria.classList.add(
    'escondido'
  );

  elementos.resultadoFinal.classList.remove(
    'escondido'
  );

  const percentual =
    resultado.percentual
    ?? resultado.percentual_geral
    ?? 0;

  elementos.resultadoPercentual.textContent =
    `${Number(percentual).toFixed(2)}%`;

  elementos.resultadoClassificacao.textContent =
    resultado.classificacao || 'Não informada';

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}

function voltarEtapa() {
  if (estado.etapaAtual <= 0) {
    return;
  }

  salvarRespostasLocaisSemValidar();

  estado.etapaAtual -= 1;

  carregarCriteriosDoSenso();

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}

function salvarRespostasLocaisSemValidar() {
  const blocos = [
    ...document.querySelectorAll('.criterio-checklist')
  ];

  blocos.forEach((bloco) => {
    const criterioId = Number(
      bloco.dataset.criterioId
    );

    const notaSelecionada = bloco.querySelector(
      'input[type="radio"]:checked'
    );

    const observacao = bloco
      .querySelector('.observacao-criterio')
      .value
      .trim();

    estado.respostasLocais[criterioId] = {
      nota: notaSelecionada
        ? Number(notaSelecionada.value)
        : null,

      observacao
    };
  });
}

function atualizarBotoes() {
  elementos.botaoAnterior.disabled =
    estado.etapaAtual === 0;

  const ultimaEtapa =
    estado.etapaAtual === estado.sensos.length - 1;

  elementos.botaoSalvar.textContent =
    ultimaEtapa
      ? 'Finalizar Auditoria'
      : 'Salvar e próximo senso';
}

function atualizarProgresso() {
  const concluidas =
    estado.etapasConcluidas.size;

  const total =
    estado.sensos.length || 5;

  const percentual = Math.round(
    (concluidas / total) * 100
  );

  elementos.textoProgresso.textContent =
    `${concluidas} de ${total} sensos`;

  elementos.barraProgresso.style.width =
    `${percentual}%`;
}

function reiniciarAuditoria() {
  estado.auditoriaId = null;
  estado.sensos = [];
  estado.etapaAtual = 0;
  estado.etapasConcluidas.clear();
  estado.respostasLocais = {};

  elementos.setorId.value = '';
  elementos.observacaoGeral.value = '';

  elementos.resultadoFinal.classList.add(
    'escondido'
  );

  elementos.areaAuditoria.classList.add(
    'escondido'
  );

  elementos.configuracaoAuditoria.classList.remove(
    'escondido'
  );

  elementos.botaoIniciar.disabled = false;

  elementos.listaCriterios.innerHTML = '';
  elementos.timelineSensos.innerHTML = '';

  atualizarProgresso();

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}

elementos.botaoIniciar.addEventListener(
  'click',
  iniciarAuditoria
);

elementos.checklistForm.addEventListener(
  'submit',
  salvarEtapaAtual
);

elementos.botaoAnterior.addEventListener(
  'click',
  voltarEtapa
);

elementos.botaoNovaAuditoria.addEventListener(
  'click',
  reiniciarAuditoria
);

carregarSetores();