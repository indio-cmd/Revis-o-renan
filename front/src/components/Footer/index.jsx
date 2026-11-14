import './style.css'

function Footer(){
    return(
        <footer className="app-footer">
            <span>Revisão Renan</span>
            <span className="app-footer-sep">•</span>
            <span>{new Date().getFullYear()}</span>
        </footer>
    )
}

export default Footer
