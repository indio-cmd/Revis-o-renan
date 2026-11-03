import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './style.css'
import { buscarUsers, buscarUmUser, criarUser, alterarUser, deletarUser } from '../../api/user'

function Users(){
    const navigate = useNavigate()
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [resultado, setResultado] = useState(null)
    const [erro, setErro] = useState('')

    const executar = async (acao) => {
        try {
            setErro('')
            const data = await acao()
            setResultado(data)
            return data
        } catch (error) {
            setResultado(null)
            setErro(error.response?.data?.message || error.message)
        }
    }

    const handleBuscar = () => executar(() => buscarUsers())

    const handleBuscarUm = () => executar(() => buscarUmUser())

    const handleCriar = () => executar(() => criarUser(name, email, password))

    const handleAlterar = () => executar(() => alterarUser(name, email, password))

    const handleDeletar = async () => {
        if(!window.confirm("Isso deleta o usuário logado. Continuar?")){
            return
        }

        const data = await executar(() => deletarUser())

        if(data){
            localStorage.removeItem('token')
            navigate('/')
        }
    }

    return(
        <div className="users-container">
            <div className="users-box">
                <h2>Teste de Usuários</h2>

                <div className="input-group">
                    <label htmlFor="name">Nome:</label>
                    <input
                        type="text"
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                </div>
                <div className="input-group">
                    <label htmlFor="email">Email:</label>
                    <input
                        type="text"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>
                <div className="input-group">
                    <label htmlFor="password">Senha:</label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>

                <div className="users-buttons">
                    <button type="button" className="button" onClick={handleCriar}>Criar</button>
                    <button type="button" className="button" onClick={handleAlterar}>Alterar (meu usuário)</button>
                    <button type="button" className="button" onClick={handleBuscar}>Buscar todos</button>
                    <button type="button" className="button" onClick={handleBuscarUm}>Buscar um (meu usuário)</button>
                    <button type="button" className="button delete-button" onClick={handleDeletar}>Deletar (meu usuário)</button>
                </div>

                {erro && <p className="error">{erro}</p>}

                {resultado && (
                    <pre className="users-result">{JSON.stringify(resultado, null, 2)}</pre>
                )}
            </div>
        </div>
    )
}

export default Users
