const tokenAutenticacaoPagina = localStorage.getItem('sensus_token');

if (!tokenAutenticacaoPagina) {
    alert('Você precisa fazer login para acessar esta página.');
    window.location.href = '../index.html';
}