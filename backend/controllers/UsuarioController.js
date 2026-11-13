const bcrypt = require('bcryptjs');
const UsuarioModel = require('../models/UsuarioModel');
const SetorModel = require('../models/SetorModel');

async function listar(req, res) {
  const status = req.query.status === 'inativos' ? 'inativos' : 'ativos';
  const usuarios = await UsuarioModel.listarPorEmpresa(req.usuario.empresa_id, status);
  return res.json(usuarios);
}

async function criar(req, res) {
  const nome = String(req.body.nome || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const { senha, perfil } = req.body;
  if (!nome || !email || !senha) {
    return res.status(400).json({ erro: 'Nome, e-mail e senha são obrigatórios.' });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ erro: 'Informe um e-mail válido.' });
  if (String(senha).length < 8) return res.status(400).json({ erro: 'A senha deve ter pelo menos 8 caracteres.' });

  if (perfil && !['administrador', 'auditor'].includes(perfil)) {
    return res.status(400).json({ erro: 'Perfil inválido.' });
  }

  const senhaHash = await bcrypt.hash(senha, 10);
  const usuario = await UsuarioModel.criar({
    empresa_id: req.usuario.empresa_id,
    nome,
    email,
    senhaHash,
    perfil,
  });
  return res.status(201).json(usuario);
}

async function atualizar(req, res) {
  const nome = String(req.body.nome || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const { perfil } = req.body;
  if (!nome || !email) return res.status(400).json({ erro: 'Nome e e-mail são obrigatórios.' });

  if (perfil && !['administrador', 'auditor'].includes(perfil)) {
    return res.status(400).json({ erro: 'Perfil inválido.' });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ erro: 'Informe um e-mail válido.' });
  if (Number(req.params.id) === Number(req.usuario.id) && perfil && perfil !== 'administrador') {
    return res.status(409).json({ erro: 'Você não pode remover seu próprio perfil de administrador.' });
  }

  const usuario = await UsuarioModel.atualizar(req.params.id, req.usuario.empresa_id, {
    nome,
    email,
    perfil,
  });

  if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado.' });
  return res.json(usuario);
}

async function trocarSenha(req, res) {
  if (!req.body.senha || String(req.body.senha).length < 8) return res.status(400).json({ erro: 'A nova senha deve ter pelo menos 8 caracteres.' });
  const senhaHash = await bcrypt.hash(req.body.senha, 10);
  await UsuarioModel.trocarSenha(req.params.id, req.usuario.empresa_id, senhaHash);
  return res.json({ mensagem: 'Senha atualizada com sucesso.' });
}

async function remover(req, res) {
  const motivo = req.body?.motivo?.trim();

  if (!motivo) {
    return res.status(400).json({ erro: 'Informe o motivo da inativação do auditor.' });
  }

  if (Number(req.params.id) === Number(req.usuario.id)) return res.status(409).json({ erro: 'Você não pode inativar seu próprio usuário.' });

  const usuario = await UsuarioModel.buscarPorId(req.params.id, req.usuario.empresa_id);
  if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado.' });

  const setoresAtivos = await SetorModel.contarAtivosPorAuditor(
    req.params.id,
    req.usuario.empresa_id
  );

  if (setoresAtivos > 0) {
    return res.status(409).json({
      erro: `Este auditor ainda possui ${setoresAtivos} setor(es) ativo(s). Reatribua os setores antes de inativá-lo.`,
    });
  }

  await UsuarioModel.desativar(req.params.id, req.usuario.empresa_id, motivo);
  return res.status(200).json({ mensagem: 'Usuário inativado com sucesso. O histórico foi preservado.' });
}



async function excluirDefinitivamente(req, res) {
  if (Number(req.params.id) === Number(req.usuario.id)) {
    return res.status(409).json({ erro: 'Você não pode excluir definitivamente seu próprio usuário.' });
  }

  const resultado = await UsuarioModel.excluirDefinitivamente(
    req.params.id,
    req.usuario.empresa_id
  );

  if (resultado.excluido) {
    return res.json({ mensagem: 'Auditor excluído definitivamente.' });
  }
  if (resultado.motivo === 'nao_encontrado') {
    return res.status(404).json({ erro: 'Auditor não encontrado.' });
  }
  if (resultado.motivo === 'nao_e_auditor') {
    return res.status(409).json({ erro: 'Esta ação está disponível somente para usuários com perfil de auditor.' });
  }
  if (resultado.motivo === 'usuario_ativo') {
    return res.status(409).json({ erro: 'Somente auditores inativos podem ser excluídos definitivamente.' });
  }
  if (resultado.motivo === 'possui_vinculos') {
    const detalhes = [];
    if (resultado.totalAuditorias) detalhes.push(`${resultado.totalAuditorias} auditoria(s)`);
    if (resultado.totalSetores) detalhes.push(`${resultado.totalSetores} setor(es) vinculado(s)`);
    if (resultado.totalPlanos) detalhes.push(`${resultado.totalPlanos} plano(s) de ação`);
    return res.status(409).json({
      erro: `Este auditor possui vínculos registrados (${detalhes.join(', ')}). Para preservar o histórico e a integridade dos dados, não é possível excluí-lo definitivamente. Você pode mantê-lo inativo.`,
      ...resultado
    });
  }
  return res.status(409).json({ erro: 'Não foi possível excluir o auditor. Atualize a lista e tente novamente.' });
}

async function reativar(req, res) {
  const usuarioExistente = await UsuarioModel.buscarPorId(req.params.id, req.usuario.empresa_id);
  if (!usuarioExistente) return res.status(404).json({ erro: 'Usuário não encontrado.' });
  if (usuarioExistente.ativo) return res.status(409).json({ erro: 'Este usuário já está ativo.' });
  if (usuarioExistente.perfil !== 'auditor') {
    return res.status(409).json({ erro: 'A reativação por esta opção está disponível apenas para auditores.' });
  }

  const usuario = await UsuarioModel.reativar(req.params.id, req.usuario.empresa_id);
  if (!usuario) return res.status(409).json({ erro: 'Não foi possível reativar este auditor. Atualize a lista e tente novamente.' });
  return res.json({ mensagem: 'Auditor reativado com sucesso.', usuario });
}

module.exports = { listar, criar, atualizar, trocarSenha, remover, reativar, excluirDefinitivamente };
