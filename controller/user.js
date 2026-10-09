import ServiceUser from '../service/user.js'

class ControllerUser {

    async Buscar(req, res) {
        try {
            const users = await ServiceUser.Buscar()

            res.status(200).send({ users })
        } catch (error) {
            res.status(500).send({ message: error.message })
        }
    }

    async Buscarum(req, res) {
        try {
            const id = req.session.id
            const user = await ServiceUser.Buscarum(id)

            res.status(200).send({ user })
        } catch (error) {
            res.status(500).send({ message: error.message })
        }
    }

    async Criar(req, res) {
        try {
            const { name, email, password } = req.body

            await ServiceUser.Criar(name, email, password)

            res.status(201).send({ message: "Usuário criado com sucesso!" })
        } catch (error) {
            res.status(500).send({ message: error.message })
        }
    }

    async Altera(req, res) {
        try {
            const id = req.session.id
            const { name, email, password } = req.body

            await ServiceUser.Altera(id, name, email, password)

            res.status(200).send({ message: "Usuário alterado com sucesso!" })
        } catch (error) {
            res.status(500).send({ message: error.message })
        }
    }

    async Deletar(req, res) {
        try {
            const id = req.session.id

            await ServiceUser.Deletar(id)

            res.status(200).send({ message: "Usuário deletado com sucesso!" })
        } catch (error) {
            res.status(500).send({ message: error.message })
        }
    }

    async Login(req, res) {
        try {
            const { email, password } = req.body

            const token = await ServiceUser.Login(email, password)

            res.status(200).sen({ token })
        } catch (error) {
            res.status(500).send({ message: error.message })
        }
    }


}
export default new ControllerUser 