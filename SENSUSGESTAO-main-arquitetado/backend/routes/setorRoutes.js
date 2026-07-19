const express = require('express');
const SetorController = require('../controllers/SetorController');
const asyncHandler = require('../utils/asyncHandler');
const { autenticar } = require('../middlewares/authMiddleware');

const router = express.Router();
router.use(autenticar);

router.get('/', asyncHandler(SetorController.listar));
router.get('/:id', asyncHandler(SetorController.buscar));
router.post('/', asyncHandler(SetorController.criar));
router.put('/:id', asyncHandler(SetorController.atualizar));
router.delete('/:id', asyncHandler(SetorController.remover));

module.exports = router;
