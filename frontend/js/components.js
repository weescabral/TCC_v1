function getUsuarioLogado() {
  try {
    return JSON.parse(localStorage.getItem('sensus_usuario') || '{}');
  } catch {
    return {};
  }
}

function obterIniciais(nome = 'Usuário') {
  return String(nome).trim().split(/\s+/).slice(0, 2).map(p => p[0] || '').join('').toUpperCase() || 'U';
}

function renderSidebar(activePage = "") {
  const sidebar = document.getElementById("sidebar");
  const usuario = getUsuarioLogado();
  const nome = usuario.nome || 'Usuário';
  const perfil = usuario.perfil === 'administrador' ? 'Administrador' : 'Auditor';
  const foto = localStorage.getItem(`sensus_avatar_${usuario.id}`) || '';
  const avatar = foto
    ? `<img src="${foto}" alt="Foto do perfil">`
    : `<span>${obterIniciais(nome)}</span>`;

  sidebar.innerHTML = `
    <aside class="sidebar" aria-label="Menu principal">
      <div class="sidebar-logo">
        <span class="sidebar-brand-mark">⬡</span>
        <strong>SENSUS</strong>
        <span class="sidebar-version">5S</span>
      </div>

      <nav class="sidebar-menu">
        <a href="./dashboard.html" title="Visão Geral" class="${activePage === "dashboard" ? "active" : ""}">
          <i class="icon-home"></i><span>Visão Geral</span>
        </a>
        <a href="./checklist.html" title="Auditoria" class="${activePage === "auditoria" || activePage === "checklist" ? "active" : ""}">
          <i class="icon-clipboard-check"></i><span>Auditoria</span>
        </a>
        <a href="./setores.html" title="${usuario.perfil === 'administrador' ? 'Setores' : 'Meus Setores'}" class="${activePage === "setores" ? "active" : ""}">
          <i class="icon-building-2"></i><span>${usuario.perfil === 'administrador' ? 'Setores' : 'Meus Setores'}</span>
        </a>
        ${usuario.perfil === 'administrador' ? `<a href="./usuarios.html" title="Usuários" class="${activePage === "usuarios" ? "active" : ""}"><i class="icon-users-round"></i><span>Usuários</span></a>` : ''}
        <a href="./planos-acao.html" title="Planos de Ação" class="${activePage === "planos" ? "active" : ""}">
          <i class="icon-list-checks"></i><span>Planos de Ação</span>
        </a>
        <a href="./historico-auditorias.html" title="Histórico de Auditorias" class="${activePage === "historico" ? "active" : ""}">
          <i class="icon-history"></i><span>Histórico de Auditorias</span>
        </a>
        <a href="./relatorios.html" title="Relatórios" class="${activePage === "relatorios" ? "active" : ""}">
          <i class="icon-file-chart-column"></i><span>Relatórios</span>
        </a>
        <a href="./sobre-gestao.html" title="Guia da Metodologia" class="${activePage === "guia" ? "active" : ""}">
          <i class="icon-book-open"></i><span>Guia da Metodologia</span>
        </a>
      </nav>

      <button class="sidebar-user" type="button" onclick="abrirPerfil()" title="Editar perfil">
        <span class="sidebar-avatar">${avatar}</span>
        <span class="sidebar-user-info">
          <strong>${nome}</strong>
          <small>${perfil}</small>
          <small class="profile-action">Editar perfil</small>
        </span>
        <i class="icon-settings profile-settings"></i>
      </button>
    </aside>
  `;

  // Rodapé institucional único em todas as páginas internas do sistema.
  const mainContent = document.querySelector('.main-content');
  if (mainContent && !mainContent.querySelector('.sensus-copyright')) {
    const footer = document.createElement('div');
    footer.className = 'sensus-copyright';
    footer.setAttribute('aria-label', '© 2026 Sensus 5S. Todos os direitos reservados.');
    footer.textContent = '© 2026 Sensus 5S. Todos os direitos reservados.';
    mainContent.appendChild(footer);
  }

  if (!document.getElementById('sensus-profile-modal')) {
    document.body.insertAdjacentHTML('beforeend', `
      <div class="sensus-modal-backdrop" id="sensus-profile-modal" aria-hidden="true">
        <section class="sensus-modal" role="dialog" aria-modal="true" aria-labelledby="profile-title">
          <button class="sensus-modal-close" type="button" onclick="fecharPerfil()" aria-label="Fechar">×</button>
          <div class="profile-modal-heading">
            <div class="profile-modal-avatar" id="profile-preview">${avatar}</div>
            <div><h2 id="profile-title">Meu perfil</h2><p>Atualize seus dados de acesso.</p></div>
          </div>
          <form id="profile-form">
            <label for="profile-name">Nome</label>
            <input id="profile-name" type="text" maxlength="100" required>
            <label for="profile-email">E-mail</label>
            <input id="profile-email" type="email" disabled>
            <label for="profile-photo">Foto do perfil</label>
            <input id="profile-photo" type="file" accept="image/png,image/jpeg,image/webp">
            <small class="profile-help">PNG, JPG ou WEBP. A foto fica salva neste navegador.</small>
            <div class="profile-modal-actions">
              <button class="btn-outline" type="button" onclick="logout()">Encerrar sessão</button>
              <button class="btn-primary" type="submit">Salvar alterações</button>
            </div>
            <p class="profile-feedback" id="profile-feedback" role="status"></p>
          </form>
        </section>
      </div>
    `);
    configurarPerfil();
  }
}

function configurarPerfil() {
  const usuario = getUsuarioLogado();
  const nome = document.getElementById('profile-name');
  const email = document.getElementById('profile-email');
  if (!nome) return;
  nome.value = usuario.nome || '';
  email.value = usuario.email || '';

  document.getElementById('profile-photo').addEventListener('change', (event) => {
    const arquivo = event.target.files?.[0];
    if (!arquivo) return;
    if (arquivo.size > 2 * 1024 * 1024) {
      document.getElementById('profile-feedback').textContent = 'A imagem deve ter no máximo 2 MB.';
      event.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      document.getElementById('profile-preview').innerHTML = `<img src="${reader.result}" alt="Prévia da foto">`;
      document.getElementById('profile-preview').dataset.photo = reader.result;
    };
    reader.readAsDataURL(arquivo);
  });

  document.getElementById('profile-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const feedback = document.getElementById('profile-feedback');
    const novoNome = nome.value.trim();
    if (!novoNome) {
      feedback.textContent = 'Informe seu nome.';
      return;
    }
    try {
      const resposta = await fetch(`${obterApiUrl()}/auth/perfil`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('sensus_token')}`
        },
        body: JSON.stringify({ nome: novoNome })
      });
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.erro || 'Não foi possível atualizar o perfil.');
      const atualizado = { ...getUsuarioLogado(), ...dados.usuario, nome: novoNome };
      localStorage.setItem('sensus_usuario', JSON.stringify(atualizado));
      const foto = document.getElementById('profile-preview').dataset.photo;
      if (foto) localStorage.setItem(`sensus_avatar_${atualizado.id}`, foto);
      feedback.textContent = 'Perfil atualizado com sucesso!';
      setTimeout(() => window.location.reload(), 650);
    } catch (erro) {
      feedback.textContent = erro.message;
    }
  });
}

function obterApiUrl() {
  return window.SENSUS_API_URL || 'http://localhost:3000/api';
}

function abrirPerfil() {
  const modal = document.getElementById('sensus-profile-modal');
  if (!modal) return;
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  document.getElementById('profile-feedback').textContent = '';
}
function fecharPerfil() {
  const modal = document.getElementById('sensus-profile-modal');
  if (!modal) return;
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
}

function renderTopbar(title, subtitle, buttonText = "", buttonLink = "") {
  const topbar = document.getElementById("topbar");
  topbar.innerHTML = `
    <header class="topbar">
      <div class="page-title"><h1>${title}</h1><p>${subtitle}</p></div>
      <div class="topbar-actions">
        <button class="icon-btn theme-toggle" id="theme-toggle" type="button" aria-label="Ativar tema escuro" title="Alternar tema claro/escuro" onclick="alternarTema()"><i class="icon-moon"></i></button>
        <div class="notification-wrap">
          <button class="icon-btn notification-button" id="notification-button" type="button" aria-label="Notificações" aria-expanded="false" onclick="alternarNotificacoes()">
            <i class="icon-bell"></i><span class="notification-dot" id="notification-dot"></span>
          </button>
          <section class="notification-panel" id="notification-panel" aria-label="Notificações" hidden>
            <div class="notification-panel-heading"><strong>Notificações</strong><button type="button" onclick="alternarNotificacoes(false)">×</button></div>
            <div id="notification-list"><p class="notification-empty">Carregando notificações...</p></div>
          </section>
        </div>
        ${buttonText ? `<a href="${buttonLink}" class="btn-primary">${buttonText}</a>` : ""}
      </div>
    </header>
  `;
  carregarNotificacoes();
}

async function carregarNotificacoes() {
  const lista = document.getElementById('notification-list');
  if (!lista) return;
  try {
    const resposta = await fetch(`${obterApiUrl()}/dashboard`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('sensus_token')}` }
    });
    if (!resposta.ok) throw new Error('Não foi possível consultar os avisos.');
    const dados = await resposta.json();
    const pendencias = Number(dados.kpis?.planosPendentes || 0);
    const setores = Array.isArray(dados.setoresPendentes) ? dados.setoresPendentes : [];
    const avisos = [];
    if (pendencias > 0) avisos.push({
      titulo: `${pendencias} plano(s) de ação pendente(s)`,
      detalhe: 'Existem ações que precisam de acompanhamento.',
      link: './planos-acao.html',
      icone: 'icon-clipboard-list'
    });
    if (setores.length > 0) avisos.push({
      titulo: `${setores.length} setor(es) aguardando auditoria`,
      detalhe: setores.slice(0, 3).map(setor => setor.nome).join(', ') + (setores.length > 3 ? ' e outros' : '') + '. Verifique a periodicidade das auditorias.',
      link: './setores.html',
      icone: 'icon-calendar-clock'
    });
    lista.innerHTML = avisos.length ? avisos.map(a => `
      <a class="notification-item" href="${a.link}">
        <span class="notification-item-icon"><i class="${a.icone}"></i></span>
        <span><strong>${a.titulo}</strong><small>${a.detalhe}</small></span>
      </a>`).join('') : '<p class="notification-empty">Tudo em dia! Nenhuma pendência encontrada.</p>';
    const dot = document.getElementById('notification-dot');
    if (dot) dot.classList.toggle('has-notifications', avisos.length > 0);
  } catch (erro) {
    lista.innerHTML = `<p class="notification-empty">Não foi possível carregar as notificações. Verifique se o servidor está conectado e tente novamente.</p>`;
    console.error('Erro ao carregar notificações:', erro);
  }
}

function alternarNotificacoes(force) {
  const panel = document.getElementById('notification-panel');
  const button = document.getElementById('notification-button');
  const wrap = document.querySelector('.notification-wrap');
  if (!panel || !button || !wrap) return;

  const abrir = typeof force === 'boolean' ? force : panel.hidden;

  if (abrir && document.documentElement.dataset.theme === 'escuro') {
    // Retira o painel de qualquer stacking context/overflow da página.
    // Assim nenhum cartão consegue ficar por cima ou desfocar seu conteúdo.
    if (panel.parentElement !== document.body) {
      document.body.appendChild(panel);
    }
    const rect = button.getBoundingClientRect();
    panel.style.position = 'fixed';
    panel.style.top = `${Math.min(rect.bottom + 12, window.innerHeight - 180)}px`;
    panel.style.right = `${Math.max(12, window.innerWidth - rect.right)}px`;
    panel.style.left = 'auto';
    panel.style.zIndex = '2147483647';
  } else if (!abrir && panel.parentElement === document.body) {
    // Devolve o painel ao cabeçalho ao fechar, mantendo a estrutura original.
    wrap.appendChild(panel);
    panel.style.removeProperty('position');
    panel.style.removeProperty('top');
    panel.style.removeProperty('right');
    panel.style.removeProperty('left');
    panel.style.removeProperty('z-index');
  }

  panel.hidden = !abrir;
  button.setAttribute('aria-expanded', String(abrir));
}

function logout() {
  const usuario = getUsuarioLogado();
  localStorage.removeItem('sensus_token');
  localStorage.removeItem('sensus_usuario');
  window.location.href = "../index.html";
}


// Tema claro/escuro persistente em todas as páginas internas.
function aplicarTema() {
  const tema = localStorage.getItem('sensus_tema') || 'claro';
  document.documentElement.dataset.theme = tema;
  const botao = document.getElementById('theme-toggle');
  if (botao) {
    botao.innerHTML = tema === 'escuro' ? '<i class="icon-sun"></i>' : '<i class="icon-moon"></i>';
    botao.setAttribute('aria-label', tema === 'escuro' ? 'Ativar tema claro' : 'Ativar tema escuro');
  }
}
function alternarTema() {
  const proximo = (localStorage.getItem('sensus_tema') || 'claro') === 'claro' ? 'escuro' : 'claro';
  localStorage.setItem('sensus_tema', proximo); aplicarTema(); window.dispatchEvent(new CustomEvent('sensus:tema-alterado', { detail: { tema: proximo } }));
}
document.addEventListener('click', (event) => {
  const botao = event.target.closest('[data-password-toggle]');
  if (!botao) return;
  const campo = document.getElementById(botao.dataset.passwordToggle);
  if (!campo) return;
  const mostrar = campo.type === 'password';
  campo.type = mostrar ? 'text' : 'password';
  botao.innerHTML = mostrar ? '<i class="icon-eye-off"></i>' : '<i class="icon-eye"></i>';
  botao.setAttribute('aria-label', mostrar ? 'Ocultar senha' : 'Mostrar senha');
  botao.setAttribute('aria-pressed', String(mostrar));
});
document.addEventListener('DOMContentLoaded', aplicarTema);
