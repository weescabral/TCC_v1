const express = require('express');
const PlanoAcaoController = require('../controllers/PlanoAcaoController');
const asyncHandler = require('../utils/asyncHandler');
const { autenticar } = require('../middlewares/authMiddleware');

const router = express.Router();
router.use(autenticar);

router.get('/', asyncHandler(PlanoAcaoController.listar));
router.patch('/:id', asyncHandler(PlanoAcaoController.atualizar));

module.exports = router;
