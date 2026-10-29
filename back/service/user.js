import RepositoryUser from '../repository/user.js'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

const SECRET = 'batata123'
const SALT = 12


class ServiceUser {

    async Buscar() {
        return RepositoryUser.Buscar()
    }

    async Buscarum(id) {
        if (!id) {
            throw new Error("Favor informar o ID")
        }

        return RepositoryUser.Buscarum(id)
    }

    async Criar(name, email, password) {
        if (!name || !email || !password) {
            throw new Error("Favor informar todos os parâmetros!!")
        }

        const cryptPass = await bcrypt.hash(password, SALT)

        await RepositoryUser.Criar(name, email, cryptPass)
    }

    async Altera(id, name, email, password) {
        if (!id || !name || !email || !password) {
            throw new Error("Favor informar todos os parâmetros!!")
        }

        const cryptPass = !password
            ? undefined
            : await bcrypt.hash(password, SALT)


        await RepositoryUser.Alterar(id, name, email, cryptPass)
    }

    async Deletar(id) {
        if (!id) {
            throw new Error("Favor informar o ID")
        }

        await RepositoryUser.Deletar(id)
    }

    async Login(email, password) {
        if(!email || !password) {
            throw new Error("Email ou senha inválido")
        }

        const user = await RepositoryUser.BuscarEmail(email)

        if(
            !user 
            || !(await bcrypt.compare(String(password), user.password))
        ){
            throw new Error("Email ou senha inválido")
        }

        // token
        return jwt.sign(
            {
                id: user.id,
                email: user.email
            },
            SECRET,
            {
                expiresIn: 60
            }
        )
    }

}

export default new ServiceUser() 