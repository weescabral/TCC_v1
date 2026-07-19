const token = localStorage.getItem('sensus_token');

if (!token) {
    alert('Você precisa fazer login para acessar esta página.');
    window.location.href = '../index.html';
}