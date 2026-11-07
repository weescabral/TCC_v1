const express = require('express');
const SetorController = require('../controllers/SetorController');
const asyncHandler = require('../utils/asyncHandler');
const { autenticar, autorizar } = require('../middlewares/authMiddleware');

const router = express.Router();
router.use(autenticar);

router.get('/', asyncHandler(SetorController.listar));
router.get('/auditores', autorizar('administrador'), asyncHandler(SetorController.listarAuditores));
router.get('/:id', asyncHandler(SetorController.buscar));
router.post('/', autorizar('administrador'), asyncHandler(SetorController.criar));
router.put('/:id', autorizar('administrador'), asyncHandler(SetorController.atualizar));
router.delete('/:id', autorizar('administrador'), asyncHandler(SetorController.remover));

module.exports = router;
