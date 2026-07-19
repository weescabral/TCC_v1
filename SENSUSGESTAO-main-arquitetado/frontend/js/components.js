function renderSidebar(activePage = "") {
  const sidebar = document.getElementById("sidebar");

  sidebar.innerHTML = `
    <aside class="sidebar">
      <div class="sidebar-logo">
        <span>⬡</span>
        <strong>SENSUS</strong>
      </div>

      <nav class="sidebar-menu">
        <a href="./dashboard.html" class="${activePage === "dashboard" ? "active" : ""}">
          <i class="icon-home"></i> Visão Geral
        </a>

        <a href="./checklist.html" class="${activePage === "checklist" ? "active" : ""}">
          <i class="icon-clipboard-check"></i> Checklist 5S
        </a>

        <a href="./setores.html" class="${activePage === "setores" ? "active" : ""}">
          <i class="icon-building-2"></i> Setores
        </a>

        <a href="./sobre-gestao.html" class="${activePage === "guia" ? "active" : ""}">
          <i class="icon-book-open"></i> Guia da Metodologia
        </a>
      </nav>

      <div class="sidebar-user" onclick="logout()">
        <div class="sidebar-avatar">B</div>
        <div>
          <strong>Brenda</strong>
          <small>Sair da conta</small>
        </div>
      </div>
    </aside>
  `;
}

function renderTopbar(title, subtitle, buttonText = "", buttonLink = "") {
  const topbar = document.getElementById("topbar");

  topbar.innerHTML = `
    <header class="topbar">
      <div class="page-title">
        <h1>${title}</h1>
        <p>${subtitle}</p>
      </div>

      <div class="topbar-actions">
        <button class="icon-btn" type="button">
          <i class="icon-search"></i>
        </button>

        <button class="icon-btn" type="button">
          <i class="icon-bell"></i>
        </button>

        ${
          buttonText
            ? `<a href="${buttonLink}" class="btn-primary">${buttonText}</a>`
            : ""
        }
      </div>
    </header>
  `;
}

function logout() {
  window.location.href = "../index.html";
}