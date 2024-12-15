import {sendMailToRecoveryPassword, sendMailToUser} from "../config/nodemailer.js"
import generarJWT from "../helpers/CrearJWT.js"
import Admin from "../models/Admin.js"
import mongoose from "mongoose";

const registro = async (req,res)=>{
    //Paso 1 - Tomar datos del request
    const{email,password}= req.body

    //Paso 2 - Validar datos
    if (Object.values(req.body).includes("")) return res.status(400).json({msg:"Lo sentimos, debes llenar todos los campos"})

    const verificarEmailBDD = await Admin.findOne({email})
    if(verificarEmailBDD) return res.status(400).json({msg:"Lo sentimos, el email ya se encuentra registrado"})
    
    //Paso 3 - Interactuar con BDD
    const nuevoAdmin = new Admin(req.body)
    nuevoAdmin.password = await nuevoAdmin.encrypPassword(password)
    const token = nuevoAdmin.crearToken()
    await sendMailToUser(email,token)
    await nuevoAdmin.save()
    res.status(200).json({msg:"Revisa tu correo electrónico para confirmar tu cuenta"})

}

const confirmEmail = async (req,res)=>{
    //Paso 1 - Tomar datos del request
    const {token}=req.params
    
    //Paso 2 - Validar datos
    if(!(token)) return res.status(400).json({msg:"Lo sentimos, no se puede validar la cuenta"})
    const adminBDD = await Admin.findOne({token})
    if(!adminBDD?.token) return res.status(400).json({msg:"La cuenta ya ha sido confirmada"})
    
    //Paso 3 - Interactuar con BDD
    adminBDD.token = null
    adminBDD.confirmEmail=true
    await adminBDD.save()

    res.status(200).json({msg:"Token confirmado, ya puedes iniciar sesión"}) 
}

const login = async (req,res) => {
    //Paso 1 - Tomar datos del request
    const{email,password}= req.body

    //Paso 2 - Validar datos
    if (Object.values(req.body).includes("")) return res.status(400).json({msg:"Lo sentimos, debes llenar todos los campos"})

    const adminBDD = await Admin.findOne({email}).select("-status -__v -updatedAt -createdAt ")
    if(adminBDD?.confirmEmail===false) return res.status(400).json({msg:"Lo sentimos, debe verificar su cuenta"})

    if(!adminBDD) return res.status(400).json({msg:"Lo sentimos, el usuario no se encuentra registrado"})
        
    const verificarPassword = await adminBDD.matchPassword(password)
    if(!verificarPassword) return res.status(400).json({msg:"Lo sentimos, el password no es el correcto"})

    //Paso 3 - Interactuar con BDD
    const tokenJWT = generarJWT(adminBDD._id,"admin")
    res.status(200).json({adminBDD,tokenJWT})
}

const recuperarPassword = async(req,res)=>{
    //Paso 1 - Tomar datos del request
    const {email} = req.body

    //Paso 2 - Validar datos
    if (Object.values(req.body).includes("")) return res.status(400).json({msg:"Lo sentimos, debes llenar todos los campos"})
    const adminBDD = await Admin.findOne({email})
    if(!adminBDD) return res.status(400).json({msg:"Lo sentimos, el usuario no se encuentra registrado"})

    //Paso 3 - Interactuar con BDD
    const token = adminBDD.crearToken()
    adminBDD.token=token
    await sendMailToRecoveryPassword(email,token)
    await adminBDD.save()
    res.status(200).json({msg:"Revisa tu correo electrónico para reestablecer tu cuenta"})
}


const comprobarTokenPasword = async (req,res)=>{
    //Paso 1 - Tomar datos del request
    const {token}=req.params

    //Paso 2 - Validar datos
    if(!(token)) return res.status(400).json({msg:"Lo sentimos, no se puede validar la cuenta"})
    const adminBDD = await Admin.findOne({token:req.params.token})
    if(adminBDD?.token !== token) return res.status(400).json({msg:"Lo sentimos, no se puede validar la cuenta"})

    //Paso 3 - Interactuar con BDD
    await adminBDD.save()
  
    res.status(200).json({msg:"Token confirmado, ya puedes crear tu nuevo password"}) 
}


const nuevoPassword = async (req,res)=>{
    //Paso 1 - Tomar datos del request
    const{password,confirmpassword} = req.body

    //Paso 2 - Validar datos
    if (Object.values(req.body).includes("")) return res.status(400).json({msg:"Lo sentimos, debes llenar todos los campos"})
    if(password != confirmpassword) return res.status(400).json({msg:"Lo sentimos, los passwords no coinciden"})
    const adminBDD = await Admin.findOne({token:req.params.token})
    if(adminBDD?.token !== req.params.token) return res.status(400).json({msg:"Lo sentimos, no se puede validar la cuenta"})

    //Paso 3 - Interactuar con BDD
    adminBDD.token = null
    adminBDD.password = await adminBDD.encrypPassword(password)
    await adminBDD.save()
    res.status(200).json({msg:"Felicitaciones, ya puedes iniciar sesión con tu nuevo password"}) 
}

const perfilUsuario =(req,res)=>{
    delete req.adminBDD.token
    delete req.adminBDD.confirmEmail
    delete req.adminBDD.createdAt
    delete req.adminBDD.updatedAt
    delete req.adminBDD.__v
    res.status(200).json(req.adminBDD)
}

const actualizarPerfil = async (req,res)=>{
    const {id} = req.params
    if( !mongoose.Types.ObjectId.isValid(id) ) return res.status(404).json({msg:`Lo sentimos, debe ser un id válido`});
    if (Object.values(req.body).includes("")) return res.status(400).json({msg:"Lo sentimos, debes llenar todos los campos"})
    const adminBDD = await Admin.findById(id)
    if(!adminBDD) return res.status(404).json({msg:`Lo sentimos, no existe el Administrador ${id}`})
    if (adminBDD.email !=  req.body.email)
    {
        const adminBDDMail = await Admin.findOne({email:req.body.email})
        if (adminBDDMail)
        {
            return res.status(404).json({msg:`Lo sentimos, el existe ya se encuentra registrado`})  
        }
    }
		adminBDD.nombre = req.body.nombre || adminBDD?.nombre
    adminBDD.apellido = req.body.apellido  || adminBDD?.apellido
    adminBDD.direccion = req.body.direccion ||  adminBDD?.direccion
    adminBDD.telefono = req.body.telefono || adminBDD?.telefono
    adminBDD.email = req.body.email || adminBDD?.email
    await adminBDD.save()
    res.status(200).json({msg:"Perfil actualizado correctamente"})
}

const actualizarPassword = async (req,res)=>{
    const adminBDD = await Admin.findById(req.adminBDD._id)
    if(!adminBDD) return res.status(404).json({msg:`Lo sentimos, no existe el Administrador ${id}`})
    const verificarPassword = await adminBDD.matchPassword(req.body.passwordactual)
    if(!verificarPassword) return res.status(404).json({msg:"Lo sentimos, el password actual no es el correcto"})
    adminBDD.password = await adminBDD.encrypPassword(req.body.passwordnuevo)
    await adminBDD.save()
    res.status(200).json({msg:"Password actualizado correctamente"})
}

export {
    registro,
    confirmEmail,
    login,
    recuperarPassword,
    comprobarTokenPasword,
    nuevoPassword,
    perfilUsuario,
    actualizarPerfil,
    actualizarPassword

}