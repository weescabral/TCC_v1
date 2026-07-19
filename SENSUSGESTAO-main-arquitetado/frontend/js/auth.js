const API_URL = 'http://localhost:3000/api';

async function efetuarLogin() {
    const emailInput = document.getElementById('userInput');
    const senhaInput = document.getElementById('passInput');
    const botaoLogin = document.querySelector('.btn-login');

    const email = emailInput.value.trim();
    const senha = senhaInput.value;

    if (!email || !senha) {
        alert('Preencha o e-mail e a senha.');
        return;
    }

    try {
        botaoLogin.disabled = true;
        botaoLogin.innerHTML = 'Entrando...';

        const resposta = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email,
                senha
            })
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
            throw new Error(dados.erro || 'Não foi possível realizar o login.');
        }

        localStorage.setItem('sensus_token', dados.token);
        localStorage.setItem('sensus_usuario', JSON.stringify(dados.usuario));

        window.location.href = './pages/dashboard.html';
    } catch (erro) {
        console.error('Erro no login:', erro);
        alert(erro.message);
    } finally {
        botaoLogin.disabled = false;
        botaoLogin.innerHTML = `
            Entrar
            <i class="icon-arrow-right"></i>
        `;
    }
}