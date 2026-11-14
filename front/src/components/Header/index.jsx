import './style.css'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { jwtDecode } from 'jwt-decode'

// lê quanto tempo falta para o token expirar
function lerSessao() {
    try {
        const token = localStorage.getItem('token')
        const { exp, iat } = jwtDecode(token)
        const restante = Math.max(0, Math.floor(exp - Date.now() / 1000))
        const total = Math.max(1, exp - iat)
        return { restante, total }
    } catch {
        return { restante: 0, total: 1 }
    }
}

function Header(){

    const navigate = useNavigate()
    const [sessao, setSessao] = useState(lerSessao)

    const handleLogout = () => {
        localStorage.removeItem('token')
        return navigate('/')
    }

    // contagem regressiva da sessão (o token do back dura pouco tempo)
    useEffect(() => {
        const timer = setInterval(() => {
            const atual = lerSessao()
            setSessao(atual)

            if(atual.restante <= 0){
                localStorage.removeItem('token')
                navigate('/')
            }
        }, 1000)

        return () => clearInterval(timer)
    }, [navigate])

    const porcentagem = Math.min(100, (sessao.restante / sessao.total) * 100)
    const acabando = sessao.restante <= 10

    return(
        <header className="app-header">
            <div className="app-brand">
                <span className="app-brand-dot"></span>
                <span className="app-brand-text">Painel</span>
            </div>

            <div className="app-header-right">
                <div className={`app-session ${acabando ? 'warn' : ''}`} title="Tempo restante da sessão">
                    <span className="app-session-label">Sessão</span>
                    <span className="app-session-time">{sessao.restante}s</span>
                    <span className="app-session-bar">
                        <span className="app-session-fill" style={{ width: `${porcentagem}%` }}></span>
                    </span>
                </div>

                <button type="button" className="app-logout" onClick={handleLogout}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                        <polyline points="16 17 21 12 16 7"></polyline>
                        <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                    Sair
                </button>
            </div>
        </header>
    )
}

export default Header
