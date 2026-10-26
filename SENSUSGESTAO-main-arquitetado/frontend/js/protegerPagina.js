
(() => {
    const tokenProtecao = localStorage.getItem('sensus_token');

    if (!tokenProtecao) {
        alert('Você precisa fazer login para acessar esta página.');
        window.location.href = '../index.html';
    }
})();
