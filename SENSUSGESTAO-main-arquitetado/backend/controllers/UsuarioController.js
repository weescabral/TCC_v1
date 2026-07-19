const bcrypt = require('bcryptjs');
const UsuarioModel = require('../models/UsuarioModel');

async function listar(req, res) {
  const usuarios = await UsuarioModel.listarPorEmpresa(req.usuario.empresa_id);
  return res.json(usuarios);
}

async function criar(req, res) {
  const { nome, email, senha, perfil } = req.body;
  if (!nome || !email || !senha) return res.status(400).json({ erro: 'Nome, e-mail e senha são obrigatórios.' });

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

  const usuario = await UsuarioModel.atualizar(req.params.id, req.usuario.empresa_id, { nome, email, perfil });
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
  await UsuarioModel.desativar(req.params.id, req.usuario.empresa_id);
  return res.status(204).send();
}

module.exports = { listar, criar, atualizar, trocarSenha, remover };
