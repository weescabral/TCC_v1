const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const AuthModel = require('../models/AuthModel');

function gerarToken(usuario) {
  return jwt.sign(
    {
      id: usuario.id,
      empresa_id: usuario.empresa_id,
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil,
    },
    process.env.JWT_SECRET || 'sensus_dev_secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
}

async function registrar(req, res) {
  const { empresa, usuario } = req.body;

  if (!empresa?.nome || !usuario?.nome || !usuario?.email || !usuario?.senha) {
    return res.status(400).json({ erro: 'Informe empresa.nome, usuario.nome, usuario.email e usuario.senha.' });
  }

  const senhaHash = await bcrypt.hash(usuario.senha, 10);
  const resultado = await AuthModel.criarEmpresaComAdmin({
    empresa,
    usuario: { ...usuario, senhaHash, perfil: usuario.perfil || 'administrador' },
  });

  return res.status(201).json({
    mensagem: 'Empresa e usuário administrador cadastrados com sucesso.',
    ...resultado,
  });
}

async function login(req, res) {
  const { email, senha } = req.body;

  if (!email || !senha) return res.status(400).json({ erro: 'Informe e-mail e senha.' });

  const usuario = await AuthModel.buscarPorEmail(email);
  if (!usuario || !usuario.ativo) return res.status(401).json({ erro: 'E-mail ou senha inválidos.' });

  const senhaConfere = await bcrypt.compare(senha, usuario.senha);
  if (!senhaConfere) return res.status(401).json({ erro: 'E-mail ou senha inválidos.' });

  const token = gerarToken(usuario);
  delete usuario.senha;

  return res.json({ mensagem: 'Login realizado com sucesso.', token, usuario });
}

async function me(req, res) {
  const usuario = await AuthModel.buscarUsuarioSeguro(req.usuario.id);
  return res.json({ usuario });
}

module.exports = { registrar, login, me };
