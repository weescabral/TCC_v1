<<<<<<< HEAD
const tokenAutenticacaoPagina = localStorage.getItem('sensus_token');

if (!tokenAutenticacaoPagina) {
    alert('Você precisa fazer login para acessar esta página.');
    window.location.href = '../index.html';
}
=======

(() => {
    const tokenProtecao = localStorage.getItem('sensus_token');

    if (!tokenProtecao) {
        alert('Você precisa fazer login para acessar esta página.');
        window.location.href = '../index.html';
    }
})();
>>>>>>> 52b09e49628db99d4cb23762cc1539072231c357
