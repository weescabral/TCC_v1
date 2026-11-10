const { v2: cloudinary } = require('cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

function verificarConfiguracao() {
  const obrigatorias = [
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
  ];

  const ausentes = obrigatorias.filter((nome) => !process.env[nome]);
  if (ausentes.length) {
    const erro = new Error(`Configuração do Cloudinary incompleta: ${ausentes.join(', ')}`);
    erro.status = 503;
    throw erro;
  }
}

function enviarBuffer(buffer, opcoes = {}) {
  verificarConfiguracao();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'sensus5s/evidencias',
        resource_type: 'auto',
        unique_filename: true,
        overwrite: false,
        ...opcoes,
      },
      (erro, resultado) => {
        if (erro) return reject(erro);
        if (!resultado?.secure_url || !resultado?.public_id) {
          return reject(new Error('Cloudinary não retornou os dados da imagem.'));
        }
        return resolve(resultado);
      }
    );

    stream.end(buffer);
  });
}

async function excluirArquivo(publicId, mimeType) {
  verificarConfiguracao();
  if (!publicId) return null;

  // PDFs são entregues pelo Cloudinary como imagem; os demais documentos
  // são tratados como recursos raw. Fotografias usam resource_type image.
  const resourceType = String(mimeType || '').startsWith('image/') || mimeType === 'application/pdf'
    ? 'image'
    : 'raw';

  return cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType,
    invalidate: true,
  });
}

module.exports = { enviarBuffer, excluirArquivo };
