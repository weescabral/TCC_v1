const express = require('express');
const CriterioController = require('../controllers/CriterioController');
const asyncHandler = require('../utils/asyncHandler');
const { autenticar } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(autenticar);

// Lista todos os critérios ativos
router.get(
    '/',
    asyncHandler(CriterioController.listar)
);

// Lista somente os critérios de um senso
router.get(
    '/senso/:sensoId',
    asyncHandler(CriterioController.listarPorSenso)
);

// Busca um critério específico
router.get(
    '/:id',
    asyncHandler(CriterioController.buscarPorId)
);

// Cria um novo critério
router.post(
    '/',
    asyncHandler(CriterioController.criar)
);

// Atualiza um critério
router.put(
    '/:id',
    asyncHandler(CriterioController.atualizar)
);

// Desativa um critério
router.delete(
    '/:id',
    asyncHandler(CriterioController.desativar)
);

module.exports = router;