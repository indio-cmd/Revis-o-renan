import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import { Draggable } from 'gsap/Draggable'
import './style.css'
import Lamp from './lamp.jsx'
import { loginUser, criarUser } from '../../api/user'

gsap.registerPlugin(Draggable)

// geometria do cordão elástico
const ANCHOR_X = 245
const ANCHOR_Y = 212
const REST_X = 245
const REST_Y = 300
const MAX_STRETCH = 120
const TRIGGER_PULL = 32

const COLORS = [
    { id: 'amber', hex: '#ffab3d', label: 'Âmbar' },
    { id: 'cyan', hex: '#00f0ff', label: 'Ciano' },
    { id: 'rose', hex: '#ff3385', label: 'Rosa' },
    { id: 'mint', hex: '#00e676', label: 'Menta' },
    { id: 'moonlight', hex: '#d8e5ff', label: 'Luar' }
]

const PARTICLE_THEMES = {
    amber: { fill: '255, 205, 120', glow: '255, 185, 80' },
    cyan: { fill: '140, 245, 255', glow: '0, 240, 255' },
    rose: { fill: '255, 160, 200', glow: '255, 51, 133' },
    mint: { fill: '160, 255, 200', glow: '0, 230, 118' },
    moonlight: { fill: '220, 235, 255', glow: '200, 220, 255' }
}

// ---------- sons (Web Audio) ----------
let audioCtx = null

function initAudio() {
    if (!audioCtx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext
        if (AudioCtx) audioCtx = new AudioCtx()
    }
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume()
    }
}

function playPluck(enabled, pullDist, turningOn) {
    if (!enabled) return
    try {
        initAudio()
        if (!audioCtx) return

        const now = audioCtx.currentTime

        const osc = audioCtx.createOscillator()
        const oscGain = audioCtx.createGain()
        osc.type = 'triangle'

        const startFreq = 480 + Math.min(260, pullDist * 3)
        osc.frequency.setValueAtTime(startFreq, now)
        osc.frequency.exponentialRampToValueAtTime(140, now + 0.12)

        oscGain.gain.setValueAtTime(0.4, now)
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14)

        osc.connect(oscGain)
        oscGain.connect(audioCtx.destination)
        osc.start(now)
        osc.stop(now + 0.15)

        if (pullDist >= TRIGGER_PULL) {
            const snap = audioCtx.createOscillator()
            const snapGain = audioCtx.createGain()
            snap.type = 'sine'
            snap.frequency.setValueAtTime(turningOn ? 1800 : 1500, now + 0.02)
            snap.frequency.exponentialRampToValueAtTime(320, now + 0.06)

            snapGain.gain.setValueAtTime(0.35, now + 0.02)
            snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.065)

            snap.connect(snapGain)
            snapGain.connect(audioCtx.destination)
            snap.start(now + 0.02)
            snap.stop(now + 0.07)

            if (turningOn) {
                const hum = audioCtx.createOscillator()
                const humGain = audioCtx.createGain()
                hum.type = 'sine'
                hum.frequency.setValueAtTime(120, now + 0.05)
                humGain.gain.setValueAtTime(0.001, now)
                humGain.gain.linearRampToValueAtTime(0.06, now + 0.08)
                humGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35)

                hum.connect(humGain)
                humGain.connect(audioCtx.destination)
                hum.start(now + 0.05)
                hum.stop(now + 0.38)
            }
        }
    } catch (e) {
        console.warn('AudioContext error:', e)
    }
}

function playColorSwitch(enabled) {
    if (!enabled) return
    try {
        initAudio()
        if (!audioCtx) return
        const now = audioCtx.currentTime
        const osc = audioCtx.createOscillator()
        const gain = audioCtx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(880, now)
        osc.frequency.exponentialRampToValueAtTime(1320, now + 0.05)
        gain.gain.setValueAtTime(0.12, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06)
        osc.connect(gain)
        gain.connect(audioCtx.destination)
        osc.start(now)
        osc.stop(now + 0.07)
    } catch (e) {
        // sem som, sem problema
    }
}

export default function Login() {
    const navigate = useNavigate()

    const rootRef = useRef(null)
    const canvasRef = useRef(null)
    const isOnRef = useRef(false)
    const soundRef = useRef(true)
    const themeRef = useRef(PARTICLE_THEMES.amber)
    const navTimeoutRef = useRef(null)

    const [color, setColor] = useState('amber')
    const [soundOn, setSoundOn] = useState(true)
    const [mode, setMode] = useState('signin')
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPass, setShowPass] = useState(false)
    const [status, setStatus] = useState('idle') // idle | loading | success
    const [error, setError] = useState('')
    const [created, setCreated] = useState(false)

    // ---------- cena da lâmpada (GSAP + canvas) ----------
    useEffect(() => {
        const root = rootRef.current
        const canvas = canvasRef.current
        const sel = gsap.utils.selector(root)
        const q = (s) => root.querySelector(s)

        const cordBead = q('#cordBead')
        const cordHit = q('#cordHit')
        const elasticCord = q('#elasticCord')
        const shadeAssembly = q('#shadeAssembly')
        const loginCard = q('#loginCard')
        const formStage = q('.form-stage')

        isOnRef.current = false
        root.setAttribute('data-on', 'false')

        gsap.set(cordBead, { x: REST_X, y: REST_Y })

        let twangAmp = 0
        let twangStartTime = 0
        let twangTween = null
        let isSimulatingPull = false
        let pullTimeout = null

        const renderElasticString = (curX, curY) => {
            let twangOffset = 0
            if (twangAmp > 0.05) {
                const elapsed = performance.now() - twangStartTime
                twangOffset = Math.sin(elapsed * 0.05) * twangAmp
            }

            const midX = (ANCHOR_X + curX) / 2 + twangOffset
            const midY = (ANCHOR_Y + curY) / 2

            const stretchRatio = Math.max(1, (curY - ANCHOR_Y) / (REST_Y - ANCHOR_Y))
            const strokeWidth = Math.max(1.6, 2.6 / Math.sqrt(stretchRatio))

            elasticCord.setAttribute('d', `M ${ANCHOR_X} ${ANCHOR_Y} Q ${midX} ${midY} ${curX} ${curY}`)
            elasticCord.setAttribute('stroke-width', strokeWidth.toFixed(2))
        }

        // liga / desliga a lâmpada
        const setLampState = (target) => {
            isOnRef.current = target
            root.setAttribute('data-on', target ? 'true' : 'false')

            gsap.killTweensOf([
                ...sel('.bulb-glow-core, .bulb-filament, .svg-light-beam, .ambient-glow, .shade-reflector-on'),
                loginCard,
                ...sel('#loginCard *')
            ])

            gsap.set(sel('.svg-light-beam, .ambient-glow, .shade-reflector-on'), { clearProps: 'opacity,visibility' })

            const filament = q('.bulb-filament')
            const bulbGlow = q('.bulb-glow-core')

            if (target) {
                gsap.timeline()
                    .to(filament, { stroke: '#fff', duration: 0.05 })
                    .to(bulbGlow, { opacity: 0.95, duration: 0.1, ease: 'power2.out' })

                gsap.fromTo(loginCard,
                    { y: 24, scale: 0.96, opacity: 0 },
                    { y: 0, scale: 1, opacity: 1, duration: 0.5, ease: 'power2.out' }
                )

                gsap.fromTo(
                    sel('.card-header, .auth-tabs, .form-group, .submit-btn'),
                    { y: 14, opacity: 0 },
                    { y: 0, opacity: 1, duration: 0.45, stagger: 0.04, ease: 'power2.out', delay: 0.08 }
                )
            } else {
                gsap.set(bulbGlow, { opacity: 0, clearProps: 'opacity' })
                gsap.set(filament, { stroke: '#555', filter: 'none', clearProps: 'all' })

                gsap.to(loginCard, {
                    y: 16,
                    opacity: 0,
                    scale: 0.96,
                    duration: 0.22,
                    ease: 'power2.in',
                    onComplete: () => {
                        gsap.set(loginCard, { clearProps: 'all' })
                    }
                })

                gsap.set(loginCard, { rotateX: 0, rotateY: 0 })
            }
        }

        const handleElasticRelease = (curX, curY) => {
            const pullDist = curY - REST_Y

            if (pullDist >= TRIGGER_PULL) {
                setLampState(!isOnRef.current)
            }

            playPluck(soundRef.current, pullDist, isOnRef.current)

            // cordão volta com efeito elástico
            gsap.to(cordBead, {
                x: REST_X,
                y: REST_Y,
                duration: 1.15,
                ease: 'elastic.out(2.2, 0.16)',
                onUpdate: () => {
                    renderElasticString(gsap.getProperty(cordBead, 'x'), gsap.getProperty(cordBead, 'y'))
                }
            })

            // vibração do fio
            twangAmp = (curX - REST_X) * 0.4 + (pullDist * 0.3)
            twangStartTime = performance.now()
            if (twangTween) twangTween.kill()
            twangTween = gsap.to({ val: twangAmp }, {
                val: 0,
                duration: 0.9,
                ease: 'power2.out',
                onUpdate: function () {
                    twangAmp = this.targets()[0].val
                }
            })

            gsap.to(shadeAssembly, {
                rotation: 0,
                duration: 0.7,
                ease: 'back.out(2.2)',
                transformOrigin: '215px 175px'
            })
        }

        const [dragger] = Draggable.create(cordBead, {
            type: 'x,y',
            bounds: {
                minY: REST_Y,
                maxY: REST_Y + MAX_STRETCH,
                minX: REST_X - 45,
                maxX: REST_X + 45
            },
            cursor: 'grab',
            activeCursor: 'grabbing',
            onPress() {
                initAudio()
                twangAmp = 0
            },
            onDrag() {
                renderElasticString(this.x, this.y)

                const pullDist = this.y - REST_Y
                const shadeTilt = (pullDist / MAX_STRETCH) * 1.8
                gsap.set(shadeAssembly, {
                    rotation: shadeTilt,
                    transformOrigin: '215px 175px'
                })
            },
            onRelease() {
                handleElasticRelease(this.x, this.y)
            }
        })

        // clique simples no cordão também liga
        const performSimulatedPull = () => {
            isSimulatingPull = true
            initAudio()

            gsap.to(cordBead, {
                y: REST_Y + 50,
                duration: 0.22,
                ease: 'power2.in',
                onUpdate: () => {
                    renderElasticString(REST_X, gsap.getProperty(cordBead, 'y'))
                },
                onComplete: () => {
                    handleElasticRelease(REST_X, REST_Y + 50)
                    pullTimeout = setTimeout(() => {
                        isSimulatingPull = false
                    }, 500)
                }
            })

            gsap.to(shadeAssembly, {
                rotation: 1.8,
                duration: 0.22,
                ease: 'power2.in',
                transformOrigin: '230px 188px'
            })
        }

        const onCordClick = () => {
            if (isSimulatingPull) return
            performSimulatedPull()
        }
        cordHit.addEventListener('click', onCordClick)

        // inclinação 3D do card com o mouse
        const onMouseMove = (e) => {
            if (!isOnRef.current) return
            const rect = formStage.getBoundingClientRect()
            const x = e.clientX - rect.left - rect.width / 2
            const y = e.clientY - rect.top - rect.height / 2

            gsap.to(loginCard, {
                rotateX: -(y / rect.height) * 9,
                rotateY: (x / rect.width) * 9,
                duration: 0.5,
                ease: 'power1.out',
                transformPerspective: 900
            })
        }

        const onMouseLeave = () => {
            gsap.to(loginCard, {
                rotateX: 0,
                rotateY: 0,
                duration: 0.7,
                ease: 'power2.out'
            })
        }

        formStage.addEventListener('mousemove', onMouseMove)
        formStage.addEventListener('mouseleave', onMouseLeave)

        // partículas de poeira
        const ctx = canvas.getContext('2d')
        let width = 0
        let height = 0
        let rafId = 0

        const resizeCanvas = () => {
            width = canvas.width = window.innerWidth
            height = canvas.height = window.innerHeight
        }
        window.addEventListener('resize', resizeCanvas)
        resizeCanvas()

        class Particle {
            constructor() {
                this.reset()
            }
            reset() {
                this.x = Math.random() * width
                this.y = Math.random() * height
                this.radius = Math.random() * 2 + 0.6
                this.vx = (Math.random() - 0.4) * 0.35
                this.vy = -Math.random() * 0.4 - 0.15
                this.alpha = Math.random() * 0.6 + 0.2
                this.pulseSpeed = Math.random() * 0.03 + 0.01
                this.pulse = Math.random() * Math.PI
            }
            update() {
                this.x += this.vx
                this.y += this.vy
                this.pulse += this.pulseSpeed
                if (this.y < 0) this.y = height
                if (this.x < 0) this.x = width
                if (this.x > width) this.x = 0
            }
            draw() {
                const theme = themeRef.current
                const currentAlpha = (Math.sin(this.pulse) * 0.3 + 0.7) * this.alpha
                const factor = isOnRef.current ? 1 : 0.08
                ctx.save()
                ctx.beginPath()
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2)
                ctx.fillStyle = `rgba(${theme.fill}, ${currentAlpha * factor})`
                if (isOnRef.current) {
                    ctx.shadowBlur = 7
                    ctx.shadowColor = `rgba(${theme.glow}, 0.5)`
                }
                ctx.fill()
                ctx.restore()
            }
        }

        const particles = Array.from({ length: 60 }, () => new Particle())

        const renderParticles = () => {
            ctx.clearRect(0, 0, width, height)
            particles.forEach((p) => {
                p.update()
                p.draw()
            })
            rafId = requestAnimationFrame(renderParticles)
        }
        renderParticles()

        renderElasticString(REST_X, REST_Y)

        return () => {
            cancelAnimationFrame(rafId)
            clearTimeout(pullTimeout)
            window.removeEventListener('resize', resizeCanvas)
            cordHit.removeEventListener('click', onCordClick)
            formStage.removeEventListener('mousemove', onMouseMove)
            formStage.removeEventListener('mouseleave', onMouseLeave)
            dragger.kill()
            if (twangTween) twangTween.kill()
            gsap.killTweensOf([cordBead, shadeAssembly, loginCard, ...root.querySelectorAll('*')])
        }
    }, [])

    // limpa o timeout do redirecionamento se sair da página
    useEffect(() => {
        return () => clearTimeout(navTimeoutRef.current)
    }, [])

    // pequena animação no título ao trocar entre Entrar / Cadastrar
    useEffect(() => {
        gsap.fromTo(
            rootRef.current.querySelectorAll('.card-title, .card-subtitle'),
            { opacity: 0.6, y: -4 },
            { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }
        )
    }, [mode])

    const handleColor = (id) => {
        if (id === color) return

        setColor(id)
        themeRef.current = PARTICLE_THEMES[id] || PARTICLE_THEMES.amber
        playColorSwitch(soundRef.current)

        if (isOnRef.current) {
            const targets = rootRef.current.querySelectorAll('.svg-light-beam, .ambient-glow')
            gsap.fromTo(targets,
                { opacity: 0.65 },
                {
                    opacity: 1,
                    duration: 0.45,
                    ease: 'power1.out',
                    onComplete: () => {
                        gsap.set(targets, { clearProps: 'opacity,visibility' })
                    }
                }
            )
        }
    }

    const handleSound = () => {
        const next = !soundOn
        setSoundOn(next)
        soundRef.current = next
        if (next) initAudio()
    }

    const switchMode = (next) => {
        if (next === mode) return
        setMode(next)
        setError('')
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (status !== 'idle') return

        setError('')
        setStatus('loading')

        try {
            if (mode === 'signin') {
                const response = await loginUser(email, password)
                localStorage.setItem('token', response.token)
                setStatus('success')
                navTimeoutRef.current = setTimeout(() => navigate('/users'), 600)
            } else {
                await criarUser(name, email, password)
                setStatus('idle')
                setCreated(true)
            }
        } catch (err) {
            setStatus('idle')
            setError(err.response?.data?.message || err.message)
        }
    }

    const handleGoToLogin = () => {
        setCreated(false)
        setPassword('')
        setMode('signin')
    }

    return (
        // data-on é controlado direto no DOM pelo useEffect (lâmpada); por isso fica fixo aqui
        <div className="lamp-login" data-on="false" data-color={color} ref={rootRef}>
            <div className="ambient-glow"></div>
            <canvas id="dustCanvas" ref={canvasRef}></canvas>

            <div className="quick-controls">
                <div className="color-palette" title="Cor da lâmpada">
                    {COLORS.map((c) => (
                        <button
                            key={c.id}
                            type="button"
                            className={`color-dot-btn ${color === c.id ? 'active' : ''}`}
                            style={{ '--dot-color': c.hex }}
                            aria-label={c.label}
                            title={c.label}
                            onClick={() => handleColor(c.id)}
                        />
                    ))}
                </div>

                <button type="button" className="sound-toggle" title="Som" aria-label="Ligar ou desligar o som" onClick={handleSound}>
                    {soundOn ? (
                        <svg className="sound-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                            <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                            <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                        </svg>
                    ) : (
                        <svg className="sound-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                            <line x1="23" y1="9" x2="17" y2="15"></line>
                            <line x1="17" y1="9" x2="23" y2="15"></line>
                        </svg>
                    )}
                </button>
            </div>

            <main className="scene-container">
                <div className="lamp-stage">
                    <div className="lamp-wrapper">
                        <Lamp />

                        <div className="cord-tooltip">
                            <span>Puxe o cordão para ligar</span>
                            <div className="tooltip-arrow"></div>
                        </div>
                    </div>
                </div>

                <div className="form-stage">
                    <div className="login-card" id="loginCard">

                        <div className="card-header">
                            <h1 className="card-title">{mode === 'signin' ? 'Bem-vindo' : 'Cadastre-se'}</h1>
                            <p className="card-subtitle">
                                {mode === 'signin'
                                    ? 'Entre para continuar na sua conta'
                                    : 'Crie uma conta para começar'}
                            </p>
                        </div>

                        <div className="auth-tabs" data-active={mode}>
                            <button type="button" className={`auth-tab ${mode === 'signin' ? 'active' : ''}`} onClick={() => switchMode('signin')}>Entrar</button>
                            <button type="button" className={`auth-tab ${mode === 'register' ? 'active' : ''}`} onClick={() => switchMode('register')}>Cadastrar</button>
                            <div className="tab-slider"></div>
                        </div>

                        <form className="auth-form" autoComplete="off" onSubmit={handleSubmit}>

                            {mode === 'register' && (
                                <div className="form-group">
                                    <label htmlFor="nameField">Nome</label>
                                    <div className="input-wrapper">
                                        <svg className="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                            <circle cx="12" cy="7" r="4"></circle>
                                        </svg>
                                        <input
                                            type="text"
                                            id="nameField"
                                            placeholder="Digite seu nome"
                                            required
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="form-group">
                                <label htmlFor="emailField">Email</label>
                                <div className="input-wrapper">
                                    <svg className="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                                        <path d="m22 7-10 6L2 7"></path>
                                    </svg>
                                    <input
                                        type="email"
                                        id="emailField"
                                        placeholder="Digite seu email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="passField">Senha</label>
                                <div className="input-wrapper">
                                    <svg className="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                    </svg>
                                    <input
                                        type={showPass ? 'text' : 'password'}
                                        id="passField"
                                        placeholder="Digite sua senha"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                    <button type="button" className="eye-toggle" aria-label="Mostrar ou esconder a senha" onClick={() => setShowPass(!showPass)}>
                                        {showPass ? (
                                            <svg className="eye-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                                <line x1="1" y1="1" x2="23" y2="23"></line>
                                            </svg>
                                        ) : (
                                            <svg className="eye-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                                <circle cx="12" cy="12" r="3"></circle>
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {error && <p className="form-error">{error}</p>}

                            <button type="submit" className="submit-btn" disabled={status !== 'idle'}>
                                <span className="btn-glow-layer"></span>

                                {status === 'idle' && (
                                    <span className="btn-content">
                                        <span className="btn-text">{mode === 'signin' ? 'Entrar' : 'Criar conta'}</span>
                                        <svg className="btn-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                            <line x1="5" y1="12" x2="19" y2="12"></line>
                                            <polyline points="12 5 19 12 12 19"></polyline>
                                        </svg>
                                    </span>
                                )}

                                {status === 'loading' && <div className="btn-spinner"></div>}

                                {status === 'success' && (
                                    <div className="btn-success-icon">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                            <polyline points="20 6 9 17 4 12"></polyline>
                                        </svg>
                                    </div>
                                )}
                            </button>
                        </form>

                        {created && (
                            <div className="success-overlay">
                                <div className="success-box">
                                    <div className="success-ring">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                            <polyline points="20 6 9 17 4 12"></polyline>
                                        </svg>
                                    </div>
                                    <h3>Conta criada!</h3>
                                    <p>Agora é só entrar com o seu email e a sua senha.</p>
                                    <button type="button" className="reset-demo-btn" onClick={handleGoToLogin}>Ir para o login</button>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </main>
        </div>
    )
}
