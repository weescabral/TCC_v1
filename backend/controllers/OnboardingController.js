const OnboardingModel = require('../models/OnboardingModel');

async function obter(req, res) {
  return res.json(await OnboardingModel.buscar(req.usuario.empresa_id));
}

async function atualizar(req, res) {
  const status = String(req.body?.status || 'pendente');
  const etapa = Number(req.body?.etapa_atual || 1);
  if (!['pendente', 'adiado', 'concluido'].includes(status)) {
    return res.status(400).json({ erro: 'Status de configuração inválido.' });
  }
  if (!Number.isInteger(etapa) || etapa < 1 || etapa > 5) {
    return res.status(400).json({ erro: 'Etapa inválida.' });
  }
  return res.json(await OnboardingModel.atualizar(req.usuario.empresa_id, { status, etapa_atual: etapa }));
}

module.exports = { obter, atualizar };
