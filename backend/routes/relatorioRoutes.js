const express = require('express');
const RelatorioController = require('../controllers/RelatorioController');
const asyncHandler = require('../utils/asyncHandler');
const { autenticar } = require('../middlewares/authMiddleware');

const router = express.Router();
router.use(autenticar);
router.get('/opcoes', asyncHandler(RelatorioController.opcoes));
router.get('/', asyncHandler(RelatorioController.gerar));
router.post('/enviar', asyncHandler(RelatorioController.enviar));

module.exports = router;
