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

// --- VARIÁVEIS GLOBAIS FIREBASE E ESTADO DA APLICAÇÃO ---
let firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
let app;
let db;
let auth;
let userId = null;
let currentClasses = [];
let currentClassId = null; // ID da turma atualmente selecionada
let currentClassData = null; // Dados completos da turma selecionada
let currentFrequencyDocId = null; // ID do documento de frequência do dia

// --- ELEMENTOS DO DOM ---
const loadingEl = document.getElementById('loading');
const appContentEl = document.getElementById('appContent');
const userIdDisplayEl = document.getElementById('userIdDisplay');
const classesSelectEl = document.getElementById('classesSelect');
const studentsListEl = document.getElementById('studentsList');
const dateInputEl = document.getElementById('dateInput');
const registerFrequencyBtn = document.getElementById('registerFrequencyBtn');
const messageModal = document.getElementById('messageModal');
const messageTextEl = document.getElementById('messageText');
const closeMessageBtn = document.getElementById('closeMessageBtn');
const addClassModal = document.getElementById('addClassModal');
const modalTitleEl = document.getElementById('modalTitle');
const classNameInputEl = document.getElementById('classNameInput');
const studentListInputEl = document.getElementById('studentListInput');
const cancelAddClassBtn = document.getElementById('cancelAddClassBtn');
const saveClassBtn = document.getElementById('saveClassBtn');
const deleteClassBtn = document.getElementById('deleteClassBtn');
const newClassBtn = document.getElementById('newClassBtn');
const editClassBtn = document.getElementById('editClassBtn');
const viewReportBtn = document.getElementById('viewReportBtn');
const backToMainBtn = document.getElementById('backToMainBtn');
const mainScreenEl = document.getElementById('mainScreen');
const reportScreenEl = document.getElementById('reportScreen');
const reportClassSelectEl = document.getElementById('reportClassSelect');
const reportContentEl = document.getElementById('reportContent');

// --- UTILIDADES ---

/**
 * Exibe a mensagem de feedback em um modal.
 * @param {string} message A mensagem a ser exibida.
 */
function showMessage(message) {
    messageTextEl.textContent = message;
    messageModal.classList.remove('hidden');
    messageModal.classList.add('flex');
}

/**
 * Fecha o modal de mensagem.
 */
function closeMessage() {
    messageModal.classList.add('hidden');
    messageModal.classList.remove('flex');
}

/**
 * Mostra o modal de Adicionar/Editar Turma e configura o estado.
 * @param {boolean} isEditing Se está editando uma turma existente.
 * @param {Object} classData Dados da turma se estiver editando.
 */
function showClassModal(isEditing = false, classData = null) {
    if (isEditing && classData) {
        modalTitleEl.textContent = `Editar Turma: ${classData.name}`;
        classNameInputEl.value = classData.name || '';
        studentListInputEl.value = (classData.students || []).join('\n');
        deleteClassBtn.classList.remove('hidden');
        currentClassId = classData.id;
    } else {
        modalTitleEl.textContent = 'Adicionar Nova Turma Base';
        classNameInputEl.value = '';
        studentListInputEl.value = '';
        deleteClassBtn.classList.add('hidden');
        currentClassId = null; // Garante que é uma nova turma
    }
    addClassModal.classList.remove('hidden');
    addClassModal.classList.add('flex');
}

/**
 * Esconde o modal de Adicionar/Editar Turma.
 */
function hideClassModal() {
    addClassModal.classList.add('hidden');
    addClassModal.classList.remove('flex');
    // Limpa o estado
    currentClassId = null;
    classNameInputEl.value = '';
    studentListInputEl.value = '';
}

// --- FUNÇÕES DE FIREBASE / FIRESTORE ---

/**
 * Obtém o path da coleção de Turmas.
 * Turmas são privadas (apenas o usuário autenticado pode ver).
 * @returns {string} O caminho da coleção.
 */
function getClassCollectionPath() {
    if (!userId || !appId) {
        console.error("UserID ou AppID não definidos.");
        return null;
    }
    // Formato: /artifacts/{appId}/users/{userId}/classes
    return `artifacts/${appId}/users/${userId}/classes`;
}

/**
 * Obtém o path da coleção de Frequências.
 * Frequências são privadas (apenas o usuário autenticado pode ver).
 * @param {string} classId ID da turma.
 * @returns {string} O caminho da subcoleção.
 */
function getFrequencyCollectionPath(classId) {
    if (!classId) {
        console.error("Class ID não definido para frequência.");
        return null;
    }
    // Formato: /artifacts/{appId}/users/{userId}/classes/{classId}/frequency_records
    return `${getClassCollectionPath()}/${classId}/frequency_records`;
}

/**
 * Configura o listener em tempo real para as Turmas do usuário.
 */
function setupClassesListener() {
    const classesPath = getClassCollectionPath();
    if (!classesPath) return;

    const classesCollectionRef = collection(db, classesPath);
    const q = query(classesCollectionRef);

    // onSnapshot fornece atualizações em tempo real
    onSnapshot(q, (snapshot) => {
        currentClasses = [];
        snapshot.forEach((doc) => {
            currentClasses.push({ id: doc.id, ...doc.data() });
        });
        console.log("Turmas atualizadas:", currentClasses);
        updateClassSelects();
    }, (error) => {
        console.error("Erro ao ouvir a coleção de Turmas:", error);
        showMessage("Erro ao carregar turmas: " + error.message);
    });
}

/**
 * Salva (adiciona ou atualiza) uma turma.
 */
async function saveClass() {
    const className = classNameInputEl.value.trim();
    const studentList = studentListInputEl.value.trim();

    if (!className || !studentList) {
        showMessage("Por favor, preencha o nome da turma e a lista de alunos.");
        return;
    }

    const students = studentList.split('\n')
        .map(name => name.trim())
        .filter(name => name.length > 0);

    if (students.length === 0) {
        showMessage("A lista de alunos não pode estar vazia.");
        return;
    }

    const classesPath = getClassCollectionPath();
    if (!classesPath) return;

    try {
        const classData = {
            name: className,
            students: students,
            createdAt: currentClassId ? currentClassData.createdAt : new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (currentClassId) {
            // Atualizar Turma
            const classDocRef = doc(db, classesPath, currentClassId);
            await setDoc(classDocRef, classData);
            showMessage(`Turma "${className}" atualizada com sucesso!`);
        } else {
            // Adicionar Nova Turma
            await addDoc(collection(db, classesPath), classData);
            showMessage(`Turma "${className}" adicionada com sucesso!`);
        }

        hideClassModal();

    } catch (error) {
        console.error("Erro ao salvar turma:", error);
        showMessage("Erro ao salvar turma: " + error.message);
    }
}

/**
 * Exclui a turma atualmente aberta no modal de edição.
 */
async function deleteClass() {
    if (!currentClassId) return;

    if (!window.confirm(`Tem certeza que deseja EXCLUIR a turma "${classNameInputEl.value.trim()}" e todos os seus registros de frequência? Esta ação é irreversível!`)) {
        return;
    }

    const classesPath = getClassCollectionPath();
    if (!classesPath) return;

    try {
        // Passo 1: Excluir todos os documentos de frequência da subcoleção (BOA PRÁTICA: Em produção, isso seria feito com funções de backend)
        const frequencyPath = getFrequencyCollectionPath(currentClassId);
        const q = query(collection(db, frequencyPath));
        const snapshot = await getDocs(q);

        const deletePromises = [];
        snapshot.docs.forEach(docToDelete => {
            deletePromises.push(deleteDoc(doc(db, frequencyPath, docToDelete.id)));
        });
        await Promise.all(deletePromises);
        console.log(`Todos os ${deletePromises.length} registros de frequência foram excluídos.`);

        // Passo 2: Excluir o documento da Turma
        const classDocRef = doc(db, classesPath, currentClassId);
        await deleteDoc(classDocRef);

        showMessage(`Turma e todos os seus registros excluídos com sucesso!`);
        hideClassModal();
        currentClassId = null;
        currentClassData = null;
        clearStudentList();
        classesSelectEl.value = '';

    } catch (error) {
        console.error("Erro ao excluir turma:", error);
        showMessage("Erro ao excluir turma: " + error.message);
    }
}

/**
 * Busca o registro de frequência para a data e turma selecionadas.
 * Se existir, carrega os dados. Se não, prepara para novo registro.
 * @param {string} classId ID da turma.
 * @param {string} dateString Data no formato YYYY-MM-DD.
 */
async function loadFrequencyForDate(classId, dateString) {
    currentFrequencyDocId = null;
    registerFrequencyBtn.textContent = 'Registrar Frequência';

    if (!classId || !dateString) {
        // Isso deve ser prevenido pela interface
        return;
    }

    const frequencyPath = getFrequencyCollectionPath(classId);
    if (!frequencyPath) return;

    const frequencyDocRef = doc(db, frequencyPath, dateString);

    try {
        const docSnap = await getDoc(frequencyDocRef);

        const students = currentClassData.students;
        let frequencyRecords = {};
        let notes = '';

        if (docSnap.exists()) {
            // Registro encontrado! Carrega os dados.
            const data = docSnap.data();
            frequencyRecords = data.records || {};
            notes = data.notes || '';
            currentFrequencyDocId = dateString;
            registerFrequencyBtn.textContent = 'Atualizar Frequência';
            showMessage(`Registro de frequência para ${dateString} encontrado e carregado.`);
        } else {
            // Novo registro
            showMessage(`Nenhum registro encontrado para ${dateString}. Pronto para novo registro.`);
        }

        renderStudentList(students, frequencyRecords, notes);

    } catch (error) {
        console.error("Erro ao carregar frequência:", error);
        showMessage("Erro ao carregar frequência: " + error.message);
        renderStudentList(currentClassData.students, {}, ''); // Renderiza lista vazia em caso de erro
    }
}

/**
 * Salva o registro de frequência e observações.
 */
async function registerFrequency() {
    if (!currentClassId || !dateInputEl.value) {
        showMessage("Por favor, selecione uma turma e uma data.");
        return;
    }

    const dateString = dateInputEl.value;
    const frequencyPath = getFrequencyCollectionPath(currentClassId);
    if (!frequencyPath) return;

    // 1. Coleta os dados dos alunos
    const records = {};
    const studentItems = studentsListEl.querySelectorAll('.student-item');
    studentItems.forEach(item => {
        const name = item.dataset.studentName;
        const presenceCheckbox = item.querySelector('.presence-checkbox');
        const notesTextarea = item.querySelector('.notes-textarea');

        records[name] = {
            present: presenceCheckbox.checked,
            notes: notesTextarea.value.trim()
        };
    });

    // 2. Coleta a observação geral da turma
    const generalNotesEl = document.getElementById('generalNotes');
    const generalNotes = generalNotesEl ? generalNotesEl.value.trim() : '';

    const frequencyData = {
        classId: currentClassId,
        date: dateString,
        records: records,
        notes: generalNotes,
        updatedAt: new Date().toISOString()
    };

    try {
        const frequencyDocRef = doc(db, frequencyPath, dateString);
        await setDoc(frequencyDocRef, frequencyData);

        currentFrequencyDocId = dateString;
        registerFrequencyBtn.textContent = 'Atualizar Frequência';
        showMessage(`Frequência registrada/atualizada para ${currentClassData.name} em ${dateString} com sucesso!`);

    } catch (error) {
        console.error("Erro ao registrar frequência:", error);
        showMessage("Erro ao registrar frequência: " + error.message);
    }
}

// --- FUNÇÕES DE RENDERIZAÇÃO E UI ---

/**
 * Atualiza os elementos <select> (Turmas e Relatórios) com a lista de turmas.
 */
function updateClassSelects() {
    // 1. Limpa e atualiza o Select Principal
    classesSelectEl.innerHTML = '<option value="" disabled selected>-- Selecione uma Turma --</option>';
    
    // 2. Limpa e atualiza o Select de Relatório
    reportClassSelectEl.innerHTML = '<option value="" disabled selected>-- Selecione uma Turma para Relatório --</option>';

    currentClasses.forEach(classData => {
        const optionMain = document.createElement('option');
        optionMain.value = classData.id;
        optionMain.textContent = classData.name;
        classesSelectEl.appendChild(optionMain);
        
        const optionReport = document.createElement('option');
        optionReport.value = classData.id;
        optionReport.textContent = classData.name;
        reportClassSelectEl.appendChild(optionReport);
    });

    // Tenta manter a seleção após o refresh (se o ID da turma ainda existir)
    if (currentClassId && currentClasses.some(c => c.id === currentClassId)) {
        classesSelectEl.value = currentClassId;
    } else {
        // Se a turma selecionada foi excluída ou não existe, limpa o estado
        currentClassId = null;
        currentClassData = null;
        clearStudentList();
    }
    
    // Dispara a mudança de turma principal se o ID ainda estiver setado
    if (currentClassId) {
        handleClassSelection(currentClassId);
    }
}

/**
 * Limpa o conteúdo da lista de alunos.
 */
function clearStudentList() {
    studentsListEl.innerHTML = `
        <div class="text-center p-4 text-gray-500">
            Selecione uma turma e uma data.
        </div>
    `;
    // Esconde o botão de edição
    editClassBtn.classList.add('hidden');
}

/**
 * Renderiza a lista de alunos com base nos dados da turma e registros de frequência.
 * @param {string[]} students Array de nomes de alunos.
 * @param {Object} records Registros de presença e notas.
 * @param {string} generalNotes Observações gerais.
 */
function renderStudentList(students, records, generalNotes) {
    studentsListEl.innerHTML = ''; // Limpa a lista
    
    // 1. Renderiza a observação geral da turma
    const generalNotesHtml = `
        <div class="mb-6 p-4 bg-yellow-100 border border-yellow-300 rounded-xl shadow-inner">
            <label for="generalNotes" class="block text-sm font-semibold text-gray-700 mb-2">Observação Geral da Aula:</label>
            <textarea id="generalNotes" rows="2" class="w-full p-2 border border-gray-300 rounded-lg focus:ring-secondary focus:border-secondary">${generalNotes || ''}</textarea>
        </div>
    `;
    studentsListEl.innerHTML += generalNotesHtml;

    // 2. Renderiza a lista de alunos
    const listHtml = students.map((name, index) => {
        const record = records[name] || { present: true, notes: '' };
        const isPresent = record.present;
        const notes = record.notes || '';
        const indexDisplay = index + 1;
        const studentRowClasses = isPresent ? 'bg-white' : 'bg-red-50';
        
        // Tailwind Switch Styling
        const switchBgColor = isPresent ? 'bg-primary' : 'bg-gray-200';
        const switchTranslate = isPresent ? 'translate-x-6' : 'translate-x-1';

        return `
            <li data-student-name="${name}" class="student-item ${studentRowClasses} p-4 rounded-xl shadow-md transition-colors duration-300 mb-4 border border-gray-200">
                <div class="flex flex-col md:flex-row md:items-center justify-between mb-3">
                    <span class="text-lg font-medium text-gray-900 truncate pr-4">
                        ${indexDisplay}. ${name}
                    </span>
                    
                    <!-- Switch de Presença -->
                    <label class="flex items-center cursor-pointer">
                        <span class="mr-3 text-sm font-medium text-gray-900">${isPresent ? 'Presente' : 'Ausente'}</span>
                        <div class="relative">
                            <input type="checkbox" data-student-name="${name}" 
                                class="sr-only presence-checkbox" ${isPresent ? 'checked' : ''} onchange="handlePresenceChange('${name}', this)">
                            <div class="block ${switchBgColor} w-14 h-8 rounded-full transition duration-300 ease-in-out border-2 border-transparent" id="switch-bg-${name}"></div>
                            <div class="dot absolute left-0.5 top-0.5 bg-white w-7 h-7 rounded-full shadow-lg transform ${switchTranslate} transition duration-300 ease-in-out"></div>
                        </div>
                    </label>
                </div>
                
                <!-- Campo de Observação Individual -->
                <div class="mt-2">
                    <label for="notes-${name}" class="block text-xs font-medium text-gray-500 mb-1">Observação Individual:</label>
                    <textarea id="notes-${name}" rows="1" class="notes-textarea w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-secondary focus:border-secondary">${notes}</textarea>
                </div>
            </li>
        `;
    }).join('');

    studentsListEl.innerHTML += `<ul class="space-y-4">${listHtml}</ul>`;
    
    // Mostra o botão de edição
    editClassBtn.classList.remove('hidden');
}

/**
 * Lida com a mudança de estado do switch de presença de um aluno.
 * @param {string} studentName Nome do aluno.
 * @param {HTMLInputElement} checkbox O elemento checkbox.
 */
window.handlePresenceChange = function(studentName, checkbox) {
    const studentItem = checkbox.closest('.student-item');
    const isPresent = checkbox.checked;
    const switchBg = document.getElementById(`switch-bg-${studentName}`);
    const switchDot = checkbox.nextElementSibling.nextElementSibling;

    // Atualiza a cor de fundo da linha
    if (isPresent) {
        studentItem.classList.remove('bg-red-50');
        studentItem.classList.add('bg-white');
        checkbox.previousElementSibling.textContent = 'Presente';
        
        switchBg.classList.remove('bg-gray-200');
        switchBg.classList.add('bg-primary');
        switchDot.classList.add('translate-x-6');
        switchDot.classList.remove('translate-x-1');
    } else {
        studentItem.classList.remove('bg-white');
        studentItem.classList.add('bg-red-50');
        checkbox.previousElementSibling.textContent = 'Ausente';
        
        switchBg.classList.remove('bg-primary');
        switchBg.classList.add('bg-gray-200');
        switchDot.classList.remove('translate-x-6');
        switchDot.classList.add('translate-x-1');
    }
}

// --- FUNÇÕES DE CONTROLE DE FLUXO ---

/**
 * Lida com a seleção de uma nova turma no select principal.
 * @param {string} classId ID da turma selecionada.
 */
function handleClassSelection(classId) {
    if (!classId) return;

    const selectedClass = currentClasses.find(c => c.id === classId);
    if (!selectedClass) {
        currentClassId = null;
        currentClassData = null;
        clearStudentList();
        return;
    }

    currentClassId = classId;
    currentClassData = selectedClass;

    // Tenta carregar os dados se a data já estiver preenchida
    if (dateInputEl.value) {
        loadFrequencyForDate(currentClassId, dateInputEl.value);
    } else {
        // Se a data não estiver preenchida, apenas mostra a turma sem registros
        renderStudentList(currentClassData.students, {}, '');
    }
}

/**
 * Lida com a mudança de data.
 * @param {string} dateString Data no formato YYYY-MM-DD.
 */
function handleDateChange(dateString) {
    if (!currentClassId) {
        showMessage("Por favor, selecione uma turma antes de escolher a data.");
        dateInputEl.value = ''; // Limpa a data se não houver turma
        return;
    }

    if (dateString) {
        loadFrequencyForDate(currentClassId, dateString);
    } else {
        // Se a data for limpa (não deve acontecer com input type="date"), limpa a lista
        renderStudentList(currentClassData.students, {}, '');
    }
}

/**
 * Alterna entre a tela principal e a tela de relatório.
 * @param {string} screenId 'main' ou 'report'.
 */
function switchScreen(screenId) {
    if (screenId === 'main') {
        mainScreenEl.classList.remove('hidden');
        reportScreenEl.classList.add('hidden');
        viewReportBtn.classList.remove('hidden');
        backToMainBtn.classList.add('hidden');
    } else if (screenId === 'report') {
        mainScreenEl.classList.add('hidden');
        reportScreenEl.classList.remove('hidden');
        viewReportBtn.classList.add('hidden');
        backToMainBtn.classList.remove('hidden');
        reportContentEl.innerHTML = '<p class="text-center text-gray-500">Selecione uma turma para gerar o relatório.</p>';
    }
}

// --- FUNÇÕES DE RELATÓRIO ---

/**
 * Gera e exibe o relatório de frequência para a turma selecionada.
 */
async function generateReport() {
    const classId = reportClassSelectEl.value;
    if (!classId) {
        reportContentEl.innerHTML = '<p class="text-center text-red-500">Por favor, selecione uma turma.</p>';
        return;
    }

    const classData = currentClasses.find(c => c.id === classId);
    if (!classData) return;

    reportContentEl.innerHTML = '<p class="text-center text-primary font-medium">Carregando dados de frequência...</p>';

    const frequencyPath = getFrequencyCollectionPath(classId);
    if (!frequencyPath) return;

    try {
        const q = query(collection(db, frequencyPath));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            reportContentEl.innerHTML = `<h3 class="text-xl font-semibold mb-4 text-primary">Relatório da Turma: ${classData.name}</h3><p class="text-center text-gray-500">Nenhum registro de frequência encontrado para esta turma.</p>`;
            return;
        }

        const reportData = processReportData(classData.students, snapshot.docs);
        renderReport(classData.name, reportData);

    } catch (error) {
        console.error("Erro ao gerar relatório:", error);
        reportContentEl.innerHTML = `<p class="text-center text-red-600">Erro ao gerar relatório: ${error.message}</p>`;
    }
}

/**
 * Processa os documentos de frequência em um formato de relatório.
 * @param {string[]} students Nomes dos alunos.
 * @param {import("firebase/firestore").QueryDocumentSnapshot[]} docs Documentos de frequência.
 * @returns {Object} Dados processados do relatório.
 */
function processReportData(students, docs) {
    const totalClasses = docs.length;
    const studentSummary = {}; // { 'Aluno A': { totalPresent: 5, totalAbsent: 2, notes: [...] } }
    const classDates = [];

    // Inicializa o sumário
    students.forEach(name => {
        studentSummary[name] = { totalPresent: 0, totalAbsent: 0, notes: [] };
    });

    // Processa cada registro de frequência (dia)
    docs.forEach(doc => {
        const data = doc.data();
        const date = data.date;
        classDates.push(date);

        const records = data.records || {};
        
        // Atualiza o sumário de cada aluno
        students.forEach(name => {
            const record = records[name];
            if (record) {
                if (record.present) {
                    studentSummary[name].totalPresent++;
                } else {
                    studentSummary[name].totalAbsent++;
                }
                if (record.notes) {
                    studentSummary[name].notes.push({ date: date, note: record.notes });
                }
            } else {
                // Se o aluno estava na turma mas não no registro daquele dia (improvável se o setup for correto)
                studentSummary[name].totalAbsent++; 
            }
        });
    });

    return {
        students,
        totalClasses,
        classDates: classDates.sort(),
        studentSummary,
    };
}

/**
 * Renderiza o HTML do relatório.
 * @param {string} className Nome da turma.
 * @param {Object} reportData Dados processados.
 */
function renderReport(className, reportData) {
    const { students, totalClasses, studentSummary } = reportData;

    let html = `
        <h3 class="text-2xl font-bold text-primary mb-4 border-b pb-2">Relatório Consolidado: ${className}</h3>
        <p class="text-sm text-gray-600 mb-6">Total de Aulas Registradas: <span class="font-bold text-secondary">${totalClasses}</span></p>

        <!-- Tabela de Resumo de Frequência -->
        <div class="overflow-x-auto shadow-lg rounded-xl mb-8">
            <table class="min-w-full bg-white border-collapse">
                <thead class="bg-primary text-white">
                    <tr>
                        <th class="p-3 text-left">Aluno</th>
                        <th class="p-3 text-center">Presenças</th>
                        <th class="p-3 text-center">Faltas</th>
                        <th class="p-3 text-center">% Presença</th>
                    </tr>
                </thead>
                <tbody>
    `;

    // 1. Linhas da tabela
    students.forEach(name => {
        const summary = studentSummary[name];
        const percent = totalClasses > 0 ? ((summary.totalPresent / totalClasses) * 100).toFixed(1) : 0;
        const rowColor = summary.totalAbsent > 0 ? 'bg-red-50 hover:bg-red-100' : 'bg-white hover:bg-gray-50';
        const percentColor = parseFloat(percent) < 75 ? 'text-red-600 font-bold' : 'text-green-600 font-bold';

        html += `
            <tr class="border-b border-gray-200 ${rowColor}">
                <td class="p-3 font-medium">${name}</td>
                <td class="p-3 text-center">${summary.totalPresent}</td>
                <td class="p-3 text-center">${summary.totalAbsent}</td>
                <td class="p-3 text-center ${percentColor}">${percent}%</td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
        
        <!-- Observações Detalhadas -->
        <h4 class="text-xl font-bold text-secondary mb-4">Observações por Aluno</h4>
        <div class="space-y-6">
    `;

    // 2. Observações Detalhadas
    students.forEach(name => {
        const summary = studentSummary[name];
        if (summary.notes.length > 0) {
            html += `
                <div class="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <p class="font-semibold text-gray-800 mb-2">${name} (${summary.notes.length} Observação${summary.notes.length > 1 ? 's' : ''}):</p>
                    <ul class="list-disc list-inside space-y-1 ml-4 text-sm text-gray-700">
                        ${summary.notes.map(note => 
                            `<li><span class="font-medium text-gray-500">${note.date}:</span> ${note.note}</li>`
                        ).join('')}
                    </ul>
                </div>
            `;
        }
    });

    html += `</div>`;
    reportContentEl.innerHTML = html;
}

// --- CONFIGURAÇÃO DE EVENTOS ---

closeMessageBtn.addEventListener('click', closeMessage);

// Eventos do Modal de Turma
newClassBtn.addEventListener('click', () => showClassModal(false));
editClassBtn.addEventListener('click', () => {
    if (currentClassData) {
        showClassModal(true, currentClassData);
    } else {
        showMessage("Por favor, selecione uma turma para editar.");
    }
});
cancelAddClassBtn.addEventListener('click', hideClassModal);
saveClassBtn.addEventListener('click', saveClass);
deleteClassBtn.addEventListener('click', deleteClass);

// Eventos da Tela Principal
classesSelectEl.addEventListener('change', (e) => handleClassSelection(e.target.value));
dateInputEl.addEventListener('change', (e) => handleDateChange(e.target.value));
registerFrequencyBtn.addEventListener('click', registerFrequency);

// Eventos do Menu
viewReportBtn.addEventListener('click', () => switchScreen('report'));
backToMainBtn.addEventListener('click', () => switchScreen('main'));

// Eventos da Tela de Relatório
reportClassSelectEl.addEventListener('change', generateReport);


// --- INICIALIZAÇÃO DA APLICAÇÃO ---

/**
 * Inicializa o Firebase, autentica o usuário e inicia o carregamento dos dados.
 */
async function initializeAppAndAuth() {
    // 1. Configuração de Fallback (para garantir a execução fora do Canvas)
    if (Object.keys(firebaseConfig).length === 0) {
        firebaseConfig = {
            // Este é um config de fallback que DEVE ser substituído pelo ambiente
            apiKey: "DUMMY_API_KEY",
            authDomain: "DUMMY_DOMAIN",
            projectId: "DUMMY_PROJECT",
        };
        console.warn("Usando configuração de Firebase de fallback. As funcionalidades não persistirão sem a configuração real do Canvas.");
    }

    try {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);

        // 2. Autenticação (usa token personalizado ou anônima)
        if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken);
        } else {
            await signInAnonymously(auth);
        }

        // 3. Listener de estado de autenticação
        onAuthStateChanged(auth, (user) => {
            if (user) {
                userId = user.uid;
                userIdDisplayEl.textContent = `Usuário ID: ${userId}`;

                // Esconde o loading e mostra o conteúdo principal
                loadingEl.classList.add('hidden');
                appContentEl.classList.remove('hidden');

                // Inicia o listener de turmas após a autenticação
                setupClassesListener();
            } else {
                // Lógica caso a autenticação falhe ou o usuário se deslogue
                userIdDisplayEl.textContent = `Usuário: Desconectado`;
                loadingEl.innerHTML = `<span class="text-red-600">Erro de autenticação ou usuário deslogado. Tente recarregar a página.</span>`;
                loadingEl.classList.remove('hidden');
                appContentEl.classList.add('hidden');
            }
        });

    } catch (error) {
        console.error("Erro durante a inicialização:", error);
        loadingEl.innerHTML = `<span class="text-red-600">Erro de Inicialização: ${error.message}. Verifique a configuração do Firebase.</span>`;
    }
}

// Inicia a aplicação
initializeAppAndAuth();
