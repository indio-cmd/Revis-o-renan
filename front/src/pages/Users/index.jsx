import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { jwtDecode } from 'jwt-decode'
import './style.css'
import { buscarUsers, buscarUmUser, criarUser, alterarUser, deletarUser } from '../../api/user'

// id do usuário logado (vem dentro do token)
function pegarIdLogado() {
    try {
        return jwtDecode(localStorage.getItem('token')).id
    } catch {
        return null
    }
}

function formatarData(data) {
    if (!data) return ''
    return new Date(data).toLocaleDateString('pt-BR')
}

function Users(){
    const navigate = useNavigate()
    const idLogado = pegarIdLogado()

    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')

    const [users, setUsers] = useState(null)
    const [me, setMe] = useState(null)
    const [raw, setRaw] = useState(null)

    const [loading, setLoading] = useState('')
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [toast, setToast] = useState(null)

    // some com o aviso depois de alguns segundos
    useEffect(() => {
        if (!toast) return
        const timer = setTimeout(() => setToast(null), 3500)
        return () => clearTimeout(timer)
    }, [toast])

    const showToast = (type, text) => {
        setToast({ type, text, id: Date.now() })
    }

    // roda uma ação do back com loading, erro e aviso
    const executar = async (key, acao, aoSucesso) => {
        try {
            setLoading(key)
            const data = await acao()
            setRaw(data)
            if (aoSucesso) await aoSucesso(data)
        } catch (error) {
            const mensagem = error.response?.data?.message || error.message
            setRaw({ erro: mensagem })
            showToast('error', mensagem)
        } finally {
            setLoading('')
        }
    }

    // atualiza o que já estava na tela depois de criar ou alterar
    const atualizarTela = async () => {
        if (users) {
            const data = await buscarUsers()
            setUsers(data.users)
        }
        if (me) {
            const data = await buscarUmUser()
            setMe(data.user)
        }
    }

    const handleBuscar = () => executar('buscar', () => buscarUsers(), (data) => {
        setUsers(data.users)
        showToast('success', `${data.users.length} usuário(s) encontrado(s)`)
    })

    const handleBuscarUm = () => executar('buscarum', () => buscarUmUser(), (data) => {
        setMe(data.user)
        setName(data.user.name)
        setEmail(data.user.email)
        showToast('success', 'Seus dados foram carregados no formulário')
    })

    const handleCriar = () => executar('criar', () => criarUser(name, email, password), async (data) => {
        showToast('success', data.message)
        setPassword('')
        await atualizarTela()
    })

    const handleAlterar = () => executar('alterar', () => alterarUser(name, email, password), async (data) => {
        showToast('success', data.message)
        setPassword('')
        await atualizarTela()
    })

    const handleDeletar = () => executar('deletar', () => deletarUser(), () => {
        localStorage.removeItem('token')
        navigate('/')
    })

    return(
        <div className="dash">
            <div className="dash-glow"></div>

            <section className="dash-hero">
                <h1>Usuários</h1>
                <p>Crie, busque, altere e delete direto pelo navegador.</p>
            </section>

            <div className="dash-grid">

                {/* formulário */}
                <div className="dash-card dash-form" style={{ animationDelay: '0.1s' }}>
                    <h2>Dados do usuário</h2>

                    <div className="dash-field">
                        <label htmlFor="name">Nome</label>
                        <input
                            type="text"
                            id="name"
                            placeholder="Digite o nome"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    <div className="dash-field">
                        <label htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            placeholder="Digite o email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div className="dash-field">
                        <label htmlFor="password">Senha</label>
                        <input
                            type="password"
                            id="password"
                            placeholder="Digite a senha"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <div className="dash-actions">
                        <button type="button" className="dash-btn primary" onClick={handleCriar} disabled={loading !== ''}>
                            {loading === 'criar' ? <span className="dash-spinner"></span> : 'Criar'}
                        </button>
                        <button type="button" className="dash-btn outline" onClick={handleAlterar} disabled={loading !== ''}>
                            {loading === 'alterar' ? <span className="dash-spinner"></span> : 'Alterar meu usuário'}
                        </button>
                    </div>

                    <div className="dash-danger">
                        <span>Zona de perigo</span>

                        {!confirmDelete ? (
                            <button type="button" className="dash-btn danger" onClick={() => setConfirmDelete(true)} disabled={loading !== ''}>
                                Deletar meu usuário
                            </button>
                        ) : (
                            <div className="dash-confirm">
                                <p>Isso apaga o usuário logado. Tem certeza?</p>
                                <div className="dash-actions">
                                    <button type="button" className="dash-btn danger solid" onClick={handleDeletar} disabled={loading !== ''}>
                                        {loading === 'deletar' ? <span className="dash-spinner"></span> : 'Sim, deletar'}
                                    </button>
                                    <button type="button" className="dash-btn outline" onClick={() => setConfirmDelete(false)}>
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* lista */}
                <div className="dash-card dash-list" style={{ animationDelay: '0.2s' }}>
                    <div className="dash-list-header">
                        <h2>Lista</h2>
                        <div className="dash-actions">
                            <button type="button" className="dash-btn small outline" onClick={handleBuscarUm} disabled={loading !== ''}>
                                {loading === 'buscarum' ? <span className="dash-spinner"></span> : 'Buscar um (meu usuário)'}
                            </button>
                            <button type="button" className="dash-btn small primary" onClick={handleBuscar} disabled={loading !== ''}>
                                {loading === 'buscar' ? <span className="dash-spinner"></span> : 'Buscar todos'}
                            </button>
                        </div>
                    </div>

                    {me && (
                        <div className="dash-me">
                            <span className="dash-me-tag">Meu usuário</span>
                            <strong>{me.name}</strong>
                            <span>{me.email}</span>
                        </div>
                    )}

                    {loading === 'buscar' && !users && (
                        <div className="dash-skeletons">
                            <div className="dash-skeleton"></div>
                            <div className="dash-skeleton"></div>
                            <div className="dash-skeleton"></div>
                        </div>
                    )}

                    {!users && loading !== 'buscar' && (
                        <div className="dash-empty">
                            <div className="dash-empty-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="9" cy="7" r="4"></circle>
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                </svg>
                            </div>
                            <p>Nenhum usuário carregado.</p>
                            <span>Clique em "Buscar todos".</span>
                        </div>
                    )}

                    {users && users.length === 0 && (
                        <div className="dash-empty">
                            <p>Nenhum usuário cadastrado.</p>
                        </div>
                    )}

                    {users && users.length > 0 && (
                        <ul className="dash-users">
                            {users.map((u, i) => (
                                <li
                                    key={u.id}
                                    className="dash-user"
                                    style={{ animationDelay: `${i * 70}ms`, '--hue': (u.id * 47) % 360 }}
                                >
                                    <div className="dash-avatar">{u.name?.charAt(0).toUpperCase()}</div>
                                    <div className="dash-user-info">
                                        <strong>
                                            {u.name}
                                            {u.id === idLogado && <span className="dash-badge">Você</span>}
                                        </strong>
                                        <span>{u.email}</span>
                                    </div>
                                    <div className="dash-user-meta">
                                        <span>#{u.id}</span>
                                        <span>{formatarData(u.createdAt)}</span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            <details className="dash-raw">
                <summary>Resposta da API (para teste)</summary>
                <pre>{raw ? JSON.stringify(raw, null, 2) : 'Ainda não fez nenhuma requisição.'}</pre>
            </details>

            {toast && (
                <div key={toast.id} className={`dash-toast ${toast.type}`}>
                    {toast.text}
                </div>
            )}
        </div>
    )
}

export default Users
