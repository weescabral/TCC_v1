const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const AuthModel = require('../models/AuthModel');
const crypto = require('crypto');

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

  const email = String(usuario.email).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ erro: 'Informe um e-mail válido.' });
  if (String(usuario.senha).length < 8) return res.status(400).json({ erro: 'A senha deve ter pelo menos 8 caracteres.' });
  if (String(empresa.nome).trim().length < 2 || String(usuario.nome).trim().length < 2) return res.status(400).json({ erro: 'Informe o nome da empresa e do responsável.' });
  const senhaHash = await bcrypt.hash(usuario.senha, 10);
  const resultado = await AuthModel.criarEmpresaComAdmin({
    empresa,
    usuario: { ...usuario, email, senhaHash, perfil: 'administrador' },
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

async function solicitarRecuperacao(req, res) {
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ erro: 'Informe seu e-mail.' });
  const resposta = { mensagem: 'Se existir uma conta ativa com esse e-mail, enviaremos instruções para redefinir a senha.' };
  const usuario = await AuthModel.buscarPorEmail(email);
  if (!usuario || !usuario.ativo) return res.json(resposta);

  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiraEm = new Date(Date.now() + 30 * 60 * 1000);
  await AuthModel.criarTokenRecuperacao({ usuarioId: usuario.id, tokenHash, expiraEm });
  const baseUrl = (process.env.FRONTEND_URL || 'http://localhost:5500').replace(/\/$/, '');
  const link = `${baseUrl}/index.html?token=${token}`;

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_FROM) {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || 'false') === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
    
await transporter.sendMail({
  from: process.env.SMTP_FROM,
  to: usuario.email,
  subject: 'Recuperação de senha | Sensus 5S',

  text: `
Olá, ${usuario.nome}.

Recebemos uma solicitação para redefinir sua senha do Sensus 5S.

Acesse o endereço abaixo para criar uma nova senha:

${link}

O link expira em 30 minutos.
Se não foi você, ignore esta mensagem.
  `,

  html: `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: auto; padding: 30px; color: #071b3d;">

      <h2 style="color: #071b3d;">Sensus 5S</h2>

      <h2>Redefinição de senha</h2>

      <p>Olá, ${usuario.nome}.</p>

      <p>
        Recebemos uma solicitação para redefinir sua senha do Sensus 5S.
      </p>

      <p>Para criar uma nova senha, clique no botão abaixo:</p>

      <div style="margin: 30px 0;">
        <a href="${link}"
           target="_blank"
           style="background-color: #ffb300;
                  color: #071b3d;
                  padding: 15px 28px;
                  text-decoration: none;
                  font-weight: bold;
                  border-radius: 8px;
                  display: inline-block;">
          CRIAR NOVA SENHA
        </a>
      </div>

      <p style="font-size: 13px; color: #666;">
        Se o botão não funcionar, copie e cole este endereço no navegador:
      </p>

      <p style="font-size: 12px; word-break: break-all;">
        <a href="${link}">${link}</a>
      </p>

      <p style="font-size: 13px; color: #666;">
        Este link expira em 30 minutos e só pode ser utilizado uma vez.
      </p>

      <hr style="border: 0; border-top: 1px solid #ddd;">

      <p style="font-size: 12px; color: #999;">
        Sensus 5S — Gestão e qualidade.
      </p>

    </div>
  `
});
  } else {
    console.warn('SMTP não configurado. Configure SMTP_HOST, SMTP_USER, SMTP_PASS e SMTP_FROM para enviar recuperação de senha.');
  }
  return res.json(resposta);
}

async function redefinirSenha(req, res) {
  const token = String(req.body?.token || '');
  const senha = String(req.body?.senha || '');
  if (!token || senha.length < 8) return res.status(400).json({ erro: 'Informe um link válido e uma senha com pelo menos 8 caracteres.' });
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const recuperacao = await AuthModel.buscarUsuarioPorToken(tokenHash);
  if (!recuperacao || !recuperacao.ativo) return res.status(400).json({ erro: 'Este link expirou ou é inválido. Solicite uma nova recuperação.' });
  const senhaHash = await bcrypt.hash(senha, 10);
  await AuthModel.concluirRecuperacao(recuperacao.recuperacao_id, recuperacao.usuario_id, senhaHash);
  return res.json({ mensagem: 'Senha redefinida com sucesso. Você já pode entrar com a nova senha.' });
}

async function atualizarPerfil(req, res) {
  const nome = String(req.body?.nome || '').trim();
  if (!nome) return res.status(400).json({ erro: 'Informe seu nome.' });
  if (nome.length > 100) return res.status(400).json({ erro: 'O nome deve ter até 100 caracteres.' });
  const usuario = await AuthModel.atualizarPerfil(req.usuario.id, nome);
  return res.json({ mensagem: 'Perfil atualizado com sucesso.', usuario });
}

async function me(req, res) {
  const usuario = await AuthModel.buscarUsuarioSeguro(req.usuario.id);
  return res.json({ usuario });
}

module.exports = { registrar, login, me, atualizarPerfil, solicitarRecuperacao, redefinirSenha };
