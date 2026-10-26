const SetorModel = require('../models/SetorModel');
const UsuarioModel = require('../models/UsuarioModel');

const PERIODICIDADES_VALIDAS = new Set([
  'semanal',
  'quinzenal',
  'mensal',
  'bimestral',
  'trimestral',
  'semestral',
  'anual',
]);

async function validarAuditor(auditorId, empresaId) {
  if (!auditorId) {
    return { valido: false, mensagem: 'Todo setor precisa ter um auditor responsável.' };
  }

  const auditor = await UsuarioModel.buscarPorId(auditorId, empresaId);

  if (!auditor) {
    return { valido: false, mensagem: 'Auditor não encontrado.' };
  }

  if (!auditor.ativo) {
    return { valido: false, mensagem: 'O auditor selecionado está inativo.' };
  }

  if (!['auditor', 'administrador'].includes(auditor.perfil)) {
    return { valido: false, mensagem: 'O usuário selecionado não possui perfil de auditor.' };
  }

  return { valido: true, auditor };
}

function validarPeriodicidade(periodicidade) {
  if (!PERIODICIDADES_VALIDAS.has(periodicidade)) {
    return 'Periodicidade inválida. Use semanal, quinzenal, mensal, bimestral, trimestral, semestral ou anual.';
  }
  return null;
}

async function listarAuditores(req, res) {
  return res.json(await SetorModel.listarAuditores(req.usuario.empresa_id));
}

async function listar(req, res) {
  return res.json(await SetorModel.listar(req.usuario.empresa_id, req.usuario));
}

async function buscar(req, res) {
  const setor = await SetorModel.buscarPorId(req.params.id, req.usuario.empresa_id);

  if (!setor) {
    return res.status(404).json({ erro: 'Setor não encontrado.' });
  }

  return res.json(setor);
}

async function criar(req, res) {
  const nome = req.body.nome?.trim();
  const auditorId = Number(req.body.auditor_id);
  const periodicidade = req.body.periodicidade_auditoria || 'mensal';

  if (!nome) {
    return res.status(400).json({ erro: 'O nome do setor é obrigatório.' });
  }

  const erroPeriodicidade = validarPeriodicidade(periodicidade);
  if (erroPeriodicidade) return res.status(400).json({ erro: erroPeriodicidade });

  const auditor = await validarAuditor(auditorId, req.usuario.empresa_id);
  if (!auditor.valido) return res.status(400).json({ erro: auditor.mensagem });

  const setor = await SetorModel.criar(req.usuario.empresa_id, {
    ...req.body,
    nome,
    auditor_id: auditorId,
    criado_por: req.usuario.id,
    periodicidade_auditoria: periodicidade,
  });

  return res.status(201).json(setor);
}

async function atualizar(req, res) {
  const nome = req.body.nome?.trim();
  const auditorId = Number(req.body.auditor_id);
  const periodicidade = req.body.periodicidade_auditoria || 'mensal';

  if (!nome) {
    return res.status(400).json({ erro: 'O nome do setor é obrigatório.' });
  }

  const erroPeriodicidade = validarPeriodicidade(periodicidade);
  if (erroPeriodicidade) return res.status(400).json({ erro: erroPeriodicidade });

  const setorExistente = await SetorModel.buscarPorId(req.params.id, req.usuario.empresa_id, false);

  if (!setorExistente) {
    return res.status(404).json({ erro: 'Setor não encontrado ou inativo.' });
  }

  const auditor = await validarAuditor(auditorId, req.usuario.empresa_id);
  if (!auditor.valido) return res.status(400).json({ erro: auditor.mensagem });

  const setorAtualizado = await SetorModel.atualizar(
    req.params.id,
    req.usuario.empresa_id,
    {
      ...req.body,
      nome,
      auditor_id: auditorId,
      periodicidade_auditoria: periodicidade,
    }
  );

  return res.json(setorAtualizado);
}

async function remover(req, res) {
  const setor = await SetorModel.buscarPorId(req.params.id, req.usuario.empresa_id, false);

  if (!setor) {
    return res.status(404).json({ erro: 'Setor não encontrado ou já inativo.' });
  }

  const motivo = req.body?.motivo?.trim();

  if (!motivo) {
    return res.status(400).json({ erro: 'Informe o motivo da exclusão do setor.' });
  }

  await SetorModel.desativar(req.params.id, req.usuario.empresa_id, motivo);

  return res.status(200).json({
    mensagem: 'Setor desativado com sucesso. O histórico foi preservado.',
  });
}

module.exports = {
  listar,
  listarAuditores,
  buscar,
  criar,
  atualizar,
  remover,
};
