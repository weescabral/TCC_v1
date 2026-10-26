const API_URL = 'http://localhost:3000/api';
const STORAGE_KEY = 'sensus_auditoria_em_andamento';

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

  tipoAuditoria:
    document.getElementById('tipoAuditoria'),

  motivoExtraordinaria:
    document.getElementById('motivoExtraordinaria'),

  campoMotivoExtraordinaria:
    document.getElementById('campoMotivoExtraordinaria'),

  dataAuditoria:
    document.getElementById('dataAuditoria'),

  prazoAuditoria:
    document.getElementById('prazoAuditoria'),

  notificarAuditoria:
    document.getElementById('notificarAuditoria'),

  setorDescricaoTitulo:
    document.getElementById('setorDescricaoTitulo'),

  setorDescricaoAuditoria:
    document.getElementById('setorDescricaoAuditoria'),

  auditoriaSetorTitulo:
    document.getElementById('auditoriaSetorTitulo'),

  auditoriaSetorDescricao:
    document.getElementById('auditoriaSetorDescricao'),

  auditoriaSetorAuditor:
    document.getElementById('auditoriaSetorAuditor'),

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

  resultadoDuracao:
    document.getElementById('resultadoDuracao'),

  carregamento:
    document.getElementById('carregamento')
};

const estado = {
  auditoriaId: null,
  sensos: [],
  etapaAtual: 0,
  etapasConcluidas: new Set(),
  respostasLocais: {},
  setores: [],
  evidenciasPendentes: {},
  auditoriaFinalizada: false,
  salvandoEtapa: false,
  permitirSaida: false,
  auditoriaResumo: null
};

function limparEstadoAuditoria() {
  sessionStorage.removeItem(STORAGE_KEY);
}

function salvarEstadoAuditoria() {
  if (!estado.auditoriaId || estado.auditoriaFinalizada) return;

  const snapshot = {
    auditoriaId: estado.auditoriaId,
    etapaAtual: estado.etapaAtual,
    etapasConcluidas: [...estado.etapasConcluidas],
    respostasLocais: estado.respostasLocais,
    setorId: elementos.setorId.value,
    tipoAuditoria: elementos.tipoAuditoria.value,
    motivoExtraordinaria: elementos.motivoExtraordinaria.value,
    dataAuditoria: elementos.dataAuditoria.value,
    prazoAuditoria: elementos.prazoAuditoria.value,
    notificarAuditoria: elementos.notificarAuditoria.value,
    observacaoGeral: elementos.observacaoGeral.value,
    auditoriaResumo: estado.auditoriaResumo
  };

  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

async function restaurarAuditoriaEmAndamento() {
  const salvo = sessionStorage.getItem(STORAGE_KEY);
  if (!salvo) return false;

  try {
    const snapshot = JSON.parse(salvo);
    if (!snapshot?.auditoriaId) {
      limparEstadoAuditoria();
      return false;
    }

    const auditoria = await requisicao(`/auditorias/${snapshot.auditoriaId}`);
    const dadosAuditoria = auditoria?.auditoria || auditoria;

    if (!dadosAuditoria || ['finalizada', 'concluida', 'cancelada'].includes(String(dadosAuditoria.status || '').toLowerCase())) {
      limparEstadoAuditoria();
      return false;
    }

    estado.auditoriaId = snapshot.auditoriaId;
    estado.etapaAtual = Number(snapshot.etapaAtual) || 0;
    estado.etapasConcluidas = new Set((snapshot.etapasConcluidas || []).map(Number));
    estado.respostasLocais = snapshot.respostasLocais || {};
    estado.auditoriaResumo = snapshot.auditoriaResumo || dadosAuditoria;
    estado.auditoriaFinalizada = false;

    elementos.setorId.value = snapshot.setorId || dadosAuditoria.setor_id || '';
    elementos.tipoAuditoria.value = snapshot.tipoAuditoria || dadosAuditoria.tipo || 'periodica';
    elementos.motivoExtraordinaria.value = snapshot.motivoExtraordinaria || dadosAuditoria.motivo_extraordinaria || '';
    elementos.dataAuditoria.value = snapshot.dataAuditoria || dadosAuditoria.data_auditoria || elementos.dataAuditoria.value;
    elementos.prazoAuditoria.value = snapshot.prazoAuditoria || dadosAuditoria.prazo || '';
    elementos.notificarAuditoria.value = snapshot.notificarAuditoria || dadosAuditoria.notificar_em || '';
    elementos.observacaoGeral.value = snapshot.observacaoGeral || dadosAuditoria.observacao_geral || '';

    const extraordinaria = elementos.tipoAuditoria.value === 'extraordinaria';
    elementos.campoMotivoExtraordinaria.classList.toggle('escondido', !extraordinaria);
    elementos.motivoExtraordinaria.required = extraordinaria;

    await carregarSensos();

    if (estado.etapaAtual < 0 || estado.etapaAtual >= estado.sensos.length) {
      estado.etapaAtual = 0;
    }

    elementos.configuracaoAuditoria.classList.add('escondido');
    elementos.areaAuditoria.classList.remove('escondido');
    elementos.resultadoFinal.classList.add('escondido');
    elementos.botaoIniciar.disabled = true;

    await carregarCriteriosDoSenso();
    mostrarMensagem('Auditoria em andamento restaurada. Você pode continuar de onde parou.', 'sucesso');
    return true;
  } catch (erro) {
    console.warn('Não foi possível restaurar a auditoria em andamento:', erro);
    limparEstadoAuditoria();
    return false;
  }
}

function configurarAvisoSaidaDuranteAuditoria() {
  const avisarSaida = (evento) => {
    if (!estado.auditoriaId || estado.auditoriaFinalizada || estado.permitirSaida) return;

    const link = evento.currentTarget;
    if (!link || !link.closest('.sidebar-menu')) return;

    const confirmar = window.confirm(
      '⚠️ A auditoria está em andamento. Se você sair pela barra lateral antes de finalizar, esta auditoria será abandonada e você terá que refazê-la.\n\nDeseja sair mesmo assim?'
    );

    if (!confirmar) {
      evento.preventDefault();
      return;
    }

    limparEstadoAuditoria();
    estado.permitirSaida = true;
  };

  document.querySelectorAll('.sidebar-menu a').forEach((link) => {
    // Não exibimos o aviso ao clicar novamente na própria página de Auditoria.
    try {
      const destino = new URL(link.href, window.location.href);
      const mesmaPagina = destino.pathname === window.location.pathname;
      if (mesmaPagina) return;
    } catch (_) {
      // Se não for possível interpretar o link, mantemos a proteção.
    }

    if (link.dataset.avisoAuditoria === 'true') return;
    link.dataset.avisoAuditoria = 'true';
    link.addEventListener('click', avisarSaida);
  });

}


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

function formatarDataLocal(data) {
  const valor = data instanceof Date ? data : new Date(data);
  const pad = (numero) => String(numero).padStart(2, '0');
  return `${valor.getFullYear()}-${pad(valor.getMonth() + 1)}-${pad(valor.getDate())}T${pad(valor.getHours())}:${pad(valor.getMinutes())}`;
}

function configurarDatasPadrao() {
  const agora = new Date();
  const prazo = new Date(agora.getTime() + 7 * 24 * 60 * 60 * 1000);
  const aviso = new Date(prazo.getTime() - 24 * 60 * 60 * 1000);

  elementos.dataAuditoria.value = formatarDataLocal(agora);
  elementos.prazoAuditoria.value = formatarDataLocal(prazo);
  elementos.notificarAuditoria.value = formatarDataLocal(aviso);
}

function atualizarInformacoesSetor() {
  const setor = estado.setores.find(
    (item) => Number(item.id) === Number(elementos.setorId.value)
  );

  if (!setor) {
    elementos.setorDescricaoTitulo.textContent = 'Selecione um setor';
    elementos.setorDescricaoAuditoria.textContent = 'A descrição do setor e o auditor responsável aparecerão aqui.';
    return;
  }

  elementos.setorDescricaoTitulo.textContent = setor.nome;
  elementos.setorDescricaoAuditoria.textContent = setor.descricao || 'Sem descrição cadastrada.';
  elementos.auditoriaSetorTitulo.textContent = setor.nome;
  elementos.auditoriaSetorDescricao.textContent = setor.descricao || 'Sem descrição cadastrada.';
  elementos.auditoriaSetorAuditor.textContent = `Auditor responsável: ${setor.auditor_nome || 'Não definido'} • Periodicidade: ${setor.periodicidade_auditoria || 'mensal'}`;
}

async function carregarSetores() {
  try {
    const dados = await requisicao('/setores');

    const setores = Array.isArray(dados)
      ? dados
      : dados.setores || [];

    estado.setores = setores;

    elementos.setorId.innerHTML = `
      <option value="">
        Selecione um setor
      </option>
    `;

    setores.forEach((setor) => {
      const option = document.createElement('option');
      option.value = setor.id;
      option.textContent = `${setor.nome}${setor.auditor_id ? '' : ' — sem auditor responsável'}`;
      option.disabled = !setor.auditor_id;
      elementos.setorId.appendChild(option);
    });

    const setorUrl = new URLSearchParams(window.location.search).get('setor');
    if (setorUrl && setores.some((setor) => Number(setor.id) === Number(setorUrl) && setor.auditor_id)) {
      elementos.setorId.value = setorUrl;
    }

    atualizarInformacoesSetor();

    if (!setores.some((setor) => setor.auditor_id)) {
      elementos.setorId.innerHTML = '<option value="">Nenhum setor com auditor responsável</option>';
      elementos.botaoIniciar.disabled = true;
    }
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

      <div class="evidencia-criterio" style="margin-top:12px; padding:12px; border:1px dashed #cbd5e1; border-radius:10px; background:#f8fafc;">
        <label class="rotulo-observacao" for="evidencia-${criterio.id}">Evidência (opcional)</label>
        <input
          id="evidencia-${criterio.id}"
          class="form-control arquivo-evidencia"
          type="file"
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
        >
        <input
          class="form-control descricao-evidencia"
          type="text"
          placeholder="Descrição da evidência (opcional)"
          style="margin-top:8px;"
        >
        <small class="texto-secundario">Máximo de 10 MB. Formatos: imagem, PDF, Word ou Excel.</small>
      </div>
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

elementos.setorId.addEventListener('change', atualizarInformacoesSetor);

elementos.tipoAuditoria.addEventListener('change', () => {
  const extraordinaria = elementos.tipoAuditoria.value === 'extraordinaria';
  elementos.campoMotivoExtraordinaria.classList.toggle('escondido', !extraordinaria);
  elementos.motivoExtraordinaria.required = extraordinaria;
});

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
          tipo: elementos.tipoAuditoria.value,
          motivo_extraordinaria: elementos.motivoExtraordinaria.value.trim(),
          data_auditoria: elementos.dataAuditoria.value,
          prazo: elementos.prazoAuditoria.value,
          notificar_em: elementos.notificarAuditoria.value || null,
          observacao_geral: elementos.observacaoGeral.value.trim()
        })
      }
    );

    estado.auditoriaId =
      auditoria.id
      || auditoria.auditoria?.id;

    estado.auditoriaResumo = auditoria.auditoria || auditoria;

    if (!estado.auditoriaId) {
      throw new Error(
        'A auditoria foi criada, mas o ID não foi retornado.'
      );
    }

    await carregarSensos();
    salvarEstadoAuditoria();

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

async function enviarEvidencia(respostaId, bloco) {
  const arquivoInput = bloco.querySelector('.arquivo-evidencia');
  const arquivo = arquivoInput?.files?.[0];
  if (!arquivo) return null;

  const descricao = bloco.querySelector('.descricao-evidencia')?.value.trim() || '';
  const formData = new FormData();
  formData.append('arquivo', arquivo);
  formData.append('resposta_id', String(respostaId));
  formData.append('descricao', descricao);

  // O upload de evidência usa multipart/form-data. Não definimos
  // Content-Type manualmente para que o navegador inclua o boundary.
  const resposta = await fetch(
    `${API_URL}/evidencias/auditorias/${estado.auditoriaId}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    }
  );

  let dados = {};
  try {
    dados = await resposta.json();
  } catch (_) {
    dados = {};
  }

  if (resposta.status === 401) {
    throw new Error('Sua sessão expirou. A evidência não foi enviada.');
  }

  if (!resposta.ok) {
    throw new Error(dados.erro || dados.mensagem || 'Não foi possível salvar a evidência.');
  }

  // Limpa o campo somente depois de confirmar que o servidor recebeu o arquivo.
  arquivoInput.value = '';
  const descricaoInput = bloco.querySelector('.descricao-evidencia');
  if (descricaoInput) descricaoInput.value = '';

  return dados.data ?? dados.evidencia ?? dados;
}

async function salvarEtapaAtual(evento) {
  evento.preventDefault();
  evento.stopPropagation();

  if (estado.salvandoEtapa || estado.auditoriaFinalizada) return;

  limparMensagem();

  let respostas;
  try {
    respostas = coletarRespostas();
  } catch (erro) {
    mostrarMensagem(erro.message);
    return;
  }

  estado.salvandoEtapa = true;
  mostrarCarregamento();
  elementos.botaoSalvar.disabled = true;
  elementos.botaoAnterior.disabled = true;

  try {
    // Primeiro persistimos todas as respostas do senso. Assim, uma falha
    // posterior no upload de uma evidência não perde o progresso da etapa.
    const respostasSalvas = [];

    for (const resposta of respostas) {
      const retorno = await requisicao(
        `/auditorias/${estado.auditoriaId}/respostas`,
        {
          method: 'POST',
          body: JSON.stringify(resposta)
        }
      );

      const respostaId = retorno?.resposta_id;
      if (!respostaId) {
        throw new Error(`A resposta do critério ${resposta.criterio_id} foi salva, mas o ID não foi retornado.`);
      }

      respostasSalvas.push({ resposta, respostaId });
    }

    // Depois enviamos as evidências. Cada evidência continua vinculada à
    // resposta recém-criada.
    for (const { resposta, respostaId } of respostasSalvas) {
      const bloco = document.querySelector(
        `.criterio-checklist[data-criterio-id="${resposta.criterio_id}"]`
      );

      if (bloco?.querySelector('.arquivo-evidencia')?.files?.length) {
        await enviarEvidencia(respostaId, bloco);
      }
    }

    // Só avançamos para o próximo senso depois que respostas e evidências
    // da etapa atual estiverem concluídas.
    salvarEstadoAuditoria();
    estado.etapasConcluidas.add(estado.etapaAtual);
    atualizarProgresso();
    renderizarTimeline();

    const ultimaEtapa = estado.etapaAtual === estado.sensos.length - 1;

    if (ultimaEtapa) {
      await finalizarAuditoria();
      return;
    }

    estado.etapaAtual += 1;
    salvarEstadoAuditoria();
    await carregarCriteriosDoSenso();

    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (erro) {
    // Nunca navegamos para fora da auditoria por causa de uma falha de
    // upload/salvamento. O usuário permanece na etapa atual.
    mostrarMensagem(erro.message, 'erro');
  } finally {
    estado.salvandoEtapa = false;
    esconderCarregamento();
    atualizarBotoes();
  }
}

async function finalizarAuditoria() {
  // A auditoria só é considerada finalizada depois que todas as respostas
  // e evidências já foram persistidas. Não fazemos redirecionamento aqui:
  // o usuário continua na própria página de Auditoria.
  const resultado = await requisicao(
    `/auditorias/${estado.auditoriaId}/finalizar`,
    {
      method: 'POST'
    }
  );

  estado.auditoriaFinalizada = true;
  estado.permitirSaida = true;
  estado.auditoriaResumo = { ...(estado.auditoriaResumo || {}), finalizada_em: resultado.finalizada_em || new Date().toISOString() };
  limparEstadoAuditoria();

  const percentual =
    resultado.percentual
    ?? resultado.percentual_geral
    ?? 0;

  elementos.resultadoPercentual.textContent =
    `${Number(percentual).toFixed(2)}%`;

  elementos.resultadoClassificacao.textContent =
    resultado.classificacao || 'Não informada';

  const duracaoSegundos = Number(resultado.duracao_segundos || 0);
  if (duracaoSegundos > 0) {
    const minutos = Math.floor(duracaoSegundos / 60);
    const segundos = duracaoSegundos % 60;
    elementos.resultadoDuracao.textContent =
      `${minutos}min ${segundos}s`;
  } else {
    elementos.resultadoDuracao.textContent = '-';
  }

  const resumo = estado.auditoriaResumo || {};
  const setorAtual = estado.setores.find((setor) => Number(setor.id) === Number(resumo.setor_id || elementos.setorId.value));

  const codigoResultado = document.getElementById('resultadoCodigo');
  const setorResultado = document.getElementById('resultadoSetor');
  const dataResultado = document.getElementById('resultadoData');

  if (codigoResultado) {
    codigoResultado.textContent = resumo.codigo || `AUD-${estado.auditoriaId}`;
  }

  if (setorResultado) {
    setorResultado.textContent = resumo.setor_nome || setorAtual?.nome || 'Setor não informado';
  }

  if (dataResultado) {
    const dataFinal = resumo.finalizada_em || new Date();
    dataResultado.textContent = new Date(dataFinal).toLocaleString('pt-BR');
  }

  // Depois de concluir, não deixamos o usuário voltar a editar a auditoria.
  // A tela de resultado passa a ser a principal confirmação da conclusão.
  elementos.configuracaoAuditoria.classList.add('escondido');
  elementos.areaAuditoria.classList.add('escondido');
  elementos.checklistForm.querySelectorAll('input, textarea, button').forEach((campo) => {
    campo.disabled = true;
  });

  elementos.botaoNovaAuditoria.disabled = false;

  elementos.resultadoFinal.classList.remove(
    'escondido'
  );

  mostrarMensagem(
    'Auditoria finalizada com sucesso! O resultado foi registrado e as respostas e evidências foram salvas.',
    'sucesso'
  );

  elementos.resultadoFinal.scrollIntoView({
    behavior: 'smooth',
    block: 'start'
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
  limparEstadoAuditoria();
  estado.permitirSaida = false;
  estado.auditoriaId = null;
  estado.sensos = [];
  estado.etapaAtual = 0;
  estado.etapasConcluidas.clear();
  estado.respostasLocais = {};
  estado.evidenciasPendentes = {};
  estado.auditoriaFinalizada = false;
  estado.auditoriaResumo = null;

  elementos.setorId.value = '';
  elementos.observacaoGeral.value = '';
  elementos.tipoAuditoria.value = 'periodica';
  elementos.motivoExtraordinaria.value = '';
  elementos.campoMotivoExtraordinaria.classList.add('escondido');
  elementos.motivoExtraordinaria.required = false;
  configurarDatasPadrao();

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

elementos.botaoSalvar.addEventListener(
  'click',
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

if (elementos.checklistForm) {
  elementos.checklistForm.addEventListener('submit', (evento) => {
    evento.preventDefault();
    evento.stopPropagation();
  });
}

(async function inicializarChecklist() {
  await carregarSetores();
  configurarAvisoSaidaDuranteAuditoria();
  await restaurarAuditoriaEmAndamento();
})();