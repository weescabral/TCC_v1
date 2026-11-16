const PlanoAcaoModel = require('../models/PlanoAcaoModel');
const db = require('../config/database');
const NotificacaoModel = require('../models/NotificacaoModel');

async function listar(req, res) {
  const planos = await PlanoAcaoModel.listar(req.usuario.empresa_id, req.query, req.usuario);
  return res.json(planos);
}

async function obterResumo(req, res) {
  return res.json(await PlanoAcaoModel.resumo(req.usuario.empresa_id, req.usuario));
}

async function atualizar(req, res) {
  if (req.usuario.perfil === 'auditor') {
    const [vinculos] = await db.query(
      `SELECT pa.id FROM planos_acao pa
       INNER JOIN setores s ON s.id = pa.setor_id
       INNER JOIN auditorias a ON a.id = pa.auditoria_id
       WHERE pa.id = ? AND a.empresa_id = ? AND s.auditor_id = ? LIMIT 1`,
      [req.params.id, req.usuario.empresa_id, req.usuario.id]
    );
    if (!vinculos.length) return res.status(403).json({ erro: 'Você não possui permissão para alterar este plano de ação.' });
  }
  const planoAnterior = await PlanoAcaoModel.buscarPorId(req.params.id, req.usuario.empresa_id);
  const dados = { ...req.body };
  if (dados.responsavel_id) {
    const [usuarios] = await db.query('SELECT id FROM usuarios WHERE id = ? AND empresa_id = ? AND ativo = TRUE LIMIT 1', [dados.responsavel_id, req.usuario.empresa_id]);
    if (!usuarios.length) return res.status(400).json({ erro: 'Responsável inválido ou inativo.' });
  }
  const plano = await PlanoAcaoModel.atualizar(req.params.id, req.usuario.empresa_id, dados);
  if (!plano) return res.status(404).json({ erro: 'Plano de ação não encontrado.' });
  if (dados.responsavel_id && Number(dados.responsavel_id) !== Number(planoAnterior?.responsavel_id || 0)) {
    try {
      await NotificacaoModel.registrarPlanoAtribuido({
        empresaId: req.usuario.empresa_id,
        planoId: plano.id,
        responsavelId: dados.responsavel_id,
        atribuidoPorId: req.usuario.id,
      });
    } catch (erroNotificacao) {
      console.error('Não foi possível notificar o responsável pelo plano:', erroNotificacao.message);
    }
  }
  return res.json({ mensagem: 'Plano de ação atualizado com sucesso.', plano });
}

module.exports = { listar, obterResumo, atualizar };
