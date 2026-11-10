const API_URL = 'http://localhost:3000/api';
const $ = (id) => document.getElementById(id);

function mensagem(texto, erro = false) {
  const el = $('authMessage');
  if (!el) return;
  el.textContent = texto;
  el.classList.toggle('error', erro);
}
function mostrar(formulario) {
  ['login','register','forgot','reset'].forEach((nome) => {
    const el = $(nome + 'Card');
    if (el) el.hidden = nome !== formulario;
  });
  mensagem('');
}
async function requisicaoAuth(caminho, body) {
  const resposta = await fetch(`${API_URL}/auth/${caminho}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  });
  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) throw new Error(dados.erro || 'Não foi possível concluir a solicitação.');
  return dados;
}

async function efetuarLogin() {
  const email = $('userInput').value.trim().toLowerCase();
  const senha = $('passInput').value;
  const botao = document.querySelector('#loginCard .btn-login');
  if (!email || !senha) return mensagem('Preencha o e-mail e a senha.', true);
  try {
    botao.disabled = true;
    const dados = await requisicaoAuth('login', { email, senha });
    localStorage.setItem('sensus_token', dados.token);
    localStorage.setItem('sensus_usuario', JSON.stringify(dados.usuario));
    if ($('rememberMe')?.checked) localStorage.setItem('sensus_email_salvo', email);
    else localStorage.removeItem('sensus_email_salvo');
    window.location.href = './pages/dashboard.html';
  } catch (erro) { mensagem(erro.message, true); }
  finally { botao.disabled = false; }
}

$('loginCard')?.addEventListener('submit', (e) => { e.preventDefault(); efetuarLogin(); });
$('showRegister')?.addEventListener('click', (e) => { e.preventDefault(); mostrar('register'); });
$('showLogin')?.addEventListener('click', (e) => { e.preventDefault(); mostrar('login'); });
$('forgotLink')?.addEventListener('click', (e) => { e.preventDefault(); $('forgotEmail').value = $('userInput').value.trim(); mostrar('forgot'); });
$('backFromForgot')?.addEventListener('click', (e) => { e.preventDefault(); mostrar('login'); });

$('registerCard')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const empresa = $('companyName').value.trim();
  const nome = $('registerName').value.trim();
  const email = $('registerEmail').value.trim().toLowerCase();
  const senha = $('registerPassword').value;
  if (senha !== $('registerConfirm').value) return mensagem('As senhas não coincidem.', true);
  const botao = $('registerCard').querySelector('button[type="submit"]');
  try {
    botao.disabled = true;
    await requisicaoAuth('registrar', { empresa: { nome: empresa }, usuario: { nome, email, senha } });
    $('userInput').value = email;
    $('passInput').value = '';
    mostrar('login');
    mensagem('Conta criada com sucesso! Entre com seu e-mail e senha.');
  } catch (erro) { mensagem(erro.message, true); }
  finally { botao.disabled = false; }
});

$('forgotCard')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const botao = $('forgotCard').querySelector('button[type="submit"]');
  try {
    botao.disabled = true;
    const dados = await requisicaoAuth('recuperar-senha', { email: $('forgotEmail').value.trim().toLowerCase() });
    mensagem(dados.mensagem);
  } catch (erro) { mensagem(erro.message, true); }
  finally { botao.disabled = false; }
});

$('resetCard')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const senha = $('resetPassword').value;
  if (senha !== $('resetConfirm').value) return mensagem('As senhas não coincidem.', true);
  const token = new URLSearchParams(window.location.search).get('token');
  const botao = $('resetCard').querySelector('button[type="submit"]');
  try {
    botao.disabled = true;
    const dados = await requisicaoAuth('redefinir-senha', { token, senha });
    window.history.replaceState({}, document.title, window.location.pathname);
    mostrar('login');
    mensagem(dados.mensagem);
  } catch (erro) { mensagem(erro.message, true); }
  finally { botao.disabled = false; }
});

const emailSalvo = localStorage.getItem('sensus_email_salvo');
if (emailSalvo) { $('userInput').value = emailSalvo; $('rememberMe').checked = true; }
if (new URLSearchParams(window.location.search).has('token')) mostrar('reset');


// Alterna a visibilidade dos campos de senha sem alterar o valor digitado.
document.addEventListener('click', (event) => {
  const botao = event.target.closest('[data-password-toggle]');
  if (!botao) return;
  const campo = document.getElementById(botao.dataset.passwordToggle);
  if (!campo) return;
  const mostrarSenha = campo.type === 'password';
  campo.type = mostrarSenha ? 'text' : 'password';
  botao.setAttribute('aria-label', mostrarSenha ? 'Ocultar senha' : 'Mostrar senha');
  botao.setAttribute('aria-pressed', String(mostrarSenha));
  const icone = botao.querySelector('i');
  if (icone) {
    icone.classList.toggle('icon-eye', !mostrarSenha);
    icone.classList.toggle('icon-eye-off', mostrarSenha);
  }
});
