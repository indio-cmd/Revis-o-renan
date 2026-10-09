import express from 'express'
import ControllerUser from '../controller/user.js'
import authMiddleware from '../middleware/auth.js'

const router = express.Router()

router.get('/buscar', authMiddleware, ControllerUser.Buscar)
router.get('/buscarum', authMiddleware, ControllerUser.Buscarum)
router.post('/criar',ControllerUser.Criar)
router.put('/alterar', authMiddleware, ControllerUser.Altera)
router.delete('/deletar', authMiddleware, ControllerUser.Deletar)
router.post('/login',ControllerUser.Login)



export default router