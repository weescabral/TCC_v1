const bcrypt = require('bcryptjs');
const UsuarioModel = require('../models/UsuarioModel');
const SetorModel = require('../models/SetorModel');

async function listar(req, res) {
  const usuarios = await UsuarioModel.listarPorEmpresa(req.usuario.empresa_id);
  return res.json(usuarios);
}

async function criar(req, res) {
  const { nome, email, senha, perfil } = req.body;
  if (!nome || !email || !senha) {
    return res.status(400).json({ erro: 'Nome, e-mail e senha são obrigatórios.' });
  }

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
  const { nome, email, perfil } = req.body;
  if (!nome || !email) return res.status(400).json({ erro: 'Nome e e-mail são obrigatórios.' });

  if (perfil && !['administrador', 'auditor'].includes(perfil)) {
    return res.status(400).json({ erro: 'Perfil inválido.' });
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
  if (!req.body.senha) return res.status(400).json({ erro: 'Informe a nova senha.' });
  const senhaHash = await bcrypt.hash(req.body.senha, 10);
  await UsuarioModel.trocarSenha(req.params.id, req.usuario.empresa_id, senhaHash);
  return res.json({ mensagem: 'Senha atualizada com sucesso.' });
}

async function remover(req, res) {
  const motivo = req.body?.motivo?.trim();

  if (!motivo) {
    return res.status(400).json({ erro: 'Informe o motivo da inativação do auditor.' });
  }

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

module.exports = { listar, criar, atualizar, trocarSenha, remover };
