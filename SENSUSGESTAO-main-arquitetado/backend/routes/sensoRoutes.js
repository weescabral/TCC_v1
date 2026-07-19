const express = require('express');
const SensoController = require('../controllers/SensoController');
const asyncHandler = require('../utils/asyncHandler');
const { autenticar } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(autenticar);

router.get(
    '/',
    asyncHandler(SensoController.listar)
);

router.get(
    '/:id',
    asyncHandler(SensoController.buscarPorId)
);

module.exports = router;