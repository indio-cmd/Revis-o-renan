const URL_BASE = 'http://localhost:3000/api'

export async function getLogin() {
    const url = URL_BASE + '/v1/user/login'
    const response = await fetch(url, { method: "POST" })
    if (!response.ok) {
        throw new Error("Deu ruim")
    }
    const data = await response.json()
    console.log(data)
    return data.items
}