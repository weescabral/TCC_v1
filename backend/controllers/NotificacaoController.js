const NotificacaoModel = require('../models/NotificacaoModel');

async function listar(req, res) {
  const dados = await NotificacaoModel.listar(req.usuario);
  return res.json(dados);
}

async function marcarComoLida(req, res) {
  const atualizada = await NotificacaoModel.marcarComoLida(req.params.id, req.usuario);
  if (!atualizada) return res.status(404).json({ erro: 'Notificação não encontrada ou já lida.' });
  return res.json({ mensagem: 'Notificação marcada como lida.' });
}

async function marcarTodasComoLidas(req, res) {
  const total = await NotificacaoModel.marcarTodasComoLidas(req.usuario);
  return res.json({ mensagem: 'Notificações marcadas como lidas.', total });
}

module.exports = { listar, marcarComoLida, marcarTodasComoLidas };
