const API_ONBOARDING = 'http://localhost:3000/api/onboarding';
const tokenOnboarding = localStorage.getItem('sensus_token');
const etapas = [
  {icone:'icon-user-round',titulo:'Configure seu perfil',descricao:'Antes de começar, confira seus dados pessoais de acesso. Você pode atualizar seu nome e adicionar uma foto para personalizar sua conta.',dica:'Clique no botão abaixo para abrir a opção “Editar perfil”, no menu lateral do sistema.',acao:'Configurar meu perfil',link:'./dashboard.html?abrirPerfil=1'},
  {icone:'icon-users',titulo:'Cadastre os auditores',descricao:'Cadastre os colaboradores que participarão das auditorias. Assim, cada auditor poderá receber responsabilidades e atuar nos setores definidos pela empresa.',dica:'Acesse a gestão de usuários e cadastre as pessoas que terão o perfil de auditor.',acao:'Abrir gestão de usuários',link:'./usuarios.html'},
  {icone:'icon-layout-grid',titulo:'Configure os setores, responsáveis e periodicidade',descricao:'Crie os setores que serão avaliados, escolha o auditor responsável por cada um e defina a frequência das auditorias. Assim, toda a organização da rotina de avaliação fica reunida em uma única etapa.',dica:'Para cada setor, cadastre o nome, associe o auditor responsável e escolha a periodicidade mais adequada: semanal, quinzenal, mensal, bimestral, trimestral, semestral ou anual. Você poderá alterar essas configurações posteriormente.',acao:'Gerenciar setores, responsáveis e periodicidade',link:'./setores.html'},
  {icone:'icon-book-open',titulo:'Conheça o guia do checklist 5S',descricao:'Antes de realizar sua primeira auditoria, conheça os cinco sensos e entenda como funciona o checklist, como responder às avaliações e como interpretar a pontuação.',dica:'Leia o guia para compreender os critérios de avaliação e a aplicação de cada senso. Depois, você estará pronto para conhecer os relatórios e realizar sua primeira auditoria.',acao:'Acessar guia do checklist 5S',link:'./sobre-gestao.html'},
  {icone:'icon-file-chart-column',titulo:'Conheça os relatórios do Sensus 5S',descricao:'O Sensus 5S também transforma os resultados das auditorias em relatórios para facilitar o acompanhamento e a tomada de decisões. Existem quatro modelos: relatório de auditoria, com os detalhes de uma avaliação; relatório por setor, com o histórico e a evolução de uma área; relatório gerencial, com os indicadores consolidados da empresa; e relatório periódico, que compara os resultados em um intervalo de datas.',dica:'Na Central de Relatórios, você pode escolher o modelo, aplicar os filtros, conferir uma prévia, baixar o documento em PDF e enviá-lo por e-mail. Auditores visualizam os dados dos setores sob sua responsabilidade; o relatório gerencial completo é exclusivo do administrador.',acao:'Conhecer e acessar os relatórios',link:'./relatorios.html'},
  {icone:'icon-clipboard-check',titulo:'Inicie sua primeira auditoria',descricao:'Agora que o perfil, os auditores e os setores estão configurados e você já conhece o checklist 5S e os relatórios disponíveis, chegou a hora de colocar a metodologia em prática.',dica:'Selecione o setor e o senso que deseja avaliar e siga as orientações do sistema para registrar as respostas e as evidências. Depois de finalizar os cinco sensos, você poderá consultar os resultados nos relatórios.',acao:'Iniciar primeira auditoria',link:'./checklist.html'}
];
let etapaAtual = 1;

async function salvarEstado(status='pendente', etapa=etapaAtual) {
  const resposta = await fetch(API_ONBOARDING, {
    method:'PATCH',
    headers:{'Content-Type':'application/json',Authorization:`Bearer ${tokenOnboarding}`},
    body:JSON.stringify({status,etapa_atual:etapa})
  });
  const dados = await resposta.json().catch(()=>({}));
  if(!resposta.ok) throw new Error(dados.erro || 'Não foi possível salvar seu progresso.');
  return dados;
}
function renderizarEtapa(){
  const etapa = etapas[etapaAtual-1];
  document.getElementById('stepIcon').innerHTML=`<i class="${etapa.icone}"></i>`;
  document.getElementById('stepTitle').textContent=etapa.titulo;
  document.getElementById('stepDescription').textContent=etapa.descricao;
  document.getElementById('stepTip').textContent=etapa.dica;
  const acao=document.getElementById('stepAction');
  acao.hidden=!etapa.acao;
  if(etapa.acao){acao.textContent=etapa.acao;acao.href=etapa.link;}
  document.getElementById('stepCount').textContent=`Etapa ${etapaAtual} de ${etapas.length}`;
  document.getElementById('stepPercent').textContent=`${Math.round(etapaAtual/etapas.length*100)}%`;
  document.getElementById('progressFill').style.width=`${etapaAtual/etapas.length*100}%`;
  document.getElementById('backButton').disabled=etapaAtual===1;
  document.getElementById('backButton').style.opacity=etapaAtual===1?'.45':'1';
  document.getElementById('nextButton').textContent=etapaAtual===etapas.length?'Concluir configuração':'Próxima etapa';
}
function feedback(texto,erro=false){const el=document.getElementById('feedback');el.textContent=texto;el.style.color=erro?'#dc2626':'#64748b';}
document.getElementById('backButton').addEventListener('click',()=>{if(etapaAtual>1){etapaAtual--;renderizarEtapa();}});
document.getElementById('nextButton').addEventListener('click',async()=>{
  const botao=document.getElementById('nextButton');botao.disabled=true;
  try{
    if(etapaAtual===etapas.length){await salvarEstado('concluido',etapaAtual);window.location.href='./dashboard.html';return;}
    etapaAtual++;await salvarEstado('pendente',etapaAtual);renderizarEtapa();feedback('Progresso salvo. Você pode continuar depois.');
  }catch(e){feedback(e.message,true);}finally{botao.disabled=false;}
});
document.getElementById('skipButton').addEventListener('click',async()=>{
  const botao=document.getElementById('skipButton');botao.disabled=true;
  try{await salvarEstado('adiado',etapaAtual);window.location.href='./dashboard.html';}
  catch(e){feedback(e.message,true);botao.disabled=false;}
});
async function iniciar(){
  if(!tokenOnboarding){window.location.href='../index.html';return;}
  try{
    const r=await fetch(API_ONBOARDING,{headers:{Authorization:`Bearer ${tokenOnboarding}`}});
    const d=await r.json();if(!r.ok)throw new Error(d.erro||'Não foi possível carregar a configuração.');
    etapaAtual=Math.min(etapas.length,Math.max(1,Number(d.etapa_atual)||1));renderizarEtapa();
  }catch(e){feedback(e.message,true);}
}
iniciar();
