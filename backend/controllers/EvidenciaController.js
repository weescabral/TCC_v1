const EvidenciaModel = require('../models/EvidenciaModel');
const CloudinaryService = require('../config/cloudinary');

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
    return res.status(400).json({ erro: 'resposta_id inválido.' });
  }

  const contexto = await EvidenciaModel.validarContexto(
    req.params.id,
    respostaId,
    req.usuario.empresa_id
  );

  if (!contexto) {
    return res.status(404).json({ erro: 'Auditoria ou resposta não encontrada.' });
  }

  const arquivoCloud = await CloudinaryService.enviarBuffer(req.file.buffer, {
    resource_type: 'auto',
    context: {
      auditoria_id: String(req.params.id),
      resposta_id: respostaId ? String(respostaId) : '',
    },
  });

  try {
    const evidencia = await EvidenciaModel.criar({
      auditoriaId: req.params.id,
      respostaId,
      usuarioId: req.usuario.id,
      nomeOriginal: req.file.originalname,
      // O campo existente comporta o public_id e permite excluir da nuvem depois.
      nomeArquivo: arquivoCloud.public_id,
      caminho: arquivoCloud.secure_url,
      mimeType: req.file.mimetype,
      tamanhoBytes: req.file.size,
      descricao: req.body.descricao,
    });

    return res.status(201).json(evidencia);
  } catch (error) {
    // Evita deixar um arquivo órfão na nuvem se o INSERT no MySQL falhar.
    try {
      await CloudinaryService.excluirArquivo(arquivoCloud.public_id, req.file.mimetype);
    } catch (erroCloud) {
      console.error('Não foi possível compensar o upload no Cloudinary:', erroCloud.message);
    }
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

  try {
    if (String(evidencia.caminho || '').includes('res.cloudinary.com')) {
      await CloudinaryService.excluirArquivo(evidencia.nome_arquivo, evidencia.mime_type);
    } else if (String(evidencia.caminho || '').startsWith('/uploads/')) {
      // Compatibilidade com evidências antigas armazenadas no disco local.
      const fs = require('fs/promises');
      const path = require('path');
      const caminhoFisico = path.join(
        __dirname,
        '..',
        evidencia.caminho.replace(/^\/uploads\//, 'uploads/')
      );
      try {
        await fs.unlink(caminhoFisico);
      } catch (erroArquivo) {
        if (erroArquivo.code !== 'ENOENT') throw erroArquivo;
      }
    }
  } catch (erro) {
    // O registro já foi removido do banco. Deixamos o erro explícito no log
    // para permitir limpeza manual do recurso remoto, sem quebrar a resposta.
    console.error('Evidência removida do banco, mas falhou a exclusão do arquivo remoto:', erro.message);
  }

  return res.json({ mensagem: 'Evidência removida com sucesso.' });
}

module.exports = { listar, criar, remover };
