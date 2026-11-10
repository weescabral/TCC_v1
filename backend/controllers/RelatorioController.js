const nodemailer = require('nodemailer');
const RelatorioModel = require('../models/RelatorioModel');

async function opcoes(req, res) {
  return res.json(await RelatorioModel.opcoes(req.usuario.empresa_id, req.usuario));
}

async function gerar(req, res) {
  const { tipo, ...filtros } = req.query;
  const dados = await RelatorioModel.gerar(tipo, filtros, req.usuario.empresa_id, req.usuario);
  return res.json(dados);
}

async function enviar(req, res) {
  const { destinatario, assunto, mensagem, nomeArquivo, pdfBase64 } = req.body || {};
  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(destinatario || '').trim());
  if (!emailValido) return res.status(400).json({ erro: 'Informe um e-mail destinatário válido.' });
  if (!pdfBase64 || typeof pdfBase64 !== 'string') return res.status(400).json({ erro: 'O arquivo PDF não foi recebido.' });

  const base64 = pdfBase64.replace(/^data:application\/pdf;base64,/, '');
  if (!/^[A-Za-z0-9+/=\s]+$/.test(base64)) return res.status(400).json({ erro: 'Conteúdo do PDF inválido.' });
  const buffer = Buffer.from(base64, 'base64');
  if (!buffer.length || buffer.length > 8 * 1024 * 1024) return res.status(413).json({ erro: 'O PDF deve ter até 8 MB.' });

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return res.status(503).json({ erro: 'Envio de e-mail ainda não configurado. Configure SMTP_HOST, SMTP_USER e SMTP_PASS no backend.' });
  }

  const port = Number(process.env.SMTP_PORT || 587);
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: String(process.env.SMTP_SECURE).toLowerCase() === 'true' || port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: String(destinatario).trim(),
    subject: String(assunto || 'Relatório Sensus 5S').slice(0, 180),
    text: String(mensagem || 'Segue em anexo o relatório gerado pelo Sensus 5S.').slice(0, 5000),
    attachments: [{
      filename: String(nomeArquivo || 'relatorio-sensus-5s.pdf').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100),
      content: buffer,
      contentType: 'application/pdf',
    }],
  });

  return res.json({ mensagem: 'Relatório enviado por e-mail com sucesso.' });
}

module.exports = { opcoes, gerar, enviar };
