const express = require('express');
const UsuarioController = require('../controllers/UsuarioController');
const asyncHandler = require('../utils/asyncHandler');
const { autenticar, autorizar } = require('../middlewares/authMiddleware');

const router = express.Router();
router.use(autenticar);

router.get('/', autorizar('administrador'), asyncHandler(UsuarioController.listar));
router.post('/', autorizar('administrador'), asyncHandler(UsuarioController.criar));
router.put('/:id', autorizar('administrador'), asyncHandler(UsuarioController.atualizar));
router.patch('/:id/senha', autorizar('administrador'), asyncHandler(UsuarioController.trocarSenha));
router.delete('/:id', autorizar('administrador'), asyncHandler(UsuarioController.remover));

module.exports = router;
