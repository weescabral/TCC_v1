(() => {
  const API = window.SENSUS_API_URL || 'http://localhost:3000/api';
  const token = () => localStorage.getItem('sensus_token') || '';
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');

  let usuariosAtivos = [];
  let usuariosInativos = [];
  let abaAtual = 'ativos';

  async function request(path, options = {}) {
    const response = await fetch(`${API}${path}`, {
      ...options,
      headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token()}`, ...(options.headers || {}) }
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) {
      localStorage.removeItem('sensus_token');
      location.href = '../index.html';
    }
    if (!response.ok) throw new Error(data.erro || data.mensagem || 'Não foi possível concluir a operação.');
    return data;
  }

  function feedback(message, error = false) {
    $('userFeedback').textContent = message;
    $('userFeedback').classList.toggle('is-error', error);
  }

  function notificar(message, type = 'info') {
    if (window.sensusNotificar) window.sensusNotificar(message, type);
    else feedback(message, type === 'error');
  }

  function resetForm() {
    $('userForm').reset();
    $('userId').value = '';
    $('userPassword').required = true;
    $('userPasswordWrap').hidden = false;
    $('userFormTitle').textContent = 'Cadastrar usuário';
    $('userSave').textContent = 'Cadastrar usuário';
    $('userCancel').hidden = true;
    feedback('');
  }

  function dataCurta(data) {
    if (!data) return 'Data não informada';
    const valor = new Date(data);
    return Number.isNaN(valor.getTime()) ? 'Data não informada' : valor.toLocaleDateString('pt-BR');
  }

  function render() {
    const lista = abaAtual === 'inativos' ? usuariosInativos : usuariosAtivos;
    const q = $('userSearch').value.trim().toLowerCase();
    const filtrados = lista.filter(u => `${u.nome} ${u.email}`.toLowerCase().includes(q));

    $('usersTotal').textContent = usuariosAtivos.length;
    $('usersAdmins').textContent = usuariosAtivos.filter(u => u.perfil === 'administrador').length;
    $('usersAuditors').textContent = usuariosAtivos.filter(u => u.perfil === 'auditor').length;
    $('usersAssigned').textContent = usuariosAtivos.reduce((sum, u) => sum + Number(u.setores_atribuidos || 0), 0);
    $('usersInactive').textContent = usuariosInativos.length;
    $('activeUsersCount').textContent = usuariosAtivos.length;
    $('inactiveUsersCount').textContent = usuariosInativos.length;

    const current = JSON.parse(localStorage.getItem('sensus_usuario') || '{}');
    $('usersList').innerHTML = filtrados.length ? filtrados.map(u => {
      const iniciais = String(u.nome || 'U').trim().split(/\s+/).slice(0,2).map(x => x[0]).join('').toUpperCase();
      const perfil = u.perfil === 'administrador' ? 'Administrador' : 'Auditor';
      if (abaAtual === 'inativos') {
        return `<article class="user-row user-row-inactive">
          <div class="user-avatar">${esc(iniciais)}</div>
          <div class="user-main">
            <strong>${esc(u.nome)}</strong>
            <span>${esc(u.email)}</span>
            <div class="user-meta">
              <span class="user-role role-auditor">Auditor</span>
              <span class="user-status-inactive">Inativo desde ${esc(dataCurta(u.inativado_em))}</span>
            </div>
            ${u.motivo_inativacao ? `<small class="user-inactive-reason">Motivo: ${esc(u.motivo_inativacao)}</small>` : ''}
          </div>
          <div class="user-actions">
            <button class="btn-outline user-reactivate" type="button" data-reactivate="${u.id}"><i class="icon-user-check"></i> Reativar</button>
            <button class="btn-outline user-delete-permanent" type="button" data-delete-permanent="${u.id}"><i class="icon-trash-2"></i> Excluir definitivamente</button>
          </div>
        </article>`;
      }
      return `<article class="user-row">
        <div class="user-avatar">${esc(iniciais)}</div>
        <div class="user-main">
          <strong>${esc(u.nome)}</strong>
          <span>${esc(u.email)}</span>
          <div class="user-meta">
            <span class="user-role ${u.perfil === 'administrador' ? 'role-admin' : 'role-auditor'}">${perfil}</span>
            <span>${Number(u.setores_atribuidos || 0)} setor(es) atribuído(s)</span>
          </div>
        </div>
        <div class="user-actions">
          <button class="btn-outline" type="button" data-edit="${u.id}"><i class="icon-pencil"></i> Editar</button>
          <button class="btn-outline" type="button" data-password="${u.id}"><i class="icon-key-round"></i> Senha</button>
          ${Number(u.id) !== Number(current.id) ? `<button class="btn-outline user-deactivate" type="button" data-deactivate="${u.id}"><i class="icon-user-x"></i> Inativar</button>` : ''}
        </div>
      </article>`;
    }).join('') : `<div class="users-empty"><i class="icon-users"></i><h3>${abaAtual === 'inativos' ? 'Nenhum auditor inativo' : 'Nenhum usuário encontrado'}</h3><p>${abaAtual === 'inativos' ? 'Quando um auditor for inativado, ele aparecerá aqui e poderá ser reativado.' : 'Cadastre um usuário ou ajuste sua busca.'}</p></div>`;
  }

  function selecionarAba(aba) {
    abaAtual = aba;
    const ativos = aba === 'ativos';
    $('tabUsersActive').classList.toggle('is-active', ativos);
    $('tabUsersInactive').classList.toggle('is-active', !ativos);
    $('tabUsersActive').setAttribute('aria-selected', String(ativos));
    $('tabUsersInactive').setAttribute('aria-selected', String(!ativos));
    $('userSearch').placeholder = ativos ? 'Buscar por nome ou e-mail' : 'Buscar auditor inativo';
    $('userSearch').value = '';
    render();
  }

  async function load() {
    try {
      const [ativos, inativos] = await Promise.all([
        request('/usuarios?status=ativos'),
        request('/usuarios?status=inativos')
      ]);
      usuariosAtivos = ativos;
      usuariosInativos = inativos.filter(u => u.perfil === 'auditor');
      render();
    } catch (e) {
      $('usersList').innerHTML = `<div class="users-empty"><h3>Não foi possível carregar a equipe</h3><p>${esc(e.message)}</p></div>`;
    }
  }

  $('userForm').addEventListener('submit', async e => {
    e.preventDefault();
    const id = $('userId').value;
    const payload = { nome:$('userName').value.trim(), email:$('userEmail').value.trim(), perfil:$('userRole').value };
    if (!id) payload.senha = $('userPassword').value;
    if (!payload.nome || !payload.email) return feedback('Preencha nome e e-mail.', true);
    if (!id && payload.senha.length < 8) return feedback('A senha inicial deve ter pelo menos 8 caracteres.', true);
    $('userSave').disabled = true;
    try {
      await request(id ? `/usuarios/${id}` : '/usuarios', { method:id ? 'PUT' : 'POST', body:JSON.stringify(payload) });
      resetForm();
      await load();
      notificar(id ? 'Usuário atualizado com sucesso.' : 'Usuário cadastrado com sucesso.', 'success');
    } catch (err) {
      feedback(err.message, true);
      notificar(err.message, 'error');
    } finally {
      $('userSave').disabled = false;
    }
  });

  $('userCancel').addEventListener('click', resetForm);
  $('userSearch').addEventListener('input', render);
  $('tabUsersActive').addEventListener('click', () => selecionarAba('ativos'));
  $('tabUsersInactive').addEventListener('click', () => selecionarAba('inativos'));

  $('usersList').addEventListener('click', async e => {
    const edit = e.target.closest('[data-edit]')?.dataset.edit;
    const pass = e.target.closest('[data-password]')?.dataset.password;
    const deactivate = e.target.closest('[data-deactivate]')?.dataset.deactivate;
    const reactivate = e.target.closest('[data-reactivate]')?.dataset.reactivate;
    const deletePermanent = e.target.closest('[data-delete-permanent]')?.dataset.deletePermanent;

    if (deletePermanent) {
      const usuario = usuariosInativos.find(x => String(x.id) === deletePermanent);
      if (!usuario) return;
      const confirmar = await window.sensusConfirm(
        `Deseja excluir definitivamente o auditor "${usuario.nome}"? A exclusão só será permitida se não houver auditorias, setores ou planos de ação vinculados. Se houver vínculos, o sistema bloqueará a operação.`,
        { title:'Excluir auditor definitivamente', type:'danger', confirmText:'Excluir definitivamente' }
      );
      if (!confirmar) return;
      try {
        await request(`/usuarios/${deletePermanent}/definitivo`, { method:'DELETE' });
        await load();
        selecionarAba('inativos');
        notificar('Auditor excluído definitivamente.', 'success');
      } catch (err) {
        notificar(err.message, 'error');
      }
      return;
    }

    if (edit) {
      const u = usuariosAtivos.find(x => String(x.id) === edit);
      if (!u) return;
      $('userId').value = u.id;
      $('userName').value = u.nome;
      $('userEmail').value = u.email;
      $('userRole').value = u.perfil;
      $('userPasswordWrap').hidden = true;
      $('userPassword').required = false;
      $('userFormTitle').textContent = 'Editar usuário';
      $('userSave').textContent = 'Salvar alterações';
      $('userCancel').hidden = false;
      $('userFormCard').scrollIntoView({ behavior:'smooth' });
      feedback('');
    }

    if (pass) {
      const senha = await window.sensusPrompt('Informe a nova senha (mínimo de 8 caracteres).', { title:'Alterar senha', placeholder:'Nova senha', confirmText:'Salvar' });
      if (senha === null) return;
      if (senha.length < 8) { notificar('A senha deve ter pelo menos 8 caracteres.', 'warning'); return; }
      try {
        await request(`/usuarios/${pass}/senha`, { method:'PATCH', body:JSON.stringify({ senha }) });
        notificar('Senha atualizada com sucesso.', 'success');
      } catch (err) { notificar(err.message, 'error'); }
    }

    if (deactivate) {
      const motivo = await window.sensusPrompt('Informe o motivo da inativação.', { title:'Inativar usuário', placeholder:'Motivo da inativação', confirmText:'Continuar' });
      if (motivo === null) return;
      if (!motivo.trim()) { notificar('O motivo é obrigatório.', 'warning'); return; }
      if (!await window.sensusConfirm('O histórico deste usuário será preservado. Deseja continuar com a inativação?', { title:'Confirmar inativação', confirmText:'Inativar usuário' })) return;
      try {
        await request(`/usuarios/${deactivate}`, { method:'DELETE', body:JSON.stringify({ motivo }) });
        await load();
        notificar('Usuário inativado com sucesso. O histórico foi preservado.', 'success');
      } catch (err) { notificar(err.message, 'error'); }
    }

    if (reactivate) {
      const usuario = usuariosInativos.find(x => String(x.id) === reactivate);
      if (!usuario) return;
      const confirmar = await window.sensusConfirm(
        `Deseja reativar o acesso de ${usuario.nome}? O cadastro e a senha existentes serão preservados. Será necessário atribuir setores novamente, se aplicável.`,
        { title:'Reativar auditor', type:'success', confirmText:'Reativar auditor' }
      );
      if (!confirmar) return;
      try {
        await request(`/usuarios/${reactivate}/reativar`, { method:'PATCH' });
        await load();
        selecionarAba('ativos');
        notificar('Auditor reativado com sucesso. O cadastro e a senha foram preservados.', 'success');
      } catch (err) { notificar(err.message, 'error'); }
    }
  });

  const current = JSON.parse(localStorage.getItem('sensus_usuario') || '{}');
  if (current.perfil !== 'administrador') {
    document.body.innerHTML = '<main style="max-width:620px;margin:10vh auto;padding:32px;font-family:Arial"><h1>Acesso restrito</h1><p>Somente administradores podem gerenciar usuários.</p><a href="./dashboard.html">Voltar ao painel</a></main>';
    return;
  }
  load();
})();
