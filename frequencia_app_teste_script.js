// Importações do Firebase SDK v11 (JavaScript)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, collection, query, onSnapshot, addDoc, getDoc, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// ========================================
// CONFIGURAÇÃO FIREBASE (SUAS CREDENCIAIS)
// ========================================
const firebaseConfig = {
    apiKey: "AIzaSyDo6uA_fJGbKqLfj9kwUu1JSkC34HGlWk0",
    authDomain: "registrar-frenquencia.firebaseapp.com",
    projectId: "registrar-frenquencia",
    storageBucket: "registrar-frenquencia.firebasestorage.app",
    messagingSenderId: "571143130821",
    appId: "1:571143130821:web:812eb820306f6b0338eaac"
};

// --- VARIÁVEIS GLOBAIS FIREBASE E ESTADO DA APLICAÇÃO ---
let app;
let db;
let auth;
let userId = null;
let currentClasses = [];
let currentClassId = null;
let currentClassData = null;
let currentFrequencyDocId = null;
let selectedReportPeriod = 'Semanal'; // Padrão: Semanal

// --- ELEMENTOS DO DOM (Ajustados ao HTML) ---
const loadingEl = document.getElementById('loadingIndicator');
// appContentEl não existe no HTML, o conteúdo está dentro de .container-app
const userIdDisplayEl = document.getElementById('userIdDisplay');
const logoImg = document.getElementById('logoImg');
const logoUploadInput = document.getElementById('logoUpload');

// Elementos do Menu Inicial
const menuInicialEl = document.getElementById('menuInicial');
const classesSelectEl = document.getElementById('classesSelectMenu'); // ID atualizado
const openAddClassBtn = document.getElementById('openAddClassBtnMenu'); // ID atualizado
const openEditClassBtn = document.getElementById('openEditClassBtnMenu'); // ID atualizado
const openDeleteClassQuickBtn = document.getElementById('deleteClassQuickBtnMenu'); // ID atualizado
const btnPreencherPresenca = document.getElementById('btnPreencherPresenca');
const btnGerarRelatorio = document.getElementById('btnGerarRelatorio');

// Elementos da Tela de Presença
const telaPresencaEl = document.getElementById('telaPresenca');
const btnVoltarMenuPresenca = document.getElementById('btnVoltarMenu');
const studentsListContainerEl = document.getElementById('studentsListContainer');
const dateInputEl = document.getElementById('dateInput');
const dateDisplayEl = document.getElementById('dateDisplay');
const currentClassTitleEl = document.getElementById('currentClassTitle');
const saveAttendanceBtn = document.getElementById('saveAttendanceBtn');
const exportCSVBtn = document.getElementById('exportCSVBtn');

// Elementos da Tela de Relatório
const telaRelatorioEl = document.getElementById('telaRelatorio');
const btnVoltarMenuRelatorio = document.getElementById('btnVoltarMenuRelatorio');
const btnPeriodoSemanal = document.getElementById('btnPeriodoSemanal');
const btnPeriodoMensal = document.getElementById('btnPeriodoMensal');
const periodoSemanalConfig = document.getElementById('periodoSemanalConfig');
const periodoMensalConfig = document.getElementById('periodoMensalConfig');
const semanaInputEl = document.getElementById('semanaInput');
const semanaDisplayEl = document.getElementById('semanaDisplay'); // NOVO: Elemento para mostrar o intervalo da semana formatado
const mesInputEl = document.getElementById('mesInput');
const btnGerarRelatorioFinal = document.getElementById('btnGerarRelatorioFinal');
const relatorioResultadoEl = document.getElementById('relatorioResultado');
const exportRelatorioBtn = document.getElementById('exportRelatorioBtn');
const relatorioConteudoEl = document.getElementById('relatorioConteudo');


// Elementos do Modal e Toast
const messageToast = document.getElementById('messageToast');
const messageTextEl = document.getElementById('messageText');
const closeMessageBtn = document.getElementById('closeMessageBtn');
const addClassModal = document.getElementById('addClassModal');
const modalTitleEl = document.getElementById('modalTitle');
const classNameInputEl = document.getElementById('classNameInput');
const studentListInputEl = document.getElementById('studentListInput');
const studentListFileEl = document.getElementById('studentListFile');
const cancelAddClassBtn = document.getElementById('cancelAddClassBtn');
const saveClassBtn = document.getElementById('saveClassBtn');
const deleteClassBtn = document.getElementById('deleteClassBtn');


// --- UTILIDADES ---

// Funções de manipulação e cálculo de datas para o relatório semanal (ISO 8601)

/**
 * Helper function to get the ISO week (YYYY-Www) of a date.
 */
function getISOWeek(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

/**
 * Calculates the start and end date (Monday to Sunday) for a given ISO week string (YYYY-Www).
 * Returns { startDate: 'YYYY-MM-DD', endDate: 'YYYY-MM-DD', display: 'DD a DD MÊS YYYY, semana WW' }
 */
function getDateRangeOfWeek(isoWeekString) {
    if (!isoWeekString || !isoWeekString.match(/^\d{4}-W\d{2}$/)) {
        return { startDate: null, endDate: null, display: 'Selecione uma semana válida' };
    }

    const [yearStr, weekStr] = isoWeekString.split('-W');
    const year = parseInt(yearStr, 10);
    const week = parseInt(weekStr, 10);

    // 1. Get the date of January 4th of the given year (which is always in week 1)
    const jan4 = new Date(year, 0, 4);

    // 2. Get the day of the week for Jan 4th (0 = Sunday, 1 = Monday, ..., 6 = Saturday).
    // ISO standard: Monday is day 1. JS: Sunday is day 0.
    let jan4Day = jan4.getDay(); // 0 to 6
    let jan4ISOday = jan4Day === 0 ? 7 : jan4Day; // Convert JS day (0-6, Sun-Sat) to ISO day (1-7, Mon-Sun)

    // 3. Calculate the date of the Monday of the first week of the year
    const firstMonday = new Date(jan4);
    firstMonday.setDate(jan4.getDate() + 1 - jan4ISOday);

    // 4. Calculate the start date (Monday) of the target week
    const targetMonday = new Date(firstMonday);
    targetMonday.setDate(firstMonday.getDate() + (week - 1) * 7);

    // 5. Calculate the end date (Sunday) of the target week
    const targetSunday = new Date(targetMonday);
    targetSunday.setDate(targetMonday.getDate() + 6);

    // Helper to format date as YYYY-MM-DD
    const formatISODate = (date) => date.toISOString().split('T')[0];

    // Helper to format date as DD
    const formatDay = (date) => date.getDate().toString().padStart(2, '0');

    // Helper to format month name
    const monthNames = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
    const formatMonth = (date) => monthNames[date.getMonth()];

    // Generate the desired display format
    const startDay = formatDay(targetMonday);
    const endDay = formatDay(targetSunday);
    const startMonthName = formatMonth(targetMonday);
    const endMonthName = formatMonth(targetSunday);
    const displayYear = targetSunday.getFullYear();
    const displayWeek = week.toString().padStart(2, '0');

    let displayString;

    // Verifica se a semana termina em um mês diferente do que começou
    if (targetMonday.getMonth() === targetSunday.getMonth()) {
        displayString = `${startDay} a ${endDay} ${startMonthName} ${displayYear}, semana ${displayWeek}`;
    } else {
        displayString = `${startDay} ${startMonthName} a ${endDay} ${endMonthName} ${displayYear}, semana ${displayWeek}`;
    }


    return {
        startDate: formatISODate(targetMonday), // YYYY-MM-DD
        endDate: formatISODate(targetSunday),   // YYYY-MM-DD
        display: displayString
    };
}

/**
 * Atualiza o elemento semanaDisplayEl com o intervalo de datas formatado.
 */
function updateWeekDisplay() {
    const isoWeekValue = semanaInputEl.value;
    const weekRange = getDateRangeOfWeek(isoWeekValue);

    if (semanaDisplayEl) {
        semanaDisplayEl.textContent = weekRange.display;
    }
}
// --- FIM - Funções de manipulação de datas

function showMessage(message, type = 'success') {
// ... (código showMessage mantido)
    messageTextEl.textContent = message;
    messageToast.classList.remove('bg-green-500', 'bg-red-500', 'bg-blue-500');
    if (type === 'error') {
        messageToast.classList.add('bg-red-500');
    } else if (type === 'info') {
        messageToast.classList.add('bg-blue-500');
    } else {
        messageToast.classList.add('bg-green-500');
    }
    messageToast.classList.remove('hidden');
    messageToast.classList.add('flex');
    messageToast.classList.remove('opacity-0');
    messageToast.classList.add('opacity-100');
    setTimeout(() => {
        closeMessage();
    }, 4000);
}

function closeMessage() {
// ... (código closeMessage mantido)
    messageToast.classList.add('opacity-0');
    setTimeout(() => {
        messageToast.classList.add('hidden');
        messageToast.classList.remove('flex');
    }, 300);
}

function handleLogoUpload(event) {
// ... (código handleLogoUpload mantido)
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        logoImg.src = e.target.result;
        try {
            localStorage.setItem('customLogo', e.target.result);
            showMessage('Logo atualizada!', 'info');
        } catch (err) {
            console.warn('Não foi possível salvar logo:', err);
        }
    };
    reader.readAsDataURL(file);
}

function loadSavedLogo() {
// ... (código loadSavedLogo mantido)
    try {
        const savedLogo = localStorage.getItem('customLogo');
        if (savedLogo) {
            logoImg.src = savedLogo;
        }
    } catch (err) {
        console.warn('Não foi possível carregar logo salva:', err);
    }
}

function showClassModal(isEditing = false, classData = null) {
// ... (código showClassModal mantido)
    if (isEditing && classData) {
        modalTitleEl.textContent = `Editar: ${classData.name}`;
        classNameInputEl.value = classData.name || '';
        studentListInputEl.value = (classData.students || []).join('\n');
        deleteClassBtn.classList.remove('hidden');
        // Ao editar, currentClassId já deve estar definido pela seleção no menu
    } else {
        modalTitleEl.textContent = 'Adicionar Nova Turma';
        classNameInputEl.value = '';
        studentListInputEl.value = '';
        deleteClassBtn.classList.add('hidden');
    }
    studentListFileEl.value = '';
    addClassModal.classList.remove('hidden');
    addClassModal.classList.add('flex');
}

/**
 * Funcao alterada para garantir que a seleção da turma seja mantida/restaurada após fechar o modal.
 */
function hideClassModal() {
// ... (código hideClassModal mantido)
    addClassModal.classList.add('hidden');
    addClassModal.classList.remove('flex');

    // Limpa os campos do modal
    classNameInputEl.value = '';
    studentListInputEl.value = '';
    studentListFileEl.value = '';

    // Força o re-carregamento da turma atualmente selecionada no <select>
    handleClassSelection(classesSelectEl.value);
}

function handleStudentListFile(event) {
// ... (código handleStudentListFile mantido)
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const fileContent = e.target.result;
        const names = fileContent.split(/\r?\n/)
            .map(name => name.trim())
            .filter(name => name.length > 0);
        studentListInputEl.value = names.join('\n');
        if (!classNameInputEl.value.trim()) {
            const fileName = file.name.replace(/\.txt$/i, '');
            classNameInputEl.value = fileName;
        }
        showMessage(`${names.length} alunos carregados do arquivo`, 'info');
    };
    reader.readAsText(file);
}

// --- FIREBASE / FIRESTORE (Manter a lógica original) ---

function getClassCollectionPath() {
// ... (código getClassCollectionPath mantido)
    if (!userId) {
        console.error("UserID não definido.");
        return null;
    }
    return `users/${userId}/classes`;
}

function getFrequencyCollectionPath(classId) {
// ... (código getFrequencyCollectionPath mantido)
    if (!classId) {
        console.error("Class ID não definido para frequência.");
        return null;
    }
    return `${getClassCollectionPath()}/${classId}/frequency_records`;
}

function setupClassesListener() {
// ... (código setupClassesListener mantido)
    const classesPath = getClassCollectionPath();
    if (!classesPath) return;
    const classesCollectionRef = collection(db, classesPath);
    const q = query(classesCollectionRef);
    onSnapshot(q, (snapshot) => {
        currentClasses = [];
        snapshot.forEach((doc) => {
            currentClasses.push({ id: doc.id, ...doc.data() });
        });
        updateClassSelects();
    }, (error) => {
        console.error("Erro ao ouvir a coleção de Turmas:", error);
        showMessage("Erro ao carregar turmas: " + error.message, 'error');
    });
}

async function saveClass() {
// ... (código saveClass mantido)
    const className = classNameInputEl.value.trim();
    const studentList = studentListInputEl.value.trim();
    if (!className || !studentList) {
        showMessage("Preencha o nome da turma e a lista de alunos.", 'error');
        return;
    }
    const students = studentList.split('\n')
        .map(name => name.trim())
        .filter(name => name.length > 0);
    if (students.length === 0) {
        showMessage("A lista de alunos não pode estar vazia.", 'error');
        return;
    }
    const classesPath = getClassCollectionPath();
    if (!classesPath) return;
    try {
        // currentClassId estará definido se estiver em modo de edição
        const isEditing = !!currentClassId && currentClasses.some(c => c.id === currentClassId);

        const classData = {
            name: className,
            students: students,
            createdAt: isEditing && currentClassData ? currentClassData.createdAt : new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        const classIdToSave = isEditing ? currentClassId : null;

        if (classIdToSave) {
            const classDocRef = doc(db, classesPath, classIdToSave);
            await setDoc(classDocRef, classData);
            showMessage(`Turma "${className}" atualizada!`);
            // Não precisa atualizar currentClassId aqui, ele já está correto
        } else {
            const newDocRef = await addDoc(collection(db, classesPath), classData);
            showMessage(`Turma "${className}" adicionada!`);
            // Se for uma nova turma, define o ID atual para a recém-criada, assim ela é selecionada
            currentClassId = newDocRef.id;
            classesSelectEl.value = newDocRef.id;
        }
        hideClassModal();
    } catch (error) {
        console.error("Erro ao salvar turma:", error);
        showMessage("Erro ao salvar turma: " + error.message, 'error');
    }
}

async function deleteClass() {
    if (!currentClassId || !currentClassData) return;
    // 1. Pega o nome da turma e converte para MAIÚSCULAS para dar ênfase
    const className = currentClassData.name.toUpperCase();
    
    // 2. Monta a mensagem usando Maiúsculas e Símbolos
    if (!window.confirm(`\n⚠️ EXCLUIR TURMA: "${className}"\n\nConfirma a exclusão desta turma e de todos os seus registros de frequência? ESTA AÇÃO É IRREVERSÍVEL!`)) {
        return;
    }
    const classesPath = getClassCollectionPath();
    if (!classesPath) return;
    try {
        const frequencyPath = getFrequencyCollectionPath(currentClassId);
        const q = query(collection(db, frequencyPath));
        const snapshot = await getDocs(q);

        const deletePromises = snapshot.docs.map(docToDelete =>
            deleteDoc(doc(db, frequencyPath, docToDelete.id))
        );
        await Promise.all(deletePromises);

        const classDocRef = doc(db, classesPath, currentClassId);
        await deleteDoc(classDocRef);

        showMessage(`Turma excluída com sucesso!`);

        // Limpa o estado global, o select será atualizado pelo listener do Firestore
        currentClassId = null;
        currentClassData = null;

        hideClassModal(); // Vai chamar handleClassSelection("") e limpar a UI
    } catch (error) {
        console.error("Erro ao excluir turma:", error);
        showMessage("Erro ao excluir turma: " + error.message, 'error');
    }
}

async function loadFrequencyForDate(classId, dateString) {
// ... (código loadFrequencyForDate mantido)
    currentFrequencyDocId = null;
    saveAttendanceBtn.textContent = 'Salvar Frequência';
    saveAttendanceBtn.disabled = false;
    exportCSVBtn.disabled = false;

    if (!classId || !dateString) {
        exportCSVBtn.disabled = true;
        return;
    }

    const frequencyPath = getFrequencyCollectionPath(classId);
    if (!frequencyPath) return;
    const frequencyDocRef = doc(db, frequencyPath, dateString);
    try {
        const docSnap = await getDoc(frequencyDocRef);
        const students = currentClassData.students;
        let frequencyRecords = {};
        if (docSnap.exists()) {
            const data = docSnap.data();
            frequencyRecords = data.records || {};
            currentFrequencyDocId = dateString;
            saveAttendanceBtn.textContent = 'Atualizar Frequência';
            showMessage(`Registro de ${dateString} carregado`, 'info');
        } else {
            showMessage(`Novo registro para ${dateString}`, 'info');
        }
        renderStudentList(students, frequencyRecords);
    } catch (error) {
        console.error("Erro ao carregar frequência:", error);
        showMessage("Erro ao carregar frequência: " + error.message, 'error');
        renderStudentList(currentClassData.students, {});
    }
}

/**
 * Salva o registro de frequência incluindo critérios opcionais.
 */
async function registerFrequency() {
// ... (código registerFrequency mantido)
    if (!currentClassId || !dateInputEl.value) {
        showMessage("Selecione uma turma e uma data.", 'error');
        return;
    }

    const dateString = dateInputEl.value;
    const frequencyPath = getFrequencyCollectionPath(currentClassId);
    if (!frequencyPath) return;

    const records = {};
    const studentItems = studentsListContainerEl.querySelectorAll('.student-item');

    studentItems.forEach(item => {
        const name = item.dataset.studentName;
        const presenceCheckbox = item.querySelector('.presence-checkbox');
        // Novos critérios opcionais
        const pontualidade = item.querySelector('.pontualidade-select')?.value || "não observado";
        const harmonia = item.querySelector('.harmonia-select')?.value || "não observado";
        const participacao = item.querySelector('.participacao-select')?.value || "não observado";

        records[name] = {
            present: presenceCheckbox.checked,
            // Usa os valores padronizados na leitura do DOM.
            pontualidade: pontualidade === "" ? "não observado" : pontualidade, // Garante que o valor salvo seja "não observado" se o select estiver vazio
            harmonia: harmonia === "" ? "não observado" : harmonia,
            participacao: participacao === "" ? "não observado" : participacao
        };
    });

    const frequencyData = {
        classId: currentClassId,
        date: dateString,
        records: records,
        updatedAt: new Date().toISOString()
    };

    try {
        const frequencyDocRef = doc(db, frequencyPath, dateString);
        await setDoc(frequencyDocRef, frequencyData);

        currentFrequencyDocId = dateString;
        saveAttendanceBtn.textContent = 'Atualizar Frequência';
        showMessage(`Frequência salva para ${dateString}!`);

    } catch (error) {
        console.error("Erro ao registrar frequência:", error);
        showMessage("Erro ao salvar: " + error.message, 'error');
    }
}

// --- RENDERIZAÇÃO E UI ---

/**
 * Controla a exibição das telas principais (Menu, Presença, Relatório).
 */
function navigateTo(screenId) {
// ... (código navigateTo mantido)
    menuInicialEl.classList.add('hidden');
    telaPresencaEl.classList.add('hidden');
    telaRelatorioEl.classList.add('hidden');

    if (screenId === 'menu') {
        menuInicialEl.classList.remove('hidden');
    } else if (screenId === 'presenca') {
        telaPresencaEl.classList.remove('hidden');
        // Se já tiver turma e data, carrega
        if (currentClassId && dateInputEl.value) {
             loadFrequencyForDate(currentClassId, dateInputEl.value);
        } else if (currentClassId) {
            renderStudentList(currentClassData.students, {}); // Renderiza sem dados de frequência
        } else {
            clearStudentList(); // Sem turma, limpa tudo.
        }
    } else if (screenId === 'relatorio') {
        telaRelatorioEl.classList.remove('hidden');
        // Reseta o resultado do relatório ao entrar na tela
        relatorioResultadoEl.classList.add('hidden');
        relatorioConteudoEl.innerHTML = 'Preencha as configurações e clique em Gerar Relatório.';
        // Garante que o display da semana esteja correto ao entrar na tela
        updateWeekDisplay();
    }
}

function updateClassSelects() {
// ... (código updateClassSelects mantido)
    // Tenta preservar a seleção atual
    const previouslySelectedClassId = classesSelectEl.value;

    classesSelectEl.innerHTML = '<option value="" disabled selected>-- Selecione uma Turma --</option>';
    currentClasses.forEach(classData => {
        const option = document.createElement('option');
        option.value = classData.id;
        option.textContent = `${classData.name} (${classData.students.length} alunos)`;
        classesSelectEl.appendChild(option);
    });

    // Lógica para re-selecionar o ID da turma após a atualização da lista
    const newSelectionId = currentClassId || previouslySelectedClassId;

    if (newSelectionId && currentClasses.some(c => c.id === newSelectionId)) {
        classesSelectEl.value = newSelectionId;
        currentClassId = newSelectionId; // Garante que o estado global esteja alinhado
        currentClassData = currentClasses.find(c => c.id === newSelectionId);
        // Garante que a UI seja re-renderizada com a turma correta
        handleClassSelection(newSelectionId);
    } else {
        // Se a turma ativa/anterior não existe mais, reseta o select e o estado.
        classesSelectEl.value = "";
        currentClassId = null;
        currentClassData = null;
        clearStudentList();
        // Desativa botões de ação do Menu
        btnPreencherPresenca.disabled = true;
        btnGerarRelatorio.disabled = true;
        openEditClassBtn.classList.add('hidden');
        openDeleteClassQuickBtn.classList.add('hidden');
    }
}

function clearStudentList() {
// ... (código clearStudentList mantido)
    studentsListContainerEl.innerHTML = `
        <p class="text-center text-gray-500 py-4">Selecione uma turma e data.</p>
    `;
    currentClassTitleEl.textContent = 'Selecione uma turma acima';
    dateDisplayEl.textContent = '';
    saveAttendanceBtn.disabled = true;
    exportCSVBtn.disabled = true;
    openEditClassBtn.classList.add('hidden');
    openDeleteClassQuickBtn.classList.add('hidden');
}

/**
 * Renderiza a lista de alunos incluindo os campos opcionais.
 */
function renderStudentList(students, records) {
// ... (código renderStudentList mantido)
    studentsListContainerEl.innerHTML = '';
    const listHtml = students.map((name, index) => {
        // A regra é: se o registro existir e 'present' for false, é Ausente. Caso contrário, é Presente.
        const record = records[name] || { present: true };
        const isPresent = record.present !== false; // Se não for explicitamente 'false', é 'true'
        const indexDisplay = index + 1;
        const studentRowClasses = isPresent ? 'bg-white' : 'bg-red-50';
        const switchBgColor = isPresent ? 'bg-primary' : 'bg-gray-200';
        const switchTranslate = isPresent ? 'translate-x-6' : 'translate-x-1';

        // Critérios opcionais: valor salvo. Mapeia 'não observado' para a string vazia "" no select.
        const pontualidadeValue = record.pontualidade && record.pontualidade !== "não observado" ? record.pontualidade : "";
        const harmoniaValue = record.harmonia && record.harmonia !== "não observado" ? record.harmonia : "";
        const participacaoValue = record.participacao && record.participacao !== "não observado" ? record.participacao : "";

        return `
            <li data-student-name="${name}" class="student-item ${studentRowClasses} p-3 rounded-lg transition-colors duration-300 border-b border-gray-100 last:border-0">
                <div class="flex items-center justify-between">
                    <span class="text-base font-medium text-gray-900 truncate pr-4">
                        ${indexDisplay}. ${name}
                    </span>
                    <label class="flex items-center cursor-pointer flex-shrink-0">
                        <span class="mr-2 text-sm font-medium text-gray-700 min-w-[60px] text-right">${isPresent ? 'Presente' : 'Ausente'}</span>
                        <div class="relative">
                            <input type="checkbox"
                                class="sr-only presence-checkbox"
                                ${isPresent ? 'checked' : ''}
                                onchange="handlePresenceChange(this)">
                            <div class="block ${switchBgColor} w-14 h-8 rounded-full transition duration-300"></div>
                            <div class="dot absolute left-0.5 top-0.5 bg-white w-7 h-7 rounded-full shadow-lg transform ${switchTranslate} transition duration-300"></div>
                        </div>
                    </label>
                </div>
                <div class="flex flex-col md:flex-row gap-2 mt-2">
                    <label class="text-xs text-gray-700 font-medium">
                        Pontualidade:
                        <select class="pontualidade-select border rounded px-1 py-0.5">
                            <option value="" ${pontualidadeValue === "" ? 'selected' : ''}>Não Observado</option>
                            <option value="pontual" ${pontualidadeValue === "pontual" ? 'selected' : ''}>Pontual</option>
                            <option value="atrasado" ${pontualidadeValue === "atrasado" ? 'selected' : ''}>Atrasado</option>
                        </select>
                    </label>
                    <label class="text-xs text-gray-700 font-medium">
                        Harmonia:
                        <select class="harmonia-select border rounded px-1 py-0.5">
                            <option value="" ${harmoniaValue === "" ? 'selected' : ''}>Não Observado</option>
                            <option value="harmonioso" ${harmoniaValue === "harmonioso" ? 'selected' : ''}>Harmonioso</option>
                            <option value="conflituoso" ${harmoniaValue === "conflituoso" ? 'selected' : ''}>Conflituoso</option>
                        </select>
                    </label>
                    <label class="text-xs text-gray-700 font-medium">
                        Participação:
                        <select class="participacao-select border rounded px-1 py-0.5">
                            <option value="" ${participacaoValue === "" ? 'selected' : ''}>Não Observado</option>
                            <option value="participativo" ${participacaoValue === "participativo" ? 'selected' : ''}>Participativo</option>
                            <option value="pouco participativo" ${participacaoValue === "pouco participativo" ? 'selected' : ''}>Pouco participativo</option>
                        </select>
                    </label>
                </div>
            </li>
        `;
    }).join('');

    studentsListContainerEl.innerHTML = `<ul class="space-y-1">${listHtml}</ul>`;
    currentClassTitleEl.textContent = currentClassData.name;
    dateDisplayEl.textContent = dateInputEl.value ? `Data: ${new Date(dateInputEl.value + 'T00:00:00').toLocaleDateString('pt-BR')}` : '';
    saveAttendanceBtn.disabled = false;
    exportCSVBtn.disabled = false;
}

window.handlePresenceChange = function(checkbox) {
// ... (código handlePresenceChange mantido)
    const studentItem = checkbox.closest('.student-item');
    const isPresent = checkbox.checked;
    const switchBg = checkbox.nextElementSibling;
    const switchDot = switchBg.nextElementSibling;
    const label = checkbox.closest('label').querySelector('span');

    if (isPresent) {
        studentItem.classList.remove('bg-red-50');
        studentItem.classList.add('bg-white');
        label.textContent = 'Presente';
        switchBg.classList.remove('bg-gray-200');
        switchBg.classList.add('bg-primary');
        switchDot.classList.add('translate-x-6');
        switchDot.classList.remove('translate-x-1');
    } else {
        studentItem.classList.remove('bg-white');
        studentItem.classList.add('bg-red-50');
        label.textContent = 'Ausente';
        switchBg.classList.remove('bg-primary');
        switchBg.classList.add('bg-gray-200');
        switchDot.classList.remove('translate-x-6');
        switchDot.classList.add('translate-x-1');
    }
}

function exportAttendanceToCSV() {
// ... (código exportAttendanceToCSV mantido)
    if (!currentClassId || !dateInputEl.value) {
        showMessage("Nenhuma frequência carregada para exportar.", 'error');
        return;
    }

    const dateString = dateInputEl.value;
    const className = currentClassData.name;
    const studentItems = studentsListContainerEl.querySelectorAll('.student-item');

    // NOVAS LINHAS: Nome da Turma e Data no topo do arquivo
    let csvContent = `Turma: ${className}\n`;
    csvContent += `Data: ${dateString}\n`;

    // 1. Cabeçalho das Colunas
    csvContent += "Nome;Presente;Pontualidade;Harmonia;Participação\n";

    // 2. Linhas de dados
    studentItems.forEach(item => {
        const name = item.dataset.studentName;
        const presenceCheckbox = item.querySelector('.presence-checkbox');
        const isPresent = presenceCheckbox.checked ? "SIM" : "NÃO";

        // Critérios
        const pontualidade = item.querySelector('.pontualidade-select')?.value || "";
        const harmonia = item.querySelector('.harmonia-select')?.value || "";
        const participacao = item.querySelector('.participacao-select')?.value || "";

        // Mapeia o valor "" para a string "Não Observado" para o CSV
        const getDisplayValue = (value) => value === "" ? "Não Observado" : value.charAt(0).toUpperCase() + value.slice(1);

        // Formato CSV com separador ';'
        const row = [
            `"${name}"`, // Envolve o nome em aspas para evitar problemas
            isPresent,
            getDisplayValue(pontualidade),
            getDisplayValue(harmonia),
            getDisplayValue(participacao)
        ].join(';');

        csvContent += row + "\n";
    });

    // 3. Criação e Download do arquivo
    const filename = `${className}_Frequencia_${dateString}.csv`;
    // Adiciona o charset utf-8 com BOM (Byte Order Mark) para garantir caracteres especiais (acentos) corretos no Excel
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    if (link.download !== undefined) { // Browser support
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showMessage(`Exportação para CSV de "${className}" concluída!`);
    } else {
        showMessage("Seu navegador não suporta download de arquivos.", 'error');
    }
}

// --- LÓGICA DE NAVEGAÇÃO E SELEÇÃO DE TURMA ---

function handleClassSelection(classId) {
// ... (código handleClassSelection mantido)
    // Se o valor for nulo ou vazio (que é o valor de "-- Selecione uma Turma --")
    if (!classId || classId === "") {
        currentClassId = null;
        currentClassData = null;
        clearStudentList(); // Limpa a lista, botões e estado

        // Desativa botões de ação do Menu
        btnPreencherPresenca.disabled = true;
        btnGerarRelatorio.disabled = true;
        openEditClassBtn.classList.add('hidden');
        openDeleteClassQuickBtn.classList.add('hidden');
        return;
    }

    const selectedClass = currentClasses.find(c => c.id === classId);
    if (!selectedClass) {
        // Isso não deve acontecer se a lista de classes foi atualizada corretamente
        currentClassId = null;
        currentClassData = null;
        clearStudentList();
        btnPreencherPresenca.disabled = true;
        btnGerarRelatorio.disabled = true;
        openEditClassBtn.classList.add('hidden');
        openDeleteClassQuickBtn.classList.add('hidden');
        return;
    }

    // Mantém a turma selecionada
    currentClassId = classId;
    currentClassData = selectedClass;

    // Ativa botões de ação do Menu
    btnPreencherPresenca.disabled = false;
    btnGerarRelatorio.disabled = false;

    // Mostra os botões de edição e exclusão rápida
    openEditClassBtn.classList.remove('hidden');
    openDeleteClassQuickBtn.classList.remove('hidden');

    // Se estiver na tela de presença, carrega os dados
    if (!telaPresencaEl.classList.contains('hidden') && dateInputEl.value) {
        loadFrequencyForDate(currentClassId, dateInputEl.value);
    } else if (!telaPresencaEl.classList.contains('hidden')) {
        renderStudentList(currentClassData.students, {});
    }
}

function handleDateChange(dateString) {
// ... (código handleDateChange mantido)
    if (!currentClassId) {
        showMessage("Selecione uma turma primeiro.", 'error');
        dateInputEl.value = '';
        return;
    }
    if (dateString) {
        loadFrequencyForDate(currentClassId, dateString);
    } else {
        renderStudentList(currentClassData.students, {});
    }
}

function handleDeleteClassQuick() {
    // 1a. Verifica se uma turma está selecionada
    if (!currentClassId || !currentClassData) {
        showMessage("Selecione uma turma para excluir.", 'error');
        return;
    }
    
    // 1b. Chama a função de exclusão existente que já contém o window.confirm()
    // A função deleteClass() irá perguntar ao usuário: "Tem certeza que deseja excluir esta turma?..."
    deleteClass();
}

function handleEditClassQuick() {
    if (currentClassId && currentClassData) {
        // Abre o modal em modo de edição, com os dados da turma selecionada
        showClassModal(true, currentClassData);
    } else {
        showMessage("Selecione uma turma para editar.", 'error');
    }
}

// --- LÓGICA DA TELA DE RELATÓRIO ---

function handlePeriodSelection(period) {
// ... (código handlePeriodSelection mantido)
    selectedReportPeriod = period;

    btnPeriodoSemanal.classList.remove('bg-white', 'border-primary', 'text-primary', 'border-gray-300', 'text-gray-700');
    btnPeriodoMensal.classList.remove('bg-white', 'border-primary', 'text-primary', 'border-gray-300', 'text-gray-700');

    if (period === 'Semanal') {
        btnPeriodoSemanal.classList.add('bg-white', 'border-primary', 'text-primary');
        btnPeriodoMensal.classList.add('bg-white', 'border-gray-300', 'text-gray-700');
        periodoSemanalConfig.classList.remove('hidden');
        periodoMensalConfig.classList.add('hidden');
    } else {
        btnPeriodoMensal.classList.add('bg-white', 'border-primary', 'text-primary');
        btnPeriodoSemanal.classList.add('bg-white', 'border-gray-300', 'text-gray-700');
        periodoSemanalConfig.classList.add('hidden');
        periodoMensalConfig.classList.remove('hidden');
    }
    relatorioResultadoEl.classList.add('hidden');
}


async function generateReport() {
    if (!currentClassId) {
        showMessage("Selecione uma turma no menu inicial.", 'error');
        return;
    }

    let startDate, endDate, periodDisplay, periodFileName;

    if (selectedReportPeriod === 'Semanal') {
        const weekValue = semanaInputEl.value;
        if (!weekValue) {
            showMessage("Selecione uma semana.", 'error');
            return;
        }

        const weekRange = getDateRangeOfWeek(weekValue);
        startDate = weekRange.startDate;
        endDate = weekRange.endDate;
        periodDisplay = weekRange.display;
        periodFileName = weekValue;

        if (!startDate || !endDate) {
            showMessage("Erro ao calcular o período da semana. Verifique a seleção.", 'error');
            return;
        }
        
    } else { // Mensal
        const monthValue = mesInputEl.value;
        if (!monthValue) {
            showMessage("Selecione um mês.", 'error');
            return;
        }
        const [year, month] = monthValue.split('-');
        startDate = `${year}-${month}-01`;
        // Calcula o último dia do mês
        endDate = new Date(year, month, 0).toISOString().split('T')[0];
        periodDisplay = `Mês: ${monthValue}`;
        periodFileName = monthValue;
    }

    const frequencyPath = getFrequencyCollectionPath(currentClassId);
    if (!frequencyPath) return;

    try {
        // Busca TODOS os documentos de frequência da turma (para filtrar em memória)
        const q = query(collection(db, frequencyPath));
        const snapshot = await getDocs(q);

        // Filtra os registros que estão dentro do intervalo de datas (incluso)
        const allRecords = snapshot.docs
            .map(doc => doc.data())
            .filter(data => data.date >= startDate && data.date <= endDate);

        if (allRecords.length === 0) {
            relatorioConteudoEl.innerHTML = `<p class="text-center text-gray-500 py-4">Nenhum registro de frequência encontrado para o período ${periodDisplay}.</p>`;
            relatorioResultadoEl.classList.remove('hidden');
            exportRelatorioBtn.disabled = true;
            showMessage("Nenhum dado encontrado para o relatório.", 'info');
            return;
        }

        // Lógica de Agregação
        const studentStats = {};
        currentClassData.students.forEach(name => {
            studentStats[name] = { totalAulas: 0, totalPresencas: 0, totalAtrasos: 0, totalConflitos: 0, totalParticipativos: 0 };
        });

        allRecords.forEach(record => {
            Object.entries(record.records).forEach(([name, status]) => {
                if (studentStats[name]) {
                    studentStats[name].totalAulas++;
                    if (status.present) {
                        studentStats[name].totalPresencas++;
                    }
                    if (status.pontualidade === 'atrasado') {
                        studentStats[name].totalAtrasos++;
                    }
                    if (status.harmonia === 'conflituoso') {
                        studentStats[name].totalConflitos++;
                    }
                    if (status.participacao === 'participativo') {
                        studentStats[name].totalParticipativos++;
                    }
                }
            });
        });

        // Monta o HTML do Relatório
        let reportHtml = `
            <h4 class="text-lg font-semibold text-gray-800 mb-2">Turma: ${currentClassData.name}</h4>
            <p class="text-sm text-gray-600 mb-4">Período: ${periodDisplay}</p>
            <p class="text-sm text-gray-600 mb-4">Total de Aulas Registradas no Período: <span class="font-bold text-primary">${allRecords.length}</span></p>
            <div class="space-y-4">
        `;

        Object.entries(studentStats).forEach(([name, stats]) => {
            const freqPercent = stats.totalAulas > 0 ? ((stats.totalPresencas / stats.totalAulas) * 100).toFixed(1) : 0;
            const presenceColor = freqPercent < 75 ? 'text-red-600 font-bold' : 'text-green-600 font-bold';

            reportHtml += `
                <div class="p-3 border rounded-lg shadow-sm bg-gray-50">
                    <p class="font-bold text-gray-900">${name}</p>
                    <p class="text-sm mt-1">
                        Frequência: <span class="${presenceColor}">${stats.totalPresencas} / ${stats.totalAulas} (${freqPercent}%)</span>
                    </p>
                    <p class="text-xs text-gray-600">Atrasos: ${stats.totalAtrasos} | Conflituoso: ${stats.totalConflitos} | Participativo: ${stats.totalParticipativos}</p>
                </div>
            `;
        });

        reportHtml += '</div>';

        relatorioConteudoEl.innerHTML = reportHtml;
        relatorioResultadoEl.classList.remove('hidden');
        exportRelatorioBtn.disabled = false;
        showMessage("Relatório gerado com sucesso!", 'success');

    } catch (error) {
        console.error("Erro ao gerar relatório:", error);
        showMessage("Erro ao gerar relatório: " + error.message, 'error');
        relatorioConteudoEl.innerHTML = `<p class="text-center text-red-500 py-4">Erro ao carregar dados.</p>`;
        relatorioResultadoEl.classList.remove('hidden');
    }
}

function exportReportToCSV() {
    if (!currentClassId || relatorioResultadoEl.classList.contains('hidden')) {
        showMessage("Nenhum relatório carregado para exportar.", 'error');
        return;
    }

    let startDate, endDate, periodDisplay, periodFileName;

    if (selectedReportPeriod === 'Semanal') {
        const weekValue = semanaInputEl.value;
        if (!weekValue) {
            showMessage("Selecione uma semana.", 'error');
            return;
        }

        const weekRange = getDateRangeOfWeek(weekValue);
        startDate = weekRange.startDate;
        endDate = weekRange.endDate;
        periodDisplay = weekRange.display;
        periodFileName = weekValue;

        if (!startDate || !endDate) {
            showMessage("Erro ao calcular o período da semana para exportação.", 'error');
            return;
        }

    } else { // Mensal
        const monthValue = mesInputEl.value;
        if (!monthValue) {
            showMessage("Selecione um mês.", 'error');
            return;
        }
        const [year, month] = monthValue.split('-');
        startDate = `${year}-${month}-01`;
        endDate = new Date(year, month, 0).toISOString().split('T')[0];
        periodDisplay = `Mês: ${monthValue}`;
        periodFileName = monthValue;
    }

    const frequencyPath = getFrequencyCollectionPath(currentClassId);
    if (!frequencyPath) return;

    // Repete a busca e agregação
    getDocs(query(collection(db, frequencyPath))).then(snapshot => {
        const fetchedRecords = snapshot.docs
            .map(doc => doc.data())
            .filter(data => data.date >= startDate && data.date <= endDate);

        const studentStats = {};
        currentClassData.students.forEach(name => {
            studentStats[name] = { totalAulas: 0, totalPresencas: 0, totalAtrasos: 0, totalConflitos: 0, totalParticipativos: 0 };
        });

        fetchedRecords.forEach(record => {
            Object.entries(record.records).forEach(([name, status]) => {
                if (studentStats[name]) {
                    studentStats[name].totalAulas++;
                    if (status.present) {
                        studentStats[name].totalPresencas++;
                    }
                    if (status.pontualidade === 'atrasado') {
                        studentStats[name].totalAtrasos++;
                    }
                    if (status.harmonia === 'conflituoso') {
                        studentStats[name].totalConflitos++;
                    }
                    if (status.participacao === 'participativo') {
                        studentStats[name].totalParticipativos++;
                    }
                }
            });
        });

        // 1. Geração do CSV
        let csvContent = `Turma: ${currentClassData.name}\n`;
        csvContent += `Período: ${periodDisplay}\n`;
        csvContent += `Total de Aulas Registradas: ${fetchedRecords.length}\n`;
        csvContent += "Nome;Total Aulas;Total Presenças;Percentual Frequência;Total Atrasos;Total Conflituoso;Total Participativo\n";

        Object.entries(studentStats).forEach(([name, stats]) => {
            const freqPercent = stats.totalAulas > 0 ? ((stats.totalPresencas / stats.totalAulas) * 100).toFixed(1) : '0.0';

            const row = [
                `"${name}"`,
                stats.totalAulas,
                stats.totalPresencas,
                `${freqPercent}%`,
                stats.totalAtrasos,
                stats.totalConflitos,
                stats.totalParticipativos
            ].join(';');

            csvContent += row + "\n";
        });

        // 2. Criação e Download do arquivo
        const filename = `${currentClassData.name}_Relatorio_${periodFileName}.csv`;
        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');

        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showMessage(`Relatório exportado para CSV!`, 'success');
        } else {
            showMessage("Seu navegador não suporta download de arquivos.", 'error');
        }

    }).catch(error => {
        console.error("Erro ao exportar relatório:", error);
        showMessage("Erro ao exportar relatório: " + error.message, 'error');
    });
}


// --- EVENTOS ---

closeMessageBtn.addEventListener('click', closeMessage);
logoUploadInput.addEventListener('change', handleLogoUpload);

// Eventos de Menu
classesSelectEl.addEventListener('change', (e) => handleClassSelection(e.target.value));
openAddClassBtn.addEventListener('click', () => { 
    // Garante que o ID seja nulo para forçar a função saveClass() a ADICIONAR uma nova turma (addDoc)
    currentClassId = null; 
    showClassModal(false);
});
openDeleteClassQuickBtn.addEventListener('click', handleDeleteClassQuick); // Abre modal de edição para confirmar exclusão
btnPreencherPresenca.addEventListener('click', () => navigateTo('presenca'));
btnGerarRelatorio.addEventListener('click', () => navigateTo('relatorio'));

// Eventos da Tela de Presença
btnVoltarMenuPresenca.addEventListener('click', () => {
    // Garante que o estado de classe selecionada está correto ao voltar
    handleClassSelection(classesSelectEl.value);
    navigateTo('menu');
});
dateInputEl.addEventListener('change', (e) => handleDateChange(e.target.value));
saveAttendanceBtn.addEventListener('click', registerFrequency);
exportCSVBtn.addEventListener('click', exportAttendanceToCSV);


// Eventos da Tela de Relatório
btnVoltarMenuRelatorio.addEventListener('click', () => {
    // Garante que o estado de classe selecionada está correto ao voltar
    handleClassSelection(classesSelectEl.value);
    navigateTo('menu');
});
btnPeriodoSemanal.addEventListener('click', () => handlePeriodSelection('Semanal'));
btnPeriodoMensal.addEventListener('click', () => handlePeriodSelection('Mensal'));
// NOVO: Adiciona listener para a mudança do input de semana
semanaInputEl.addEventListener('change', updateWeekDisplay);
btnGerarRelatorioFinal.addEventListener('click', generateReport);
exportRelatorioBtn.addEventListener('click', exportReportToCSV);


// Eventos do Modal
cancelAddClassBtn.addEventListener('click', hideClassModal);
saveClassBtn.addEventListener('click', saveClass);
deleteClassBtn.addEventListener('click', deleteClass);
studentListFileEl.addEventListener('change', handleStudentListFile);


// Data padrão (hoje) e período de relatório inicial
const today = new Date().toISOString().split('T')[0];
dateInputEl.value = today;

// NOVO: Define a semana atual como padrão e exibe o intervalo
const todayISOWeek = getISOWeek(new Date());
semanaInputEl.value = todayISOWeek;
handlePeriodSelection('Semanal'); // Configura o estado inicial do relatório (vai chamar updateWeekDisplay ao entrar na tela)

// --- INICIALIZAÇÃO ---

async function initializeAppAndAuth() {
    try {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        await signInAnonymously(auth);
        onAuthStateChanged(auth, (user) => {
            if (user) {
                userId = user.uid;
                userIdDisplayEl.textContent = `Usuário: ${userId.substring(0, 8)}...`;
                loadingEl.classList.add('hidden');
                menuInicialEl.classList.remove('hidden'); // Exibe o menu principal
                loadSavedLogo();
                setupClassesListener();
                // Chama updateWeekDisplay para exibir o valor inicial da semana
                updateWeekDisplay();
            } else {
                userIdDisplayEl.textContent = `Usuário: Desconectado`;
                showMessage('Erro de autenticação. Recarregue a página.', 'error');
            }
        });
    } catch (error) {
        console.error("❌ Erro durante a inicialização:", error);
        loadingEl.innerHTML = `<p class="text-red-600 text-center font-medium">Erro: ${error.message}</p>`;
        showMessage('Erro ao conectar ao Firebase: ' + error.message, 'error');
    }
}

initializeAppAndAuth();
