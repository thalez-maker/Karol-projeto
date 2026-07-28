/* ==========================================================================
   MTA-SNAP-IV & Anamnese Online - Clinical Engine with Google Auth & Firestore
   ========================================================================== */

// --- SNAP-IV Questions Database (26 Items) ---
const SNAP_QUESTIONS = [
  // Domínio 1: Desatenção (Itens 1 a 9)
  { id: 1, domain: 'desat', text: 'Não consegue prestar muita atenção a detalhes ou comete erros por descuido nos trabalhos da escola ou tarefas.' },
  { id: 2, domain: 'desat', text: 'Tem dificuldade de manter a atenção em tarefas ou atividades de lazer.' },
  { id: 3, domain: 'desat', text: 'Parece não estar ouvindo quando se fala diretamente com ele.' },
  { id: 4, domain: 'desat', text: 'Não segue instruções até o fim e não termina deveres de escola, tarefas ou obrigações.' },
  { id: 5, domain: 'desat', text: 'Tem dificuldade para organizar tarefas e atividades.' },
  { id: 6, domain: 'desat', text: 'Evita, não gosta ou se envolve contra a vontade em tarefas que exigem esforço mental prolongado.' },
  { id: 7, domain: 'desat', text: 'Perde coisas necessárias para atividades (p. ex: brinquedos, deveres da escola, lápis ou livros).' },
  { id: 8, domain: 'desat', text: 'Distrai-se com estímulos externos.' },
  { id: 9, domain: 'desat', text: 'É esquecido em atividades do dia a dia.' },

  // Domínio 2: Hiperatividade e Impulsividade (Itens 10 a 18)
  { id: 10, domain: 'hiper', text: 'Mexe com as mãos ou os pés ou se remexe na cadeira.' },
  { id: 11, domain: 'hiper', text: 'Sai do lugar na sala de aula ou em outras situações em que se espera que fique sentado.' },
  { id: 12, domain: 'hiper', text: 'Corre de um lado para outro ou sobe demais nas coisas em situações em que isto é inapropriado.' },
  { id: 13, domain: 'hiper', text: 'Tem dificuldade em brincar ou envolver-se em atividades de lazer de forma calma.' },
  { id: 14, domain: 'hiper', text: 'Não para ou frequentemente está a "mil por hora".' },
  { id: 15, domain: 'hiper', text: 'Fala em excesso.' },
  { id: 16, domain: 'hiper', text: 'Responde às perguntas de forma precipitada antes delas terem sido terminadas.' },
  { id: 17, domain: 'hiper', text: 'Tem dificuldade de esperar sua vez.' },
  { id: 18, domain: 'hiper', text: 'Interrompe os outros ou se intromete (p.ex. mete-se nas conversas/jogos).' },

  // Domínio 3: Comportamentos Disfuncionais / Oposicionismo - TOD (Itens 19 a 26)
  { id: 19, domain: 'tod', text: 'Descontrola-se.' },
  { id: 20, domain: 'tod', text: 'Discute com adultos.' },
  { id: 21, domain: 'tod', text: 'Desafia ativamente ou se recusa a atender pedidos ou regras de adultos.' },
  { id: 22, domain: 'tod', text: 'Faz coisas de propósito que incomodam outras pessoas.' },
  { id: 23, domain: 'tod', text: 'Culpa os outros pelos seus erros ou mau comportamento.' },
  { id: 24, domain: 'tod', text: 'É irritável ou facilmente incomodado pelos outros.' },
  { id: 25, domain: 'tod', text: 'É zangado e ressentido.' },
  { id: 26, domain: 'tod', text: 'É maldoso e vingativo.' }
];

const SNAP_OPTIONS = [
  { label: 'Nem um pouco', value: 0 },
  { label: 'Só um pouco', value: 1 },
  { label: 'Bastante', value: 2 },
  { label: 'Demais', value: 3 }
];

// Global Application State
let currentUser = null; // Currently logged in Firebase Google User
let patients = JSON.parse(localStorage.getItem('snapiv_patients') || '[]');
let activePatientId = localStorage.getItem('snapiv_active_patient') || null;
let snapAnswers = {};
let db = null; // Firestore Database reference
let auth = null; // Firebase Auth reference
let isCloudConnected = false;
let patientsUnsubscribe = null;

// DOM Initialization
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  setupTabs();
  initFirebaseEngine();
  initPatientsEngine();
  renderSnapQuestions();
  setupSnapEvents();
  setupAnamneseEvents();
});

// ==========================================================================
// 1. FIREBASE AUTH & FIRESTORE ENGINE (GOOGLE SIGN-IN)
// ==========================================================================
function initFirebaseEngine() {
  const configBtn = document.getElementById('cloudStatusBtn');
  if (configBtn) configBtn.addEventListener('click', openFirebaseConfigModal);

  const googleLoginBtn = document.getElementById('googleLoginBtn');
  if (googleLoginBtn) googleLoginBtn.addEventListener('click', handleGoogleLogin);

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

  // Check saved Firebase configuration or default
  const savedConfig = localStorage.getItem('snapiv_firebase_config');
  if (savedConfig && typeof firebase !== 'undefined') {
    try {
      const config = JSON.parse(savedConfig);
      if (!firebase.apps.length) {
        firebase.initializeApp(config);
      }
      db = firebase.firestore();
      auth = firebase.auth();
      isCloudConnected = true;
      updateCloudStatusUI();

      // Listen for Authentication state changes (Google Sign-In)
      auth.onAuthStateChanged(user => {
        if (user) {
          currentUser = user;
          onUserLoggedIn(user);
        } else {
          currentUser = null;
          onUserLoggedOut();
        }
      });

    } catch (e) {
      console.error('Error initializing Firebase:', e);
      isCloudConnected = false;
      updateCloudStatusUI();
    }
  } else {
    isCloudConnected = false;
    updateCloudStatusUI();
  }
}

function handleGoogleLogin() {
  if (!auth) {
    openFirebaseConfigModal();
    showToast('Por favor, configure o Firebase para habilitar o Login do Google.', true);
    return;
  }

  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).then(result => {
    showToast(`Bem-vindo(a), ${result.user.displayName}!`);
  }).catch(error => {
    console.error('Google Sign-in error:', error);
    showToast(`Erro ao entrar com Google: ${error.message}`, true);
  });
}

function handleLogout() {
  if (auth) {
    auth.signOut().then(() => {
      showToast('Sessão encerrada.');
    });
  }
}

function onUserLoggedIn(user) {
  // Show Main App, Hide Login Screen
  const loginView = document.getElementById('loginView');
  const mainApp = document.getElementById('mainAppContent');
  const navTabs = document.querySelector('.nav-tabs-container');

  if (loginView) loginView.style.display = 'none';
  if (mainApp) mainApp.style.display = 'block';
  if (navTabs) navTabs.style.display = 'block';

  // Update Header Profile UI
  const profileBadge = document.getElementById('userProfileBadge');
  const avatarImg = document.getElementById('userAvatarImg');
  const userNameText = document.getElementById('userNameText');

  if (profileBadge) profileBadge.style.display = 'flex';
  if (avatarImg) avatarImg.src = user.photoURL || 'https://lh3.googleusercontent.com/a/default-user';
  if (userNameText) userNameText.textContent = user.displayName || user.email;

  // Save/Update Psychologist Profile in Firestore
  if (db) {
    db.collection('users').doc(user.uid).set({
      uid: user.uid,
      name: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
      lastLogin: new Date().toISOString()
    }, { merge: true });

    // Subscribe to psychologist's patients in real-time
    if (patientsUnsubscribe) patientsUnsubscribe();
    
    patientsUnsubscribe = db.collection('patients')
      .where('psychologistId', '==', user.uid)
      .onSnapshot(snapshot => {
        const cloudPatients = [];
        snapshot.forEach(doc => {
          cloudPatients.push({ id: doc.id, ...doc.data() });
        });

        patients = cloudPatients;
        savePatientsToStorage(false);
        renderPatientsList();
        updateActivePatientBanner();
      }, err => {
        console.warn('Realtime patients listener error:', err);
      });
  }
}

function onUserLoggedOut() {
  const loginView = document.getElementById('loginView');
  const mainApp = document.getElementById('mainAppContent');
  const navTabs = document.querySelector('.nav-tabs-container');
  const profileBadge = document.getElementById('userProfileBadge');

  if (loginView) loginView.style.display = 'flex';
  if (mainApp) mainApp.style.display = 'none';
  if (navTabs) navTabs.style.display = 'none';
  if (profileBadge) profileBadge.style.display = 'none';

  if (patientsUnsubscribe) patientsUnsubscribe();
}

function updateCloudStatusUI() {
  const badge = document.getElementById('cloudStatusBtn');
  if (!badge) return;

  if (isCloudConnected) {
    badge.className = 'cloud-status-badge connected';
    badge.innerHTML = '🟢 Nuvem Firebase Ativa';
  } else {
    badge.className = 'cloud-status-badge local';
    badge.innerHTML = '🟡 Armazenamento Local';
  }
}

function openFirebaseConfigModal() {
  const modal = document.getElementById('firebaseConfigModal');
  if (modal) modal.style.display = 'flex';
}

window.closeFirebaseModal = function() {
  const modal = document.getElementById('firebaseConfigModal');
  if (modal) modal.style.display = 'none';
};

window.saveFirebaseConfig = function() {
  const jsonStr = document.getElementById('firebaseConfigJson').value.trim();
  if (!jsonStr) {
    showToast('Por favor, cole as chaves do Firebase.', true);
    return;
  }

  try {
    const parsed = JSON.parse(jsonStr);
    localStorage.setItem('snapiv_firebase_config', JSON.stringify(parsed));
    showToast('Configuração salva! Recarregando aplicação...');
    setTimeout(() => location.reload(), 1000);
  } catch (e) {
    showToast('Formato JSON inválido. Verifique o texto colado.', true);
  }
};

// ==========================================================================
// 2. NAVIGATION TABS ENGINE
// ==========================================================================
function setupTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetView = tab.getAttribute('data-view');
      switchView(targetView);
    });
  });
}

function switchView(viewId) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    if (btn.getAttribute('data-view') === viewId) btn.classList.add('active');
    else btn.classList.remove('active');
  });

  const views = ['patientsView', 'anamneseView', 'anamneseReportView', 'questionnaireView', 'reportView'];
  views.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  const targetEl = document.getElementById(viewId);
  if (targetEl) targetEl.style.display = 'block';

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==========================================================================
// 3. PATIENTS MANAGER ENGINE ("PACIENTES" CLOUD & LOCAL)
// ==========================================================================
function initPatientsEngine() {
  const addBtn = document.getElementById('addPatientBtn');
  if (addBtn) addBtn.addEventListener('click', handleAddPatient);
  renderPatientsList();
}

function handleAddPatient() {
  const name = document.getElementById('newPatientName').value.trim();
  const birthDate = document.getElementById('newPatientBirth').value;
  const parentName = document.getElementById('newPatientParent').value.trim();
  const phone = document.getElementById('newPatientPhone').value.trim();

  if (!name) {
    showToast('Por favor, informe pelo menos o Nome do Paciente.', true);
    return;
  }

  const newPatient = {
    id: 'pat_' + Date.now(),
    psychologistId: currentUser ? currentUser.uid : 'local_user',
    psychologistEmail: currentUser ? currentUser.email : 'local',
    name: name,
    birthDate: birthDate,
    parentName: parentName,
    phone: phone,
    folderPath: `PACIENTES/${name.replace(/[^a-zA-Z0-9_\- ]/g, '')}`,
    createdAt: new Date().toISOString(),
    evaluations: []
  };

  patients.push(newPatient);
  savePatientsToStorage(true);

  if (isCloudConnected && db && currentUser) {
    db.collection('patients').doc(newPatient.id).set(newPatient).then(() => {
      showToast(`Paciente "${name}" salvo na sua conta do Google no banco de dados!`);
    }).catch(err => console.error(err));
  } else {
    showToast(`Paciente "${name}" salvo com sucesso!`);
  }

  setActivePatient(newPatient.id);

  document.getElementById('newPatientName').value = '';
  document.getElementById('newPatientBirth').value = '';
  document.getElementById('newPatientParent').value = '';
  document.getElementById('newPatientPhone').value = '';

  renderPatientsList();
}

function savePatientsToStorage(syncCloud = true) {
  localStorage.setItem('snapiv_patients', JSON.stringify(patients));
}

function setActivePatient(id) {
  activePatientId = id;
  localStorage.setItem('snapiv_active_patient', id);
  updateActivePatientBanner();
  renderPatientsList();

  const patient = patients.find(p => p.id === id);
  if (patient) {
    const snapPatName = document.getElementById('patientName');
    if (snapPatName) snapPatName.value = patient.name;

    const snapRespName = document.getElementById('responderName');
    if (snapRespName && patient.parentName) snapRespName.value = patient.parentName;

    const anamPatName = document.getElementById('anam_name');
    if (anamPatName) anamPatName.value = patient.name;
  }
}

function updateActivePatientBanner() {
  const banners = document.querySelectorAll('.active-patient-text');
  const patient = patients.find(p => p.id === activePatientId);

  banners.forEach(b => {
    if (patient) {
      b.innerHTML = `Paciente Ativo: <strong>${patient.name}</strong> <span style="font-size: 0.8rem; color: var(--text-muted);">(Pasta: 📁 ${patient.folderPath})</span>`;
    } else {
      b.innerHTML = `Nenhum paciente selecionado. <a href="#" onclick="switchView('patientsView'); return false;" style="color: var(--primary);">Selecionar na Central de Pacientes</a>`;
    }
  });
}

function renderPatientsList() {
  const container = document.getElementById('patientsListContainer');
  if (!container) return;

  if (patients.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 32px; color: var(--text-muted);">
        <i class="ph ph-folder-open" style="font-size: 3rem; margin-bottom: 8px;"></i>
        <p>Nenhum paciente cadastrado para esta conta de psicólogo(a).</p>
      </div>
    `;
    return;
  }

  container.innerHTML = patients.map(p => {
    const isActive = p.id === activePatientId;
    const evalCount = p.evaluations ? p.evaluations.length : 0;
    
    return `
      <div class="patient-card" style="${isActive ? 'border-color: var(--teal-accent); background: var(--teal-light);' : ''}">
        <div class="patient-info-group">
          <div class="folder-icon">
            <i class="ph ph-folder-user"></i>
          </div>
          <div class="patient-details">
            <h4>${p.name} ${isActive ? '<span style="font-size: 0.75rem; background: var(--teal-accent); color: white; padding: 2px 8px; border-radius: 99px; margin-left: 6px;">ATIVO</span>' : ''}</h4>
            <p>📁 Diretorio: <code>${p.folderPath}</code></p>
            <p style="margin-top: 4px; font-size: 0.8rem; color: var(--text-muted);">
              ${p.parentName ? 'Responsável: ' + p.parentName + ' | ' : ''}
              Histórico: ${evalCount} avaliação(ões) salva(s)
            </p>
          </div>
        </div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button class="btn btn-secondary" onclick="setActivePatient('${p.id}')">
            <i class="ph ph-check"></i> ${isActive ? 'Selecionado' : 'Selecionar'}
          </button>
          <button class="btn btn-outline" onclick="exportPatientFolder('${p.id}')">
            <i class="ph ph-download-simple"></i> Exportar
          </button>
          <button class="btn btn-secondary" onclick="deletePatient('${p.id}')" style="color: #ef4444;">
            <i class="ph ph-trash"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

window.deletePatient = function(id) {
  if (confirm('Deseja realmente excluir este paciente e seu histórico de avaliações?')) {
    patients = patients.filter(p => p.id !== id);
    if (activePatientId === id) activePatientId = null;
    savePatientsToStorage();

    if (isCloudConnected && db) {
      db.collection('patients').doc(id).delete().catch(err => console.error(err));
    }

    updateActivePatientBanner();
    renderPatientsList();
    showToast('Paciente removido.');
  }
};

window.exportPatientFolder = function(id) {
  const patient = patients.find(p => p.id === id);
  if (!patient) return;

  const content = `=== PRONTUÁRIO CLÍNICO EM NUVEM: ${patient.name} ===
Psicólogo(a) Responsável: ${currentUser ? currentUser.displayName + ' (' + currentUser.email + ')' : 'Local'}
Diretório: ${patient.folderPath}
Data de Cadastro: ${patient.createdAt}
Responsável: ${patient.parentName || 'N/A'}
Telefone: ${patient.phone || 'N/A'}

==================================================
HISTÓRICO DE AVALIAÇÕES (${patient.evaluations ? patient.evaluations.length : 0}):
==================================================
${(patient.evaluations || []).map((ev, i) => `
[AVALIAÇÃO #${i+1} - ${ev.type.toUpperCase()}]
Data: ${ev.date}
Título: ${ev.title}
Resumo: ${ev.summary}
--------------------------------------------------
`).join('\n')}
`;

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${patient.name.replace(/\s+/g, '_')}_Prontuario.txt`;
  a.click();
  URL.revokeObjectURL(url);

  showToast(`Prontuário de ${patient.name} exportado!`);
};

function saveEvaluationToActivePatient(evalType, title, summaryText) {
  if (!activePatientId) return;

  const patient = patients.find(p => p.id === activePatientId);
  if (!patient) return;

  if (!patient.evaluations) patient.evaluations = [];

  const newEval = {
    id: 'eval_' + Date.now(),
    type: evalType,
    title: title,
    date: new Date().toLocaleDateString('pt-BR'),
    summary: summaryText
  };

  patient.evaluations.push(newEval);
  savePatientsToStorage();

  if (isCloudConnected && db && currentUser) {
    db.collection('patients').doc(patient.id).set(patient, { merge: true }).then(() => {
      showToast(`Avaliação salva no prontuário do paciente na nuvem!`);
    }).catch(err => console.error(err));
  } else {
    showToast(`Avaliação salva no prontuário do paciente!`);
  }

  renderPatientsList();
}

// ==========================================================================
// 4. ANAMNESE ENGINE
// ==========================================================================
function setupAnamneseEvents() {
  const genBtn = document.getElementById('generateAnamneseBtn');
  if (genBtn) genBtn.addEventListener('click', generateAnamneseReport);

  const demoBtn = document.getElementById('fillAnamneseDemoBtn');
  if (demoBtn) demoBtn.addEventListener('click', fillAnamneseDemoData);

  const backBtn = document.getElementById('backToAnamneseFormBtn');
  if (backBtn) backBtn.addEventListener('click', () => switchView('anamneseView'));

  const printBtn = document.getElementById('printAnamneseReportBtn');
  if (printBtn) printBtn.addEventListener('click', () => window.print());

  const copyBtn = document.getElementById('copyAnamneseProntuarioBtn');
  if (copyBtn) copyBtn.addEventListener('click', copyAnamneseToClipboard);

  const saveBtn = document.getElementById('saveAnamneseToPatientBtn');
  if (saveBtn) saveBtn.addEventListener('click', saveAnamneseToPatientFolder);
}

function fillAnamneseDemoData() {
  document.getElementById('anam_name').value = 'Gabriel Silva Siqueira';
  document.getElementById('anam_birth').value = '2016-04-12';
  document.getElementById('anam_age').value = '8 anos';
  document.getElementById('anam_natural').value = 'Florianópolis / SC';
  document.getElementById('anam_address').value = 'Rua das Flores, 123';
  document.getElementById('anam_district').value = 'Centro';
  document.getElementById('anam_city').value = 'Florianópolis';

  document.getElementById('anam_mother_name').value = 'Mariana Silva Siqueira';
  document.getElementById('anam_mother_age').value = '35';
  document.getElementById('anam_mother_phone').value = '(48) 99988-7766';
  document.getElementById('anam_mother_job').value = 'Professora';
  document.getElementById('anam_mother_school').value = 'Ensino Superior Completo';

  document.getElementById('anam_father_name').value = 'Carlos Eduardo Siqueira';
  document.getElementById('anam_father_age').value = '38';
  document.getElementById('anam_father_job').value = 'Engenheiro';

  document.getElementById('anam_parents_relation').value = 'Casados (há 10 anos)';
  document.getElementById('anam_other_house').value = 'Irmã menor (Juliana, 4 anos)';

  document.getElementById('anam_queixa').value = 'Dificuldade de concentração na escola, agitação motora em casa e oscilações de humor. A professora relatou que ele se distrai com facilidade durante as explicações.';

  document.getElementById('anam_gest_concep').value = 'Filho natural; Gravidez planejada; Mão com 27 anos na época.';
  document.getElementById('anam_gest_disease').value = 'Infecção urinária leve no 2º trimestre (tratada).';
  document.getElementById('anam_parto').value = 'Parto Cesárea a termo (39 semanas). Sem intercorrências graves. Apgar 9/10, peso 3.250g, altura 49cm.';

  document.getElementById('anam_alimenta').value = 'Amamentou no peito até 6 meses. Boa aceitação na introdução alimentar. Atualmente se alimenta bem, porém com alguma ansiedade e voracidade nas refeições.';

  document.getElementById('anam_saude').value = 'Teve otites recorrentes aos 2 anos e catapora aos 5. Vacinação em dia. Não faz uso de medicação contínua.';

  document.getElementById('anam_sono').value = 'Dorme em quarto próprio. Sono levemente agitado, fala dormindo ocasionalmente. Dorme às 21h30 e acorda às 07h00.';

  document.getElementById('anam_motor').value = 'Sentou com 6 meses, engatinhou de quatro com 9 meses e andou com 1 ano e 1 mês. Ótimo equilíbrio e dominância manual direita.';

  document.getElementById('anam_linguagem').value = 'Primeiras palavras com 1 ano. Comunica-se muito bem e com bom vocabulário, mas costuma falar de forma ansiosa e rápida.';

  document.getElementById('anam_escola').value = 'Entrou na escola aos 3 anos. Boa adaptação social. Apresenta dificuldades na atenção sustentada, organização dos cadernos e finalização de tarefas extensas.';

  document.getElementById('anam_comportamento').value = 'Humor alegre e ativo. Prefere brincar em grupo. Gosta muito de blocos de montar, futebol e videogames. Apresenta certa teimosia frente a limites rígidos.';

  document.getElementById('anam_habitos').value = 'Eventual hábito de roer unhas quando ansioso. Apego normal a objetos.';

  showToast('Dados de demonstração preenchidos na Anamnese!');
}

function generateAnamneseReport() {
  const patientName = document.getElementById('anam_name').value.trim() || 'Paciente não identificado';
  const birth = document.getElementById('anam_birth').value;
  const age = document.getElementById('anam_age').value || '-';
  const queixa = document.getElementById('anam_queixa').value.trim() || 'Não informada.';

  const data = {
    patientName, birth, age,
    natural: document.getElementById('anam_natural').value,
    address: document.getElementById('anam_address').value,
    mother: document.getElementById('anam_mother_name').value,
    father: document.getElementById('anam_father_name').value,
    parentsRelation: document.getElementById('anam_parents_relation').value,
    otherHouse: document.getElementById('anam_other_house').value,
    queixa,
    gestConcep: document.getElementById('anam_gest_concep').value,
    gestDisease: document.getElementById('anam_gest_disease').value,
    parto: document.getElementById('anam_parto').value,
    alimenta: document.getElementById('anam_alimenta').value,
    saude: document.getElementById('anam_saude').value,
    sono: document.getElementById('anam_sono').value,
    motor: document.getElementById('anam_motor').value,
    linguagem: document.getElementById('anam_linguagem').value,
    escola: document.getElementById('anam_escola').value,
    comportamento: document.getElementById('anam_comportamento').value,
    habitos: document.getElementById('anam_habitos').value,
    evalDate: new Date().toLocaleDateString('pt-BR')
  };

  renderAnamneseReportHTML(data);
  switchView('anamneseReportView');
}

function renderAnamneseReportHTML(data) {
  const container = document.getElementById('anamneseReportContent');
  if (!container) return;

  container.innerHTML = `
    <div class="report-header-banner">
      <h2 style="font-family: var(--font-heading); font-size: 1.5rem; font-weight: 700;">Relatório de Anamnese Psicológica de Identificação</h2>
      <p style="font-size: 0.88rem; color: #cbd5e1; margin-top: 2px;">Histórico do Desenvolvimento e Mapeamento Clínico Completo</p>
      
      <div class="report-patient-info">
        <div class="info-item">
          <span class="label">Paciente / Criança</span>
          <span class="value">${data.patientName} (${data.age})</span>
        </div>
        <div class="info-item">
          <span class="label">Mãe / Pai</span>
          <span class="value">${data.mother || 'Mãe'} / ${data.father || 'Pai'}</span>
        </div>
        <div class="info-item">
          <span class="label">Data</span>
          <span class="value">${data.evalDate}</span>
        </div>
      </div>
    </div>

    <div class="card" style="border-left: 4px solid var(--primary);">
      <h3 class="card-title" style="color: var(--primary);"><i class="ph ph-chat-teardrop-text"></i> Queixa Principal & Motivo da Consulta</h3>
      <p style="font-size: 0.95rem; line-height: 1.6; white-space: pre-line;">${data.queixa}</p>
    </div>

    <div class="card">
      <h3 class="card-title"><i class="ph ph-users"></i> Composição Familiar & Ambiente</h3>
      <ul style="list-style: none; display: grid; gap: 8px; font-size: 0.9rem;">
        <li><strong>Relação dos Pais:</strong> ${data.parentsRelation || 'Não informado'}</li>
        <li><strong>Outros Moradores:</strong> ${data.otherHouse || 'Nenhum'}</li>
        <li><strong>Naturalidade / Endereço:</strong> ${data.natural || '-'} • ${data.address || '-'}</li>
      </ul>
    </div>

    <div class="card">
      <h3 class="card-title"><i class="ph ph-baby"></i> Gestação, Concepção e Parto</h3>
      <div style="display: grid; gap: 12px; font-size: 0.9rem;">
        <div><strong>Concepção & Gestação:</strong> ${data.gestConcep || 'Sem detalhes.'}</div>
        <div><strong>Intercorrências:</strong> ${data.gestDisease || 'Nenhuma.'}</div>
        <div><strong>Parto:</strong> ${data.parto || 'Sem detalhes.'}</div>
      </div>
    </div>

    <div class="card">
      <h3 class="card-title"><i class="ph ph-heartbeat"></i> Desenvolvimento & Saúde</h3>
      <div style="display: grid; gap: 12px; font-size: 0.9rem;">
        <div><strong>Alimentação:</strong> ${data.alimenta || '-'}</div>
        <div><strong>Saúde & Vacinas:</strong> ${data.saude || '-'}</div>
        <div><strong>Sono:</strong> ${data.sono || '-'}</div>
        <div><strong>Psicomotricidade:</strong> ${data.motor || '-'}</div>
        <div><strong>Linguagem:</strong> ${data.linguagem || '-'}</div>
        <div><strong>Escola:</strong> ${data.escola || '-'}</div>
        <div><strong>Comportamento:</strong> ${data.comportamento || '-'}</div>
      </div>
    </div>
  `;
}

function copyAnamneseToClipboard() {
  const name = document.getElementById('anam_name').value || 'Paciente';
  const queixa = document.getElementById('anam_queixa').value || 'Sem queixa informada';
  
  const text = `=== RELATÓRIO DE ANAMNESE PSICOLÓGICA ===
Data: ${new Date().toLocaleDateString('pt-BR')}
Paciente: ${name}
Idade: ${document.getElementById('anam_age').value || 'N/I'}

1. QUEIXA PRINCIPAL:
${queixa}

2. DADOS FAMILIARES:
Mãe: ${document.getElementById('anam_mother_name').value || '-'}
Pai: ${document.getElementById('anam_father_name').value || '-'}
==================================================`;

  navigator.clipboard.writeText(text).then(() => {
    showToast('Anamnese copiada para o Prontuário!');
  });
}

function saveAnamneseToPatientFolder() {
  const summary = `Anamnese realizada em ${new Date().toLocaleDateString('pt-BR')}. Queixa: ${document.getElementById('anam_queixa').value.substring(0, 100)}...`;
  saveEvaluationToActivePatient('anamnese', 'Anamnese de Identificação', summary);
}

// ==========================================================================
// 5. SNAP-IV ENGINE
// ==========================================================================
function renderSnapQuestions() {
  const container = document.getElementById('questionsContainer');
  if (!container) return;
  container.innerHTML = '';

  let currentDomain = null;

  SNAP_QUESTIONS.forEach(q => {
    if (q.domain !== currentDomain) {
      currentDomain = q.domain;
      const domainHeader = document.createElement('div');
      
      let badgeClass = '';
      let domainTitle = '';
      let domainSubtitle = '';

      if (currentDomain === 'desat') {
        badgeClass = 'domain-desat';
        domainTitle = 'Domínio I: Sintomas de Desatenção (Itens 1 a 9)';
        domainSubtitle = 'Critério DSM-5: Pelo menos 6 itens marcados como "Bastante" ou "Demais"';
      } else if (currentDomain === 'hiper') {
        badgeClass = 'domain-hiper';
        domainTitle = 'Domínio II: Sintomas de Hiperatividade e Impulsividade (Itens 10 a 18)';
        domainSubtitle = 'Critério DSM-5: Pelo menos 6 itens marcados como "Bastante" ou "Demais"';
      } else if (currentDomain === 'tod') {
        badgeClass = 'domain-tod';
        domainTitle = 'Domínio III: Comportamentos Opositores / Disfuncionais - TOD (Itens 19 a 26)';
        domainSubtitle = 'Ponto de corte clínico: Pelo menos 4 itens marcados como "Bastante" ou "Demais"';
      }

      domainHeader.innerHTML = `
        <div style="margin-top: 32px; margin-bottom: 16px;">
          <span class="domain-badge-header ${badgeClass}">${domainTitle}</span>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 4px;">${domainSubtitle}</p>
        </div>
      `;
      container.appendChild(domainHeader);
    }

    const card = document.createElement('div');
    card.className = `question-item ${snapAnswers[q.id] !== undefined ? 'answered' : 'unanswered'}`;
    card.id = `q-card-${q.id}`;

    const optionsHtml = SNAP_OPTIONS.map(opt => {
      const isSelected = snapAnswers[q.id] === opt.value;
      return `
        <label class="option-btn ${isSelected ? 'selected' : ''}" data-value="${opt.value}" onclick="selectSnapAnswer(${q.id}, ${opt.value})">
          <input type="radio" name="q_${q.id}" value="${opt.value}" ${isSelected ? 'checked' : ''}>
          <span class="option-label">${opt.label}</span>
          <span class="option-value">(${opt.value} pto${opt.value !== 1 ? 's' : ''})</span>
        </label>
      `;
    }).join('');

    card.innerHTML = `
      <div class="question-header">
        <span class="question-number">${String(q.id).padStart(2, '0')}</span>
        <span class="question-text">${q.text}</span>
      </div>
      <div class="options-grid">${optionsHtml}</div>
    `;

    container.appendChild(card);
  });

  updateSnapProgressBar();
}

window.selectSnapAnswer = function(questionId, value) {
  snapAnswers[questionId] = value;
  const card = document.getElementById(`q-card-${questionId}`);
  if (card) {
    card.classList.remove('unanswered');
    card.classList.add('answered');

    card.querySelectorAll('.option-btn').forEach(btn => {
      const val = parseInt(btn.getAttribute('data-value'), 10);
      if (val === value) {
        btn.classList.add('selected');
        btn.querySelector('input').checked = true;
      } else {
        btn.classList.remove('selected');
        btn.querySelector('input').checked = false;
      }
    });
  }
  updateSnapProgressBar();
};

function updateSnapProgressBar() {
  const answeredCount = Object.keys(snapAnswers).length;
  const total = SNAP_QUESTIONS.length;
  const percentage = Math.round((answeredCount / total) * 100);

  const fill = document.getElementById('progressFill');
  const text = document.getElementById('progressText');

  if (fill) fill.style.width = `${percentage}%`;
  if (text) text.textContent = `${answeredCount} de ${total} itens respondidos (${percentage}%)`;
}

function setupSnapEvents() {
  const genBtn = document.getElementById('generateReportBtn');
  if (genBtn) genBtn.addEventListener('click', generateSnapReport);

  const demoBtn = document.getElementById('fillDemoBtn');
  if (demoBtn) demoBtn.addEventListener('click', fillSnapDemoData);

  const clearBtn = document.getElementById('clearAnswersBtn');
  if (clearBtn) clearBtn.addEventListener('click', () => {
    if (confirm('Limpar todas as respostas do SNAP-IV?')) {
      snapAnswers = {};
      renderSnapQuestions();
      showToast('Formulário SNAP-IV limpo.');
    }
  });

  const backBtn = document.getElementById('backToQuestionsBtn');
  if (backBtn) backBtn.addEventListener('click', () => switchView('questionnaireView'));

  const printBtn = document.getElementById('printReportBtn');
  if (printBtn) printBtn.addEventListener('click', () => window.print());

  const copyBtn = document.getElementById('copyProntuarioBtn');
  if (copyBtn) copyBtn.addEventListener('click', copySnapToClipboard);
}

function fillSnapDemoData() {
  const sample = {
    1: 3, 2: 2, 3: 2, 4: 3, 5: 2, 6: 2, 7: 3, 8: 2, 9: 1,
    10: 2, 11: 2, 12: 1, 13: 1, 14: 2, 15: 2, 16: 1, 17: 2, 18: 0,
    19: 1, 20: 1, 21: 0, 22: 1, 23: 0, 24: 1, 25: 0, 26: 0
  };
  snapAnswers = { ...sample };
  renderSnapQuestions();
  showToast('Respostas de exemplo preenchidas no SNAP-IV!');
}

function generateSnapReport() {
  const patientName = document.getElementById('patientName').value.trim() || 'Paciente não identificado';
  const responderName = document.getElementById('responderName').value.trim() || 'Não informado';
  const responderRole = document.getElementById('responderRole').value || 'Mãe';
  const evalDate = document.getElementById('evalDate').value || new Date().toISOString().split('T')[0];

  const desatItems = SNAP_QUESTIONS.filter(q => q.domain === 'desat');
  const hiperItems = SNAP_QUESTIONS.filter(q => q.domain === 'hiper');
  const todItems = SNAP_QUESTIONS.filter(q => q.domain === 'tod');

  const desatStats = calculateSubscale(desatItems, 6);
  const hiperStats = calculateSubscale(hiperItems, 6);
  const todStats = calculateSubscale(todItems, 4);

  renderSnapReportHTML({
    patientName, responderName, responderRole, evalDate,
    desatStats, hiperStats, todStats
  });

  saveEvaluationToActivePatient('snap', 'Avaliação SNAP-IV', `Desatenção: ${desatStats.significantCount}/9 | Hiperatividade: ${hiperStats.significantCount}/9 | TOD: ${todStats.significantCount}/8`);

  switchView('reportView');
}

function calculateSubscale(items, threshold) {
  let totalScore = 0;
  let significantCount = 0;

  items.forEach(item => {
    const val = snapAnswers[item.id] || 0;
    totalScore += val;
    if (val >= 2) significantCount++;
  });

  const meanScore = (totalScore / items.length).toFixed(2);
  let status = 'normal';
  let statusText = '';
  let explanation = '';

  if (threshold === 6) {
    if (significantCount >= 6) {
      status = 'positive';
      statusText = 'Indicativo Elevado (DSM-5 Preenchido)';
      explanation = `Preencheu <strong>${significantCount} de 9 itens</strong> como "Bastante" ou "Demais". Indicativo clínico para Desatenção/Hiperatividade.`;
    } else if (significantCount === 5) {
      status = 'warning';
      statusText = 'Zona de Observação (5/6 Itens)';
      explanation = `Preencheu <strong>5 de 9 itens</strong> como "Bastante" ou "Demais". Limite de atenção.`;
    } else {
      status = 'normal';
      statusText = 'Baixa Relevância Clínica';
      explanation = `Preencheu <strong>${significantCount} de 9 itens</strong>. Dentro da faixa de normalidade.`;
    }
  } else {
    if (significantCount >= 4) {
      status = 'positive';
      statusText = 'Indicativo Elevado (TOD)';
      explanation = `Preencheu <strong>${significantCount} de 8 itens</strong> como "Bastante" ou "Demais". Sintomas de Oposicionismo.`;
    } else if (significantCount === 3) {
      status = 'warning';
      statusText = 'Zona de Observação (3/4 Itens)';
      explanation = `Preencheu <strong>3 de 8 itens</strong>. Comportamentos opositores moderados.`;
    } else {
      status = 'normal';
      statusText = 'Baixa Relevância Clínica';
      explanation = `Preencheu <strong>${significantCount} de 8 itens</strong>. Dentro da normalidade.`;
    }
  }

  return { items, totalScore, significantCount, meanScore, status, statusText, explanation };
}

function renderSnapReportHTML(data) {
  const container = document.getElementById('reportViewContent');
  if (!container) return;

  const createTable = (stats) => {
    const rows = stats.items.map(item => {
      const val = snapAnswers[item.id];
      const opt = SNAP_OPTIONS.find(o => o.value === val);
      return `
        <tr>
          <td style="width: 40px; font-weight: 700;">${String(item.id).padStart(2, '0')}</td>
          <td>${item.text}</td>
          <td><span class="score-badge-sm score-${val}">${opt ? opt.label : '-'} (${val} p)</span></td>
        </tr>
      `;
    }).join('');
    return `<table class="breakdown-table"><thead><tr><th>Item</th><th>Sintoma</th><th>Resposta</th></tr></thead><tbody>${rows}</tbody></table>`;
  };

  container.innerHTML = `
    <div class="report-header-banner">
      <h2 style="font-family: var(--font-heading); font-size: 1.5rem; font-weight: 700;">Relatório de Avaliação MTA-SNAP-IV</h2>
      <p style="font-size: 0.88rem; color: #cbd5e1;">Rastreio de TDAH e Transtorno Opositor Desafiador (DSM-5)</p>
      
      <div class="report-patient-info">
        <div class="info-item">
          <span class="label">Paciente</span>
          <span class="value">${data.patientName}</span>
        </div>
        <div class="info-item">
          <span class="label">Respondedor</span>
          <span class="value">${data.responderName} (${data.responderRole})</span>
        </div>
        <div class="info-item">
          <span class="label">Data</span>
          <span class="value">${data.evalDate}</span>
        </div>
      </div>
    </div>

    <div class="result-card">
      <div class="result-card-header">
        <h3 class="result-title" style="color: var(--primary);">Domínio I: Desatenção</h3>
        <span class="status-badge ${data.desatStats.status}">${data.desatStats.statusText}</span>
      </div>
      <p style="margin-bottom: 12px;">Itens significativos: <strong>${data.desatStats.significantCount} de 9</strong> | Média: <strong>${data.desatStats.meanScore}</strong></p>
      <div class="clinical-explanation">${data.desatStats.explanation}</div>
      <details style="margin-top: 12px;"><summary style="cursor: pointer; font-size: 0.85rem; color: var(--text-muted);">Ver respostas (01 a 09)</summary>${createTable(data.desatStats)}</details>
    </div>

    <div class="result-card">
      <div class="result-card-header">
        <h3 class="result-title" style="color: var(--teal-accent);">Domínio II: Hiperatividade e Impulsividade</h3>
        <span class="status-badge ${data.hiperStats.status}">${data.hiperStats.statusText}</span>
      </div>
      <p style="margin-bottom: 12px;">Itens significativos: <strong>${data.hiperStats.significantCount} de 9</strong> | Média: <strong>${data.hiperStats.meanScore}</strong></p>
      <div class="clinical-explanation" style="border-left-color: var(--teal-accent);">${data.hiperStats.explanation}</div>
      <details style="margin-top: 12px;"><summary style="cursor: pointer; font-size: 0.85rem; color: var(--text-muted);">Ver respostas (10 a 18)</summary>${createTable(data.hiperStats)}</details>
    </div>

    <div class="result-card">
      <div class="result-card-header">
        <h3 class="result-title" style="color: var(--accent-purple);">Domínio III: Oposicionismo / TOD</h3>
        <span class="status-badge ${data.todStats.status}">${data.todStats.statusText}</span>
      </div>
      <p style="margin-bottom: 12px;">Itens significativos: <strong>${data.todStats.significantCount} de 8</strong> | Média: <strong>${data.todStats.meanScore}</strong></p>
      <div class="clinical-explanation" style="border-left-color: var(--accent-purple);">${data.todStats.explanation}</div>
      <details style="margin-top: 12px;"><summary style="cursor: pointer; font-size: 0.85rem; color: var(--text-muted);">Ver respostas (19 a 26)</summary>${createTable(data.todStats)}</details>
    </div>
  `;
}

function copySnapToClipboard() {
  const text = `=== AVALIAÇÃO MTA-SNAP-IV ===
Data: ${new Date().toLocaleDateString('pt-BR')}
Paciente: ${document.getElementById('patientName').value || 'Paciente'}

DESATENÇÃO: ${calculateSubscale(SNAP_QUESTIONS.filter(q => q.domain === 'desat'), 6).significantCount}/9 itens significativos.
HIPERATIVIDADE: ${calculateSubscale(SNAP_QUESTIONS.filter(q => q.domain === 'hiper'), 6).significantCount}/9 itens significativos.
TOD / OPOSICIONISMO: ${calculateSubscale(SNAP_QUESTIONS.filter(q => q.domain === 'tod'), 4).significantCount}/8 itens significativos.
========================================`;

  navigator.clipboard.writeText(text).then(() => {
    showToast('Resumo do SNAP-IV copiado!');
  });
}

function showToast(message, isError = false) {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  if (isError) toast.style.borderLeft = '4px solid #ef4444';
  else toast.style.borderLeft = '4px solid #10b981';

  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => toast.remove(), 3500);
}

function initTheme() {
  const saved = localStorage.getItem('snapiv_theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  const btn = document.getElementById('themeToggleBtn');
  if (btn) btn.addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme');
    const next = cur === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('snapiv_theme', next);
  });
}
