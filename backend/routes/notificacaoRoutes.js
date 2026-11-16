const express = require('express');
const NotificacaoController = require('../controllers/NotificacaoController');
const asyncHandler = require('../utils/asyncHandler');
const { autenticar } = require('../middlewares/authMiddleware');

const router = express.Router();
router.use(autenticar);
router.get('/', asyncHandler(NotificacaoController.listar));
router.patch('/lidas', asyncHandler(NotificacaoController.marcarTodasComoLidas));
router.patch('/:id/lida', asyncHandler(NotificacaoController.marcarComoLida));

module.exports = router;
