const fs = require('fs/promises');
const path = require('path');
const EvidenciaModel = require('../models/EvidenciaModel');

async function listar(req, res) {
  const evidencias = await EvidenciaModel.listarPorAuditoria(
    req.params.id,
    req.usuario.empresa_id
  );
  return res.json(evidencias);
}

async function criar(req, res) {
  if (!req.file) {
    return res.status(400).json({ erro: 'Selecione um arquivo de evidência.' });
  }

  const respostaId = req.body.resposta_id ? Number(req.body.resposta_id) : null;
  if (req.body.resposta_id && !Number.isInteger(respostaId)) {
    await removerArquivoEnviado(req.file.path);
    return res.status(400).json({ erro: 'resposta_id inválido.' });
  }

  const contexto = await EvidenciaModel.validarContexto(
    req.params.id,
    respostaId,
    req.usuario.empresa_id
  );

  if (!contexto) {
    await removerArquivoEnviado(req.file.path);
    return res.status(404).json({ erro: 'Auditoria ou resposta não encontrada.' });
  }

  try {
    const evidencia = await EvidenciaModel.criar({
      auditoriaId: req.params.id,
      respostaId,
      usuarioId: req.usuario.id,
      nomeOriginal: req.file.originalname,
      nomeArquivo: req.file.filename,
      caminho: `/uploads/evidencias/${req.file.filename}`,
      mimeType: req.file.mimetype,
      tamanhoBytes: req.file.size,
      descricao: req.body.descricao,
    });

    return res.status(201).json(evidencia);
  } catch (error) {
    await removerArquivoEnviado(req.file.path);
    throw error;
  }
}

async function remover(req, res) {
  const evidencia = await EvidenciaModel.remover(
    req.params.evidenciaId,
    req.params.id,
    req.usuario.empresa_id
  );

  if (!evidencia) {
    return res.status(404).json({ erro: 'Evidência não encontrada.' });
  }

  const caminhoFisico = path.join(
    __dirname,
    '..',
    evidencia.caminho.replace(/^\/uploads\//, '')
  );

  await removerArquivoEnviado(caminhoFisico);

  return res.json({ mensagem: 'Evidência removida com sucesso.' });
}

async function removerArquivoEnviado(caminho) {
  try {
    await fs.unlink(caminho);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn('Não foi possível remover arquivo de evidência:', error.message);
    }
  }
}

module.exports = { listar, criar, remover };
