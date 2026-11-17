const express = require('express');
const EmpresaController = require('../controllers/EmpresaController');
const asyncHandler = require('../utils/asyncHandler');
const { autenticar, autorizar } = require('../middlewares/authMiddleware');

const router = express.Router();
router.use(autenticar);

// Dados institucionais da empresa vinculada à sessão.
router.get('/minha', autorizar('administrador'), asyncHandler(EmpresaController.minha));
router.put('/minha', autorizar('administrador'), asyncHandler(EmpresaController.atualizarMinha));

router.get('/', asyncHandler(EmpresaController.listar));
router.get('/:id', asyncHandler(EmpresaController.buscar));
router.post('/', autorizar('administrador'), asyncHandler(EmpresaController.criar));
router.put('/:id', autorizar('administrador'), asyncHandler(EmpresaController.atualizar));
router.delete('/:id', autorizar('administrador'), asyncHandler(EmpresaController.remover));

module.exports = router;
