import {Router} from 'express'
import { actualizarPassword, actualizarPerfil, comprobarTokenPasword, confirmEmail, login, nuevoPassword, perfilUsuario, recuperarPassword, registro } from '../controllers/admin_controller.js'
import verificarAutenticacion from '../middlewares/autenticacion.js'
const router = Router()

//RUTAS PÚBLICAS
router.post('/registro', registro)
router.get('/confirmar/:token',confirmEmail)
router.post('/login',login)
router.post('/recuperar-password',recuperarPassword)
router.get('/recuperar-password/:token',comprobarTokenPasword)
router.post("/nuevo-password/:token",nuevoPassword)

//RUTAS PRIVADAS
router.get('/perfiladmin',verificarAutenticacion,perfilUsuario)
router.put('/admin/actualizarpassword',verificarAutenticacion, actualizarPassword)
router.put('/admin/:id',verificarAutenticacion,actualizarPerfil)

export default router
