(() => {
  const API = window.SENSUS_API_URL || 'http://localhost:3000/api';
  const token = () => localStorage.getItem('sensus_token') || '';
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  let usuarios = [];
  async function request(path, options = {}) {
    const response = await fetch(`${API}${path}`, { ...options, headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token()}`, ...(options.headers || {}) } });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) { localStorage.removeItem('sensus_token'); location.href='../index.html'; }
    if (!response.ok) throw new Error(data.erro || data.mensagem || 'Não foi possível concluir a operação.');
    return data;
  }
  function feedback(message, error = false) { $('userFeedback').textContent = message; $('userFeedback').classList.toggle('is-error', error); }
  function resetForm() { $('userForm').reset(); $('userId').value=''; $('userPassword').required=true; $('userPasswordWrap').hidden=false; $('userFormTitle').textContent='Cadastrar usuário'; $('userSave').textContent='Cadastrar usuário'; $('userCancel').hidden=true; feedback(''); }
  function render() {
    const q = $('userSearch').value.trim().toLowerCase();
    const filtrados = usuarios.filter(u => `${u.nome} ${u.email}`.toLowerCase().includes(q));
    $('usersTotal').textContent=usuarios.length;
    $('usersAdmins').textContent=usuarios.filter(u=>u.perfil==='administrador').length;
    $('usersAuditors').textContent=usuarios.filter(u=>u.perfil==='auditor').length;
    $('usersAssigned').textContent=usuarios.reduce((sum,u)=>sum+Number(u.setores_atribuidos||0),0);
    $('usersList').innerHTML = filtrados.length ? filtrados.map(u => `<article class="user-row"><div class="user-avatar">${esc(String(u.nome||'U').trim().split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase())}</div><div class="user-main"><strong>${esc(u.nome)}</strong><span>${esc(u.email)}</span><div class="user-meta"><span class="user-role ${u.perfil==='administrador'?'role-admin':'role-auditor'}">${u.perfil==='administrador'?'Administrador':'Auditor'}</span><span>${Number(u.setores_atribuidos||0)} setor(es) atribuído(s)</span></div></div><div class="user-actions"><button class="btn-outline" type="button" data-edit="${u.id}"><i class="icon-pencil"></i> Editar</button><button class="btn-outline" type="button" data-password="${u.id}"><i class="icon-key-round"></i> Senha</button>${Number(u.id)!==Number(JSON.parse(localStorage.getItem('sensus_usuario')||'{}').id)?`<button class="btn-outline user-deactivate" type="button" data-deactivate="${u.id}"><i class="icon-user-x"></i> Inativar</button>`:''}</div></article>`).join('') : '<div class="users-empty"><i class="icon-users"></i><h3>Nenhum usuário encontrado</h3><p>Cadastre um usuário ou ajuste sua busca.</p></div>';
  }
  async function load() { try { usuarios=await request('/usuarios'); render(); } catch(e) { $('usersList').innerHTML=`<div class="users-empty"><h3>Não foi possível carregar a equipe</h3><p>${esc(e.message)}</p></div>`; } }
  $('userForm').addEventListener('submit', async e => {
    e.preventDefault(); const id=$('userId').value; const payload={nome:$('userName').value.trim(),email:$('userEmail').value.trim(),perfil:$('userRole').value};
    if (!id) payload.senha=$('userPassword').value;
    if (!payload.nome || !payload.email) return feedback('Preencha nome e e-mail.',true);
    if (!id && payload.senha.length<8) return feedback('A senha inicial deve ter pelo menos 8 caracteres.',true);
    $('userSave').disabled=true;
    try { await request(id?`/usuarios/${id}`:'/usuarios',{method:id?'PUT':'POST',body:JSON.stringify(payload)}); resetForm(); await load(); feedback(id?'Usuário atualizado com sucesso.':'Usuário cadastrado com sucesso.'); }
    catch(err) { feedback(err.message,true); } finally { $('userSave').disabled=false; }
  });
  $('userCancel').addEventListener('click',resetForm); $('userSearch').addEventListener('input',render);
  $('usersList').addEventListener('click',async e=>{
    const edit=e.target.closest('[data-edit]')?.dataset.edit; const pass=e.target.closest('[data-password]')?.dataset.password; const deactivate=e.target.closest('[data-deactivate]')?.dataset.deactivate;
    if(edit){const u=usuarios.find(x=>String(x.id)===edit);if(!u)return;$('userId').value=u.id;$('userName').value=u.nome;$('userEmail').value=u.email;$('userRole').value=u.perfil;$('userPasswordWrap').hidden=true;$('userPassword').required=false;$('userFormTitle').textContent='Editar usuário';$('userSave').textContent='Salvar alterações';$('userCancel').hidden=false;$('userFormCard').scrollIntoView({behavior:'smooth'});feedback('');}
    if(pass){const senha=prompt('Informe a nova senha (mínimo de 8 caracteres):');if(senha===null)return;if(senha.length<8){alert('A senha deve ter pelo menos 8 caracteres.');return;}try{await request(`/usuarios/${pass}/senha`,{method:'PATCH',body:JSON.stringify({senha})});alert('Senha atualizada com sucesso.');}catch(err){alert(err.message);}}
    if(deactivate){const motivo=prompt('Informe o motivo da inativação:');if(motivo===null)return;if(!motivo.trim())return alert('O motivo é obrigatório.');if(!confirm('Inativar este usuário? O histórico será preservado.'))return;try{await request(`/usuarios/${deactivate}`,{method:'DELETE',body:JSON.stringify({motivo})});await load();}catch(err){alert(err.message);}}
  });
  const current=JSON.parse(localStorage.getItem('sensus_usuario')||'{}');
  if(current.perfil!=='administrador'){document.body.innerHTML='<main style="max-width:620px;margin:10vh auto;padding:32px;font-family:Arial"><h1>Acesso restrito</h1><p>Somente administradores podem gerenciar usuários.</p><a href="./dashboard.html">Voltar ao painel</a></main>';return;}
  load();
})();
