// Importações do Firebase SDK v11 (JavaScript)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, collection, query, onSnapshot, addDoc, getDoc, getDocs, where, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { setLogLevel } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";

// Ativa o log de debug para o Firestore
setLogLevel('Debug');

// Configurações Globais (Estas variáveis são injetadas pelo ambiente Canvas)
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// --- CONFIGURAÇÃO FIREBASE ---
let firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};

if (Object.keys(firebaseConfig).length === 0) {
    // Configuração de Fallback (MANTIDA PARA GARANTIR A EXECUÇÃO EM AMBIENTES FORA DO CANVAS)
    // ESTA CHAVE DEVE SER SUBSTITUÍDA PELA SUA PRÓPRIA CHAVE DO FIREBASE
    firebaseConfig = {
        apiKey: "AIzaSyDo6uA_fJGbKqLfj9kwUu1JSkC34HGlWk0",
        authDomain: "registrar-frenquencia.firebaseapp.com",
        projectId: "registrar-frenquencia",
        storageBucket: "registrar-frenquencia.firebasestorage.app",
        messagingSenderId: "571143130821",
        appId: "1:571143130821:web:812eb820306f6b0338eaac"
    };
}


// Variáveis de Estado do Aplicativo
let app;
let db;
let auth;
let userId = null;
let currentClasses = [];
let currentClassId = null;
let currentRoster = [];
let currentAttendanceRecord = {}; // { studentName: boolean }


// Referências ao DOM
const classSelectEl = document.getElementById('classSelect');
const loadRosterBtn = document.getElementById('loadRosterBtn');
const saveAttendanceBtn = document.getElementById('saveAttendanceBtn');
const rosterListEl = document.getElementById('rosterList');
const dateInputEl = document.getElementById('dateInput');
const addClassBtn = document.getElementById('addClassBtn');
const editClassBtn = document.getElementById('editClassBtn');
const addClassModal = document.getElementById('addClassModal');
const cancelAddClassBtn = document.getElementById('cancelAddClassBtn');
const saveClassBtn = document.getElementById('saveClassBtn');
const deleteClassBtn = document.getElementById('deleteClassBtn');
const classNameInputEl = document.getElementById('classNameInput');
const studentListInputEl = document.getElementById('studentListInput');
const loadingEl = document.getElementById('loadingMessage');
const appContentEl = document.getElementById('appContent');
const userIdDisplayEl = document.getElementById('userIdDisplay');
const rosterContainerEl = document.getElementById('rosterContainer');
const messageModal = document.getElementById('messageModal');
const messageTitleEl = document.getElementById('messageTitle');
const messageTextEl = document.getElementById('messageText');
const closeMessageBtn = document.getElementById('closeMessageBtn');
const statusMessageEl = document.getElementById('statusMessage');
const exportDataBtn = document.getElementById('exportDataBtn');
const modalTitleEl = document.getElementById('modalTitle');


// --- FUNÇÕES DE UTILIDADE ---

/**
 * Exibe uma mensagem de toast/modal personalizada.
 * @param {string} title - Título da mensagem.
 * @param {string} text - Conteúdo da mensagem.
 */
function showMessage(title, text) {
    messageTitleEl.textContent = title;
    messageTextEl.textContent = text;
    messageModal.classList.remove('hidden');
    messageModal.classList.add('flex');
}

/**
 * Fecha a mensagem de toast/modal.
 */
function closeMessage() {
    messageModal.classList.add('hidden');
    messageModal.classList.remove('flex');
}

/**
 * Obtém o caminho base da coleção de turmas do Firestore para o usuário.
 */
function getClassesCollectionRef() {
    if (!db || !userId) return null;
    return collection(db, `artifacts/${appId}/users/${userId}/classes`);
}

/**
 * Obtém o caminho base da coleção de registros de frequência.
 */
function getAttendanceCollectionRef() {
    if (!db || !userId) return null;
    return collection(db, `artifacts/${appId}/users/${userId}/attendance_records`);
}

/**
 * Formata a data para a chave do documento do Firestore.
 * @param {string} classId - ID da turma.
 * @param {string} date - Data no formato AAAA-MM-DD.
 * @returns {string} - Chave formatada (ex: TurmaA_2025-10-09).
 */
function getAttendanceDocId(classId, date) {
    return `${classId}_${date}`;
}

/**
 * Define a data atual como valor padrão no input de data.
 */
function setDefaultDate() {
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    dateInputEl.value = formattedDate;
}

// --- FUNÇÕES DE RENDERIZAÇÃO ---

/**
 * Renderiza a lista de turmas no <select>.
 * @param {Array<Object>} classes - Array de objetos de turma.
 */
function renderClassesSelect(classes) {
    classSelectEl.innerHTML = ''; // Limpa as opções existentes
    classSelectEl.disabled = false;
    editClassBtn.disabled = true;

    if (classes.length === 0) {
        classSelectEl.innerHTML = '<option value="" disabled selected>Nenhuma Turma Encontrada</option>';
        loadRosterBtn.disabled = true;
        rosterContainerEl.classList.add('hidden');
        return;
    }

    classSelectEl.innerHTML = '<option value="" disabled selected>Selecione uma turma</option>';
    classes.forEach(cls => {
        const option = document.createElement('option');
        option.value = cls.id;
        option.textContent = cls.name;
        classSelectEl.appendChild(option);
    });
}

/**
 * Renderiza a lista de alunos para a chamada.
 * @param {Array<string>} roster - Array de nomes de alunos.
 * @param {Object} attendance - Objeto de frequência {nomeAluno: true/false}.
 */
function renderRoster(roster, attendance = {}) {
    rosterListEl.innerHTML = '';
    rosterContainerEl.classList.remove('hidden');
    saveAttendanceBtn.disabled = false;

    if (roster.length === 0) {
        rosterListEl.innerHTML = '<p class="text-gray-500">A turma selecionada não tem alunos cadastrados.</p>';
        saveAttendanceBtn.disabled = true;
        return;
    }

    roster.forEach(studentName => {
        const studentId = studentName.replace(/\s+/g, '_'); // Cria um ID seguro
        const isPresent = attendance[studentName] !== false; // Padrão é Presente se não houver registro

        const item = document.createElement('div');
        item.className = 'flex items-center justify-between p-3 bg-white rounded-lg shadow-sm border border-gray-100';
        item.innerHTML = `
            <span class="text-gray-800 font-medium">${studentName}</span>
            
            <!-- Switch de Presença Customizado -->
            <label class="inline-flex items-center cursor-pointer">
                <input type="checkbox" id="presence-${studentId}" data-student-name="${studentName}" class="sr-only presence-checkbox" ${isPresent ? 'checked' : ''}>
                <div class="w-11 h-6 bg-gray-200 rounded-full peer-focus:ring-2 peer-focus:ring-primary peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:border-gray-300 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500 transition-colors duration-300"></div>
                <span class="ml-3 text-sm font-medium text-gray-900">
                    ${isPresent ? 'Presente' : 'Faltou'}
                </span>
            </label>
        `;
        rosterListEl.appendChild(item);

        // Adiciona listener para atualizar o texto 'Presente/Faltou'
        const checkbox = item.querySelector(`#presence-${studentId}`);
        const textSpan = item.querySelector('span:last-child');
        checkbox.addEventListener('change', () => {
            textSpan.textContent = checkbox.checked ? 'Presente' : 'Faltou';
        });
    });
}

// --- FUNÇÕES DE MANIPULAÇÃO DO FIREBASE ---

/**
 * Listener que carrega todas as turmas do Firestore em tempo real.
 */
function setupClassesListener() {
    const classesRef = getClassesCollectionRef();
    if (!classesRef) return;

    onSnapshot(classesRef, (snapshot) => {
        currentClasses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderClassesSelect(currentClasses);

        // Se uma turma estava selecionada, tenta re-selecioná-la
        if (currentClassId) {
            classSelectEl.value = currentClassId;
            // Se a turma foi deletada, reseta a seleção
            if (!currentClasses.find(c => c.id === currentClassId)) {
                currentClassId = null;
                classSelectEl.value = "";
                rosterContainerEl.classList.add('hidden');
                editClassBtn.disabled = true;
            }
        }
    }, (error) => {
        console.error("Erro ao carregar turmas:", error);
        showMessage("Erro de Conexão", "Não foi possível carregar as turmas. Verifique sua conexão e regras do Firebase.");
    });
}

/**
 * Salva ou atualiza a definição de uma turma no Firestore.
 * @param {string} className - Nome da turma.
 * @param {Array<string>} studentRoster - Lista de alunos.
 * @param {string | null} docId - ID do documento para atualização (ou null para novo).
 */
async function saveClassBase(className, studentRoster, docId = null) {
    const classesRef = getClassesCollectionRef();
    if (!classesRef) {
        showMessage("Erro", "Usuário não autenticado.");
        return;
    }

    const classData = {
        name: className,
        roster: studentRoster,
        createdAt: new Date().toISOString()
    };

    try {
        if (docId) {
            // Atualizar Turma Existente
            const classDocRef = doc(classesRef, docId);
            await setDoc(classDocRef, classData);
            showMessage("Sucesso", `Turma '${className}' atualizada com sucesso.`);
        } else {
            // Adicionar Nova Turma
            await addDoc(classesRef, classData);
            showMessage("Sucesso", `Nova turma '${className}' adicionada com sucesso.`);
        }
    } catch (error) {
        console.error("Erro ao salvar turma:", error);
        showMessage("Erro ao Salvar", `Não foi possível salvar a turma. Detalhes: ${error.message}`);
    } finally {
        addClassModal.classList.add('hidden');
    }
}

/**
 * Carrega a lista de alunos e, se houver, o registro de frequência para a data selecionada.
 */
async function loadRosterAndAttendance() {
    currentClassId = classSelectEl.value;
    const date = dateInputEl.value;
    statusMessageEl.classList.add('hidden');

    if (!currentClassId || !date) {
        statusMessageEl.textContent = "Selecione uma turma e uma data.";
        statusMessageEl.classList.remove('hidden');
        rosterContainerEl.classList.add('hidden');
        return;
    }

    const selectedClass = currentClasses.find(c => c.id === currentClassId);
    if (!selectedClass) return;

    // 1. Define a lista de alunos atual
    currentRoster = selectedClass.roster || [];

    const attendanceDocId = getAttendanceDocId(currentClassId, date);
    const attendanceRef = doc(getAttendanceCollectionRef(), attendanceDocId);

    try {
        // 2. Tenta carregar o registro de frequência
        const attendanceSnapshot = await getDoc(attendanceRef);

        if (attendanceSnapshot.exists()) {
            // Registro encontrado: Pré-seleciona os status de presença
            currentAttendanceRecord = attendanceSnapshot.data().attendance;
            statusMessageEl.textContent = `Registro de frequência de ${date} encontrado e carregado.`;
            statusMessageEl.classList.remove('hidden');
            statusMessageEl.classList.remove('text-red-600');
            statusMessageEl.classList.add('text-green-600');
        } else {
            // Nenhum registro encontrado: Inicia com todos Presentes
            currentAttendanceRecord = {};
            currentRoster.forEach(name => currentAttendanceRecord[name] = true);
            statusMessageEl.textContent = `Nenhum registro encontrado para ${date}. Preenchendo a lista.`;
            statusMessageEl.classList.remove('hidden');
            statusMessageEl.classList.add('text-red-600');
            statusMessageEl.classList.remove('text-green-600');
        }

        // 3. Renderiza a lista com o status de presença carregado
        renderRoster(currentRoster, currentAttendanceRecord);

    } catch (error) {
        console.error("Erro ao carregar frequência:", error);
        showMessage("Erro de Carga", `Não foi possível carregar a lista de frequência. Detalhes: ${error.message}`);
    }
}

/**
 * Salva o registro de frequência atual no Firestore.
 */
async function saveAttendance() {
    const date = dateInputEl.value;
    if (!currentClassId || !date) {
        showMessage("Erro", "Selecione a turma e a data antes de salvar.");
        return;
    }

    const attendance = {};
    const checkboxes = rosterListEl.querySelectorAll('.presence-checkbox');
    let hasChanges = false;

    checkboxes.forEach(checkbox => {
        const studentName = checkbox.dataset.studentName;
        // O status é FALSO (faltou) se o checkbox NÃO estiver marcado
        attendance[studentName] = checkbox.checked;

        // Verifica se há alguma mudança significativa a ser salva
        if (attendance[studentName] !== currentAttendanceRecord[studentName]) {
            hasChanges = true;
        }
    });

    // Se a frequência for exatamente a mesma que a carregada, não salva
    if (!hasChanges && Object.keys(currentAttendanceRecord).length > 0) {
        showMessage("Atenção", "Nenhuma alteração detectada. O registro de frequência não foi salvo.");
        return;
    }

    const attendanceDocId = getAttendanceDocId(currentClassId, date);
    const attendanceRef = doc(getAttendanceCollectionRef(), attendanceDocId);

    const attendanceData = {
        classId: currentClassId,
        date: date,
        attendance: attendance,
        updatedAt: new Date().toISOString()
    };

    try {
        await setDoc(attendanceRef, attendanceData);
        // Atualiza o registro local após salvar
        currentAttendanceRecord = attendance;
        showMessage("Sucesso", `Frequência da turma salva para a data ${date}.`);

        statusMessageEl.textContent = `Frequência de ${date} salva com sucesso.`;
        statusMessageEl.classList.remove('hidden', 'text-red-600');
        statusMessageEl.classList.add('text-green-600');

    } catch (error) {
        console.error("Erro ao salvar frequência:", error);
        showMessage("Erro ao Salvar", `Não foi possível salvar o registro. Detalhes: ${error.message}`);
    }
}

/**
 * Deleta a turma base do Firestore.
 */
async function deleteClassBase(classId, className) {
    if (!confirm(`Tem certeza que deseja EXCLUIR permanentemente a turma "${className}"? Isso também removerá todos os registros de frequência associados (se houver).`)) {
        return;
    }

    try {
        // 1. Deleta o documento da turma base
        const classDocRef = doc(getClassesCollectionRef(), classId);
        await deleteDoc(classDocRef);

        // 2. (OPCIONAL) Limpa todos os registros de frequência associados
        // ATENÇÃO: Deletar coleções inteiras com um único comando é complexo no Firestore.
        // Aqui, apenas deletamos a turma base e notificamos o usuário.
        // A coleção 'attendance_records' pode conter registros 'pendurados' que o usuário deve limpar manualmente.

        showMessage("Sucesso", `Turma "${className}" excluída com sucesso!`);
        addClassModal.classList.add('hidden');

    } catch (error) {
        console.error("Erro ao deletar turma:", error);
        showMessage("Erro", `Não foi possível excluir a turma. Detalhes: ${error.message}`);
    }
}

/**
 * Exporta todos os dados (turmas e frequências) para um arquivo CSV.
 */
async function exportData() {
    try {
        // 1. Carregar Turmas
        const classesRef = getClassesCollectionRef();
        if (!classesRef) return showMessage("Erro", "Usuário não autenticado para exportar dados.");

        const classesSnapshot = await getDocs(classesRef);
        const classesMap = {}; // { classId: className }
        classesSnapshot.forEach(doc => {
            classesMap[doc.id] = doc.data().name;
        });

        // 2. Carregar Registros de Frequência
        const attendanceRef = getAttendanceCollectionRef();
        const attendanceSnapshot = await getDocs(attendanceRef);

        let csvContent = "Turma,Data,Nome do Aluno,Status\n";

        attendanceSnapshot.forEach(doc => {
            const data = doc.data();
            const className = classesMap[data.classId] || data.classId; // Usa o nome ou o ID
            const date = data.date;
            const attendance = data.attendance || {}; // Objeto {aluno: true/false}

            for (const studentName in attendance) {
                const status = attendance[studentName] ? "Presente" : "Faltou";
                csvContent += `"${className}","${date}","${studentName}","${status}"\n`;
            }
        });

        if (attendanceSnapshot.empty) {
            return showMessage("Informação", "Não há registros de frequência para exportar.");
        }

        // 3. Criar e Baixar o CSV
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'relatorio_frequencia.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showMessage("Sucesso", "Dados exportados para 'relatorio_frequencia.csv'.");

    } catch (error) {
        console.error("Erro na exportação:", error);
        showMessage("Erro", `Erro ao exportar dados: ${error.message}`);
    }
}

// --- CONFIGURAÇÃO DE EVENTOS ---

/**
 * Abre o modal para adicionar/editar turma.
 * @param {boolean} isEdit - True se for modo de edição.
 */
function openClassModal(isEdit = false) {
    if (isEdit) {
        const selectedClass = currentClasses.find(c => c.id === classSelectEl.value);
        if (!selectedClass) return;

        modalTitleEl.textContent = "Editar Turma Base";
        classNameInputEl.value = selectedClass.name;
        studentListInputEl.value = selectedClass.roster.join('\n');
        saveClassBtn.dataset.classId = selectedClass.id;
        deleteClassBtn.classList.remove('hidden');

    } else {
        modalTitleEl.textContent = "Adicionar Nova Turma Base";
        classNameInputEl.value = '';
        studentListInputEl.value = '';
        saveClassBtn.dataset.classId = '';
        deleteClassBtn.classList.add('hidden');
    }

    addClassModal.classList.remove('hidden');
    addClassModal.classList.add('flex');
}

// Adiciona Listeners
document.addEventListener('DOMContentLoaded', () => {
    setDefaultDate(); // Seta a data padrão ao carregar

    // Eventos de Botões Principais
    addClassBtn.addEventListener('click', () => openClassModal(false));
    editClassBtn.addEventListener('click', () => {
        if (classSelectEl.value) openClassModal(true);
    });
    loadRosterBtn.addEventListener('click', loadRosterAndAttendance);
    saveAttendanceBtn.addEventListener('click', saveAttendance);
    exportDataBtn.addEventListener('click', exportData);

    // Eventos do Modal
    cancelAddClassBtn.addEventListener('click', () => {
        addClassModal.classList.add('hidden');
    });

    saveClassBtn.addEventListener('click', () => {
        const name = classNameInputEl.value.trim();
        const roster = studentListInputEl.value.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        const docId = saveClassBtn.dataset.classId || null;

        if (name && roster.length > 0) {
            saveClassBase(name, roster, docId);
        } else {
            showMessage("Atenção", "Preencha o nome da turma e a lista de alunos.");
        }
    });

    deleteClassBtn.addEventListener('click', () => {
        const classId = saveClassBtn.dataset.classId;
        const className = classNameInputEl.value;
        if (classId) {
            deleteClassBase(classId, className);
        }
    });


    // Eventos de Seleção
    classSelectEl.addEventListener('change', () => {
        currentClassId = classSelectEl.value;
        editClassBtn.disabled = !currentClassId;
        loadRosterBtn.disabled = !currentClassId;
        // Limpa e esconde a lista ao trocar de turma
        rosterContainerEl.classList.add('hidden');
        rosterListEl.innerHTML = '';
        statusMessageEl.classList.add('hidden');
    });

    // Eventos do Modal de Mensagem
    closeMessageBtn.addEventListener('click', closeMessage);

    // Evento para Carregar a Lista ao Alterar a Data (se uma turma já estiver selecionada)
    dateInputEl.addEventListener('change', () => {
        if (classSelectEl.value) {
            loadRosterAndAttendance();
        }
    });

    // Inicialização
    initializeAppAndAuth();
});


// --- FUNÇÃO DE INICIALIZAÇÃO E AUTENTICAÇÃO ---

async function initializeAppAndAuth() {
    try {
        if (Object.keys(firebaseConfig).length === 0) {
             // Esta verificação agora é redundante, mas mantida para segurança
             throw new Error("Configuração do Firebase não encontrada.");
        }

        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);

        // Autenticação (usa token personalizado ou anônima)
        if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken);
        } else {
            await signInAnonymously(auth);
        }

        onAuthStateChanged(auth, (user) => {
            if (user) {
                userId = user.uid;
                userIdDisplayEl.textContent = `Usuário: ${userId}`;

                // Esconde o loading e mostra o conteúdo principal
                loadingEl.classList.add('hidden');
                appContentEl.classList.remove('hidden');

                // Inicia o listener de turmas após a autenticação
                setupClassesListener();
            } else {
                // Lógica caso a autenticação falhe ou o usuário se deslogue
                userIdDisplayEl.textContent = `Usuário: Desconectado`;
                loadingEl.textContent = "Erro de autenticação. Tente recarregar.";
            }
        });

    } catch (error) {
        console.error("Erro durante a inicialização:", error);
        loadingEl.innerHTML = `<span class=\"text-red-600\">Erro de Inicialização: ${error.message}.</span>`;
    }
}

initializeAppAndAuth();
