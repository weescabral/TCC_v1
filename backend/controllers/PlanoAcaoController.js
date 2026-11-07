const PlanoAcaoModel = require('../models/PlanoAcaoModel');
const db = require('../config/database');

async function listar(req, res) {
  const planos = await PlanoAcaoModel.listar(req.usuario.empresa_id, req.query);
  return res.json(planos);
}

async function obterResumo(req, res) {
  return res.json(await PlanoAcaoModel.resumo(req.usuario.empresa_id));
}

async function atualizar(req, res) {
  const dados = { ...req.body };
  if (dados.responsavel_id) {
    const [usuarios] = await db.query('SELECT id FROM usuarios WHERE id = ? AND empresa_id = ? AND ativo = TRUE LIMIT 1', [dados.responsavel_id, req.usuario.empresa_id]);
    if (!usuarios.length) return res.status(400).json({ erro: 'Responsável inválido ou inativo.' });
  }
  const plano = await PlanoAcaoModel.atualizar(req.params.id, req.usuario.empresa_id, dados);
  if (!plano) return res.status(404).json({ erro: 'Plano de ação não encontrado.' });
  return res.json({ mensagem: 'Plano de ação atualizado com sucesso.', plano });
}

module.exports = { listar, obterResumo, atualizar };
