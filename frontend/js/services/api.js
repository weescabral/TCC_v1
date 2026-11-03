const API_BASE_URL = 'http://localhost:3000/api';

const api = {
  getToken() {
    return localStorage.getItem('sensus_token');
  },

  setToken(token) {
    localStorage.setItem('sensus_token', token);
  },

  logout() {
    localStorage.removeItem('sensus_token');
    localStorage.removeItem('sensus_usuario');
    window.location.href = '../index.html';
  },

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    const token = this.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 204) return null;

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.erro || 'Erro na comunicação com a API.');
    }

    return data;
  },

  login(email, senha) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, senha }),
    });
  },

  registrar(payload) {
    return this.request('/auth/registrar', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  me() {
    return this.request('/auth/me');
  },

  listarEmpresas() {
    return this.request('/empresas');
  },

  listarUsuarios() {
    return this.request('/usuarios');
  },

  listarSetores() {
    return this.request('/setores');
  },

  criarSetor(dados) {
    return this.request('/setores', { method: 'POST', body: JSON.stringify(dados) });
  },

  listarSensos() {
    return this.request('/5s/sensos');
  },

  listarCriterios() {
    return this.request('/5s/criterios');
  },

  listarAuditorias() {
    return this.request('/auditorias');
  },

  criarAuditoria(dados) {
    return this.request('/auditorias', { method: 'POST', body: JSON.stringify(dados) });
  },

  salvarResposta(auditoriaId, dados) {
    return this.request(`/auditorias/${auditoriaId}/respostas`, { method: 'POST', body: JSON.stringify(dados) });
  },

  finalizarAuditoria(auditoriaId) {
    return this.request(`/auditorias/${auditoriaId}/finalizar`, { method: 'POST' });
  },

  dashboardResumo() {
    return this.request('/dashboard/resumo');
  },
};
