const AuditoriaModel = require('../models/AuditoriaModel');

async function listar(req, res) {
  return res.json(await AuditoriaModel.listar(req.usuario.empresa_id));
}

async function buscar(req, res) {
  const auditoria = await AuditoriaModel.buscarPorId(req.params.id, req.usuario.empresa_id);
  if (!auditoria) return res.status(404).json({ erro: 'Auditoria não encontrada.' });
  return res.json(auditoria);
}

async function criar(req, res) {
  if (!req.body.setor_id) return res.status(400).json({ erro: 'Informe o setor_id.' });

  const auditoria = await AuditoriaModel.criar({
    empresa_id: req.usuario.empresa_id,
    setor_id: req.body.setor_id,
    usuario_id: req.usuario.id,
    observacao_geral: req.body.observacao_geral,
  });

  return res.status(201).json(auditoria);
}

async function salvarResposta(req, res) {
  const { criterio_id, nota, observacao } = req.body;

  if (!criterio_id || nota === undefined || nota === null || nota === '') {
    return res.status(400).json({
      erro: 'Informe criterio_id e nota.',
    });
  }

  const notaNumerica = Number(nota);

  if (
    !Number.isFinite(notaNumerica)
    || !Number.isInteger(notaNumerica)
    || notaNumerica < 0
    || notaNumerica > 5
  ) {
    return res.status(400).json({
      erro: 'A nota deve ser um número inteiro entre 0 e 5.',
    });
  }

  const auditoria = await AuditoriaModel.buscarPorId(
    req.params.id,
    req.usuario.empresa_id
  );

  if (!auditoria) {
    return res.status(404).json({
      erro: 'Auditoria não encontrada.',
    });
  }

  if (auditoria.status === 'finalizada') {
    return res.status(409).json({
      erro: 'Não é possível alterar uma auditoria finalizada.',
    });
  }

  await AuditoriaModel.salvarResposta({
    auditoria_id: req.params.id,
    criterio_id,
    nota: notaNumerica,
    observacao,
  });

  const totais = await AuditoriaModel.recalcularAuditoria(req.params.id);

  return res.json({
    mensagem: 'Resposta salva com sucesso.',
    totais,
  });
}

async function finalizar(req, res) {
  const resultado = await AuditoriaModel.finalizar(
    req.params.id,
    req.usuario.empresa_id
  );

  if (!resultado) {
    return res.status(404).json({
      erro: 'Auditoria não encontrada.',
    });
  }

  return res.json({
    mensagem: 'Auditoria finalizada com sucesso.',
    resultado,
  });
}

module.exports = { listar, buscar, criar, salvarResposta, finalizar };
