const express = require('express');
const AuditoriaController = require('../controllers/AuditoriaController');
const asyncHandler = require('../utils/asyncHandler');
const { autenticar } = require('../middlewares/authMiddleware');

const router = express.Router();
router.use(autenticar);

router.get('/', asyncHandler(AuditoriaController.listar));
router.get('/:id', asyncHandler(AuditoriaController.buscar));
router.post('/', asyncHandler(AuditoriaController.criar));
router.post('/:id/respostas', asyncHandler(AuditoriaController.salvarResposta));
router.post('/:id/finalizar', asyncHandler(AuditoriaController.finalizar));

module.exports = router;
