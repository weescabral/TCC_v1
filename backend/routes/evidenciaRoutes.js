const express = require('express');
const path = require('path');
const multer = require('multer');
const EvidenciaController = require('../controllers/EvidenciaController');
const asyncHandler = require('../utils/asyncHandler');
const { autenticar } = require('../middlewares/authMiddleware');

const router = express.Router();
router.use(autenticar);

const extensoesPermitidas = new Set([
  '.jpg', '.jpeg', '.png', '.webp',
  '.pdf', '.doc', '.docx',
  '.xls', '.xlsx',
]);

// Mantém o arquivo em memória apenas durante a transferência para o Cloudinary.
// Assim, nenhuma gravação local em backend/uploads dispara observadores de arquivos.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const extensao = path.extname(file.originalname).toLowerCase();
    if (!extensoesPermitidas.has(extensao)) {
      const erro = new Error('Tipo de arquivo não permitido para evidência.');
      erro.status = 400;
      return cb(erro);
    }
    return cb(null, true);
  },
});

router.get('/auditorias/:id', asyncHandler(EvidenciaController.listar));
router.post(
  '/auditorias/:id',
  upload.single('arquivo'),
  asyncHandler(EvidenciaController.criar)
);
router.delete(
  '/auditorias/:id/:evidenciaId',
  asyncHandler(EvidenciaController.remover)
);

module.exports = router;
