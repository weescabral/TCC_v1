const PlanoAcaoModel = require('../models/PlanoAcaoModel');

async function listar(req, res) {
  const planos = await PlanoAcaoModel.listar(req.usuario.empresa_id, {
    status: req.query.status,
  });
  return res.json(planos);
}

async function atualizar(req, res) {
  const plano = await PlanoAcaoModel.atualizar(
    req.params.id,
    req.usuario.empresa_id,
    req.body
  );

  if (!plano) {
    return res.status(404).json({ erro: 'Plano de ação não encontrado.' });
  }

  return res.json({ mensagem: 'Plano de ação atualizado com sucesso.', plano });
}

module.exports = { listar, atualizar };
