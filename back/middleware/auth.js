import jwt from 'jsonwebtoken'

const SECRET = 'batata123'

export default async function authMiddleware(req, res, next) {
    try {
        const token = req.headers['authorization']

        if(!token){
            throw new Error("")
        }

        const decoded = jwt.verify(token, SECRET)

        req.session = decoded
        next()
    } catch (error) {
        res.status(403).send({message: "Usuário ou senha inválido"})
    }


}