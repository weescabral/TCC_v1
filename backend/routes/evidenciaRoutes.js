const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const EvidenciaController = require('../controllers/EvidenciaController');
const asyncHandler = require('../utils/asyncHandler');
const { autenticar } = require('../middlewares/authMiddleware');

const router = express.Router();
router.use(autenticar);

const pastaUpload = path.join(__dirname, '..', 'uploads', 'evidencias');
fs.mkdirSync(pastaUpload, { recursive: true });

const extensoesPermitidas = new Set([
  '.jpg', '.jpeg', '.png', '.webp',
  '.pdf', '.doc', '.docx',
  '.xls', '.xlsx',
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, pastaUpload),
  filename: (_req, file, cb) => {
    const extensao = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, extensao)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 80) || 'evidencia';
    cb(null, `${Date.now()}-${base}${extensao}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const extensao = path.extname(file.originalname).toLowerCase();
    if (!extensoesPermitidas.has(extensao)) {
      return cb(new Error('Tipo de arquivo não permitido para evidência.'));
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
