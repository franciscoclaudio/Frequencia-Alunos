// Script otimizado para uso com localStorage
// Todas as operações são síncronas e diretas com o armazenamento local

// ========================================
// CONFIGURAÇÃO LOCAL STORAGE (CHAVES)
// ========================================
const CLASSES_KEY = 'localClasses';
const FREQUENCIES_KEY = 'localFrequencies';
const LOGO_KEY = 'customLogo';
const userId = 'local_user';

// --- VARIÁVEIS GLOBAIS DE ESTADO DA APLICAÇÃO ---
let currentClasses = [];
let currentFrequencies = {};
let currentClassId = null;
let currentClassData = null;
let currentFrequencyDocId = null;
let selectedReportPeriod = 'Semanal';

// --- ELEMENTOS DO DOM ---
const loadingEl = document.getElementById('loadingIndicator');
const userIdDisplayEl = document.getElementById('userIdDisplay');
const logoImg = document.getElementById('logoImg');
const logoUploadInput = document.getElementById('logoUpload');

// Elementos do Menu Inicial
const menuInicialEl = document.getElementById('menuInicial');
const classesSelectEl = document.getElementById('classesSelectMenu');
const openAddClassBtn = document.getElementById('openAddClassBtnMenu');
const openEditClassBtn = document.getElementById('openEditClassBtnMenu');
const openDeleteClassQuickBtn = document.getElementById('deleteClassQuickBtnMenu');
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
const semanaDisplayEl = document.getElementById('semanaDisplay');
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

// ========================================
// FUNÇÕES DE LOCAL STORAGE
// ========================================

/**
 * Salva dados no localStorage com tratamento de erros
 */
function saveToLocalStorage(key, data) {
    try {
        const jsonData = JSON.stringify(data);
        localStorage.setItem(key, jsonData);
        console.log(`✓ Dados salvos em ${key}:`, data);
        return true;
    } catch (error) {
        console.error(`✗ Erro ao salvar em ${key}:`, error);
        showMessage('Erro ao salvar dados no navegador', 'error');
        return false;
    }
}

/**
 * Carrega dados do localStorage com tratamento de erros
 */
function loadFromLocalStorage(key, defaultValue = null) {
    try {
        const jsonData = localStorage.getItem(key);
        if (jsonData === null) {
            console.log(`ℹ Nenhum dado encontrado em ${key}, usando valor padrão`);
            return defaultValue;
        }
        const data = JSON.parse(jsonData);
        console.log(`✓ Dados carregados de ${key}:`, data);
        return data;
    } catch (error) {
        console.error(`✗ Erro ao carregar de ${key}:`, error);
        return defaultValue;
    }
}

/**
 * Remove dados do localStorage
 */
function removeFromLocalStorage(key) {
    try {
        localStorage.removeItem(key);
        console.log(`✓ Dados removidos de ${key}`);
        return true;
    } catch (error) {
        console.error(`✗ Erro ao remover ${key}:`, error);
        return false;
    }
}

/**
 * Limpa todo o localStorage (uso com cuidado)
 */
function clearAllLocalStorage() {
    if (confirm('⚠️ Isso irá apagar TODOS os dados armazenados. Confirma?')) {
        try {
            localStorage.clear();
            console.log('✓ Todos os dados foram limpos');
            showMessage('Todos os dados foram apagados', 'info');
            location.reload();
        } catch (error) {
            console.error('✗ Erro ao limpar dados:', error);
        }
    }
}

// ========================================
// FUNÇÕES DE MANIPULAÇÃO DE CLASSES
// ========================================

/**
 * Carrega todas as classes do localStorage
 */
function loadClassesFromLocal() {
    currentClasses = loadFromLocalStorage(CLASSES_KEY, []);
    currentClasses.sort((a, b) => a.name.localeCompare(b.name));
    updateClassSelects();
}

/**
 * Salva todas as classes no localStorage
 */
function saveClassesToLocal() {
    return saveToLocalStorage(CLASSES_KEY, currentClasses);
}

// ========================================
// FUNÇÕES DE MANIPULAÇÃO DE FREQUÊNCIAS
// ========================================

/**
 * Carrega todos os registros de frequência do localStorage
 */
function loadFrequenciesFromLocal() {
    currentFrequencies = loadFromLocalStorage(FREQUENCIES_KEY, {});
}

/**
 * Salva todos os registros de frequência no localStorage
 */
function saveFrequenciesToLocal() {
    return saveToLocalStorage(FREQUENCIES_KEY, currentFrequencies);
}

// ========================================
// UTILIDADES
// ========================================

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
 * Calcula o intervalo de datas de uma semana ISO
 */
function getDateRangeOfWeek(isoWeekString) {
    if (!isoWeekString || !isoWeekString.match(/^\d{4}-W\d{2}$/)) {
        return { startDate: null, endDate: null, display: 'Selecione uma semana válida' };
    }

    const [yearStr, weekStr] = isoWeekString.split('-W');
    const year = parseInt(yearStr, 10);
    const week = parseInt(weekStr, 10);

    const jan4 = new Date(year, 0, 4);
    let jan4Day = jan4.getDay();
    let jan4ISOday = jan4Day === 0 ? 7 : jan4Day;

    const firstMonday = new Date(jan4);
    firstMonday.setDate(jan4.getDate() + 1 - jan4ISOday);

    const targetMonday = new Date(firstMonday);
    targetMonday.setDate(firstMonday.getDate() + (week - 1) * 7);

    const targetSunday = new Date(targetMonday);
    targetSunday.setDate(targetMonday.getDate() + 6);

    const formatISODate = (date) => date.toISOString().split('T')[0];
    const formatDay = (date) => date.getDate().toString().padStart(2, '0');
    const monthNames = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
    const formatMonth = (date) => monthNames[date.getMonth()];

    const startDay = formatDay(targetMonday);
    const endDay = formatDay(targetSunday);
    const startMonthName = formatMonth(targetMonday);
    const endMonthName = formatMonth(targetSunday);
    const displayYear = targetSunday.getFullYear();
    const displayWeek = week.toString().padStart(2, '0');

    let displayString;
    if (targetMonday.getMonth() === targetSunday.getMonth()) {
        displayString = `${startDay} a ${endDay} ${startMonthName} ${displayYear}, semana ${displayWeek}`;
    } else {
        displayString = `${startDay} ${startMonthName} a ${endDay} ${endMonthName} ${displayYear}, semana ${displayWeek}`;
    }

    return {
        startDate: formatISODate(targetMonday),
        endDate: formatISODate(targetSunday),
        display: displayString
    };
}

/**
 * Atualiza o display da semana selecionada
 */
function updateWeekDisplay() {
    const isoWeekValue = semanaInputEl.value;
    const weekRange = getDateRangeOfWeek(isoWeekValue);
    if (semanaDisplayEl) {
        semanaDisplayEl.textContent = weekRange.display;
    }
}

function showMessage(message, type = 'success') {
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
    messageToast.classList.add('opacity-0');
    setTimeout(() => {
        messageToast.classList.add('hidden');
        messageToast.classList.remove('flex');
    }, 300);
}

function handleLogoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        logoImg.src = e.target.result;
        saveToLocalStorage(LOGO_KEY, e.target.result);
        showMessage('Logo atualizada!', 'info');
    };
    reader.readAsDataURL(file);
}

function loadSavedLogo() {
    const savedLogo = loadFromLocalStorage(LOGO_KEY, null);
    if (savedLogo) {
        logoImg.src = savedLogo;
    }
}

function showClassModal(isEditing = false, classData = null) {
    if (isEditing && classData) {
        modalTitleEl.textContent = `Editar: ${classData.name}`;
        classNameInputEl.value = classData.name || '';
        studentListInputEl.value = (classData.students || []).join('\n');
        deleteClassBtn.classList.remove('hidden');
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

function hideClassModal() {
    addClassModal.classList.add('hidden');
    addClassModal.classList.remove('flex');
    classNameInputEl.value = '';
    studentListInputEl.value = '';
    studentListFileEl.value = '';
    handleClassSelection(classesSelectEl.value);
}

function handleStudentListFile(event) {
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

/**
 * Salva ou atualiza uma classe
 */
function saveClass() {
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

    const now = new Date().toISOString();
    const isEditing = !!currentClassId && currentClasses.some(c => c.id === currentClassId);
    
    let classData = {
        name: className,
        students: students,
        updatedAt: now
    };

    if (isEditing) {
        const existingClass = currentClasses.find(c => c.id === currentClassId);
        classData.id = currentClassId;
        classData.createdAt = existingClass.createdAt;
        
        const index = currentClasses.findIndex(c => c.id === currentClassId);
        if (index > -1) {
            currentClasses[index] = classData;
            currentClassData = classData;
        }
        showMessage(`Turma "${className}" atualizada!`);
    } else {
        const newId = Date.now().toString() + Math.random().toString(36).substring(2, 9);
        classData.id = newId;
        classData.createdAt = now;
        currentClasses.push(classData);
        currentClassId = newId;
        showMessage(`Turma "${className}" adicionada!`);
    }

    saveClassesToLocal();
    updateClassSelects();
    classesSelectEl.value = currentClassId;
    hideClassModal();
}

/**
 * Exclui uma classe e seus registros
 */
function deleteClass() {
    if (!currentClassId || !currentClassData) return;
    
    const className = currentClassData.name.toUpperCase();
    
    if (!window.confirm(`\n⚠️ EXCLUIR TURMA: "${className}"\n\nConfirma a exclusão desta turma e de todos os seus registros de frequência? ESTA AÇÃO É IRREVERSÍVEL!`)) {
        return;
    }

    // Remove frequências da turma
    if (currentFrequencies[currentClassId]) {
        delete currentFrequencies[currentClassId];
        saveFrequenciesToLocal();
    }

    // Remove a turma
    currentClasses = currentClasses.filter(c => c.id !== currentClassId);
    saveClassesToLocal();

    showMessage(`Turma excluída com sucesso!`);

    currentClassId = null;
    currentClassData = null;

    updateClassSelects();
    hideClassModal();
}

/**
 * Carrega frequência para uma data específica
 */
function loadFrequencyForDate(classId, dateString) {
    currentFrequencyDocId = null;
    saveAttendanceBtn.textContent = 'Salvar Frequência';
    saveAttendanceBtn.disabled = false;
    exportCSVBtn.disabled = false;

    if (!classId || !dateString) {
        exportCSVBtn.disabled = true;
        return;
    }

    const students = currentClassData.students;
    let frequencyRecords = {};

    const classFrequencies = currentFrequencies[classId] || {};
    const data = classFrequencies[dateString];

    if (data) {
        frequencyRecords = data.records || {};
        currentFrequencyDocId = dateString;
        saveAttendanceBtn.textContent = 'Atualizar Frequência';
        showMessage(`Registro de ${dateString} carregado`, 'info');
    } else {
        showMessage(`Novo registro para ${dateString}`, 'info');
    }
    
    renderStudentList(students, frequencyRecords);
}

/**
 * Registra/atualiza frequência
 */
function registerFrequency() {
    if (!currentClassId || !dateInputEl.value) {
        showMessage("Selecione uma turma e uma data.", 'error');
        return;
    }

    const dateString = dateInputEl.value;
    const records = {};
    const studentItems = studentsListContainerEl.querySelectorAll('.student-item');

    studentItems.forEach(item => {
        const name = item.dataset.studentName;
        const presenceCheckbox = item.querySelector('.presence-checkbox');
        const pontualidade = item.querySelector('.pontualidade-select')?.value || "não observado";
        const harmonia = item.querySelector('.harmonia-select')?.value || "não observado";
        const participacao = item.querySelector('.participacao-select')?.value || "não observado";

        records[name] = {
            present: presenceCheckbox.checked,
            pontualidade: pontualidade === "" ? "não observado" : pontualidade,
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

    if (!currentFrequencies[currentClassId]) {
        currentFrequencies[currentClassId] = {};
    }
    
    currentFrequencies[currentClassId][dateString] = frequencyData;
    
    if (saveFrequenciesToLocal()) {
        currentFrequencyDocId = dateString;
        saveAttendanceBtn.textContent = 'Atualizar Frequência';
        showMessage(`Frequência salva para ${dateString}!`);
    }
}

// ========================================
// RENDERIZAÇÃO E UI
// ========================================

function navigateTo(screenId) {
    menuInicialEl.classList.add('hidden');
    telaPresencaEl.classList.add('hidden');
    telaRelatorioEl.classList.add('hidden');

    if (screenId === 'menu') {
        menuInicialEl.classList.remove('hidden');
    } else if (screenId === 'presenca') {
        telaPresencaEl.classList.remove('hidden');
        if (currentClassId && dateInputEl.value) {
            loadFrequencyForDate(currentClassId, dateInputEl.value);
        } else if (currentClassId) {
            renderStudentList(currentClassData.students, {});
        } else {
            clearStudentList();
        }
    } else if (screenId === 'relatorio') {
        telaRelatorioEl.classList.remove('hidden');
        relatorioResultadoEl.classList.add('hidden');
        relatorioConteudoEl.innerHTML = 'Preencha as configurações e clique em Gerar Relatório.';
        updateWeekDisplay();
    }
}

function updateClassSelects() {
    const previouslySelectedClassId = classesSelectEl.value;
    classesSelectEl.innerHTML = '<option value="" disabled selected>-- Selecione uma Turma --</option>';
    
    currentClasses.forEach(classData => {
        const option = document.createElement('option');
        option.value = classData.id;
        option.textContent = `${classData.name} (${classData.students.length} alunos)`;
        classesSelectEl.appendChild(option);
    });

    const newSelectionId = currentClassId || previouslySelectedClassId;

    if (newSelectionId && currentClasses.some(c => c.id === newSelectionId)) {
        classesSelectEl.value = newSelectionId;
        currentClassId = newSelectionId;
        currentClassData = currentClasses.find(c => c.id === newSelectionId);
        handleClassSelection(newSelectionId);
    } else {
        classesSelectEl.value = "";
        currentClassId = null;
        currentClassData = null;
        clearStudentList();
        btnPreencherPresenca.disabled = true;
        btnGerarRelatorio.disabled = true;
        openEditClassBtn.classList.add('hidden');
        openDeleteClassQuickBtn.classList.add('hidden');
    }
}

function clearStudentList() {
    studentsListContainerEl.innerHTML = `<p class="text-center text-gray-500 py-4">Selecione uma turma e data.</p>`;
    currentClassTitleEl.textContent = 'Selecione uma turma acima';
    dateDisplayEl.textContent = '';
    saveAttendanceBtn.disabled = true;
    exportCSVBtn.disabled = true;
    openEditClassBtn.classList.add('hidden');
    openDeleteClassQuickBtn.classList.add('hidden');
}

function renderStudentList(students, records) {
    studentsListContainerEl.innerHTML = '';
    const listHtml = students.map((name, index) => {
        const record = records[name] || { present: true };
        const isPresent = record.present !== false;
        const indexDisplay = index + 1;
        const studentRowClasses = isPresent ? 'bg-white' : 'bg-red-50';
        const switchBgColor = isPresent ? 'bg-primary' : 'bg-gray-200';
        const switchTranslate = isPresent ? 'translate-x-6' : 'translate-x-1';

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
    if (!currentClassId || !dateInputEl.value) {
        showMessage("Nenhuma frequência carregada para exportar.", 'error');
        return;
    }

    const dateString = dateInputEl.value;
    const className = currentClassData.name;
    const studentItems = studentsListContainerEl.querySelectorAll('.student-item');

    let csvContent = `Turma: ${className}\n`;
    csvContent += `Data: ${dateString}\n`;
    csvContent += "Nome;Presente;Pontualidade;Harmonia;Participação\n";

    studentItems.forEach(item => {
        const name = item.dataset.studentName;
        const presenceCheckbox = item.querySelector('.presence-checkbox');
        const isPresent = presenceCheckbox.checked ? "SIM" : "NÃO";
        const pontualidade = item.querySelector('.pontualidade-select')?.value || "";
        const harmonia = item.querySelector('.harmonia-select')?.value || "";
        const participacao = item.querySelector('.participacao-select')?.value || "";

        const getDisplayValue = (value) => value === "" ? "Não Observado" : value.charAt(0).toUpperCase() + value.slice(1);

        const row = [
            `"${name}"`,
            isPresent,
            getDisplayValue(pontualidade),
            getDisplayValue(harmonia),
            getDisplayValue(participacao)
        ].join(';');

        csvContent += row + "\n";
    });

    const filename = `${className}_Frequencia_${dateString}.csv`;
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
        showMessage(`Exportação para CSV de "${className}" concluída!`);
    } else {
        showMessage("Seu navegador não suporta download de arquivos.", 'error');
    }
}

// ========================================
// LÓGICA DE NAVEGAÇÃO E SELEÇÃO
// ========================================

function handleClassSelection(classId) {
    if (!classId || classId === "") {
        currentClassId = null;
        currentClassData = null;
        clearStudentList();
        btnPreencherPresenca.disabled = true;
        btnGerarRelatorio.disabled = true;
        openEditClassBtn.classList.add('hidden');
        openDeleteClassQuickBtn.classList.add('hidden');
        return;
    }

    const selectedClass = currentClasses.find(c => c.id === classId);
    if (!selectedClass) {
        currentClassId = null;
        currentClassData = null;
        clearStudentList();
        btnPreencherPresenca.disabled = true;
        btnGerarRelatorio.disabled = true;
        openEditClassBtn.classList.add('hidden');
        openDeleteClassQuickBtn.classList.add('hidden');
        return;
    }

    currentClassId = classId;
    currentClassData = selectedClass;
    btnPreencherPresenca.disabled = false;
    btnGerarRelatorio.disabled = false;
    openEditClassBtn.classList.remove('hidden');
    openDeleteClassQuickBtn.classList.remove('hidden');

    if (!telaPresencaEl.classList.contains('hidden') && dateInputEl.value) {
        loadFrequencyForDate(currentClassId, dateInputEl.value);
    } else if (!telaPresencaEl.classList.contains('hidden')) {
        renderStudentList(currentClassData.students, {});
    }
}

function handleDateChange(dateString) {
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
    if (!currentClassId || !currentClassData) {
        showMessage("Selecione uma turma para excluir.", 'error');
        return;
    }
    deleteClass();
}

function handleEditClassQuick() {
    if (currentClassId && currentClassData) {
        showClassModal(true, currentClassData);
    } else {
        showMessage("Selecione uma turma para editar.", 'error');
    }
}

// ========================================
// LÓGICA DA TELA DE RELATÓRIO
// ========================================

function handlePeriodSelection(period) {
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

function generateReport() {
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
    } else {
        const monthValue = mesInputEl.value;
        if (!monthValue) {
            showMessage("Selecione um mês.", 'error');
            return;
        }
        const [year, month] = monthValue.split('-');
        startDate = `${year}-${month}-01`;
        endDate = new Date(year, parseInt(month), 0).toISOString().split('T')[0];
        periodDisplay = `Mês: ${monthValue}`;
        periodFileName = monthValue;
    }

    const classFrequencies = currentFrequencies[currentClassId] || {};
    const allRecords = Object.values(classFrequencies);
    const filteredRecords = allRecords.filter(data => data.date >= startDate && data.date <= endDate);

    if (filteredRecords.length === 0) {
        relatorioConteudoEl.innerHTML = `<p class="text-center text-gray-500 py-4">Nenhum registro de frequência encontrado para o período ${periodDisplay}.</p>`;
        relatorioResultadoEl.classList.remove('hidden');
        exportRelatorioBtn.disabled = true;
        showMessage("Nenhum dado encontrado para o relatório.", 'info');
        return;
    }

    const studentStats = {};
    currentClassData.students.forEach(name => {
        studentStats[name] = { 
            totalAulas: 0, 
            totalPresencas: 0, 
            totalAtrasos: 0, 
            totalConflitos: 0, 
            totalParticipativos: 0 
        };
    });

    filteredRecords.forEach(record => {
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

    let reportHtml = `
        <h4 class="text-lg font-semibold text-gray-800 mb-2">Turma: ${currentClassData.name}</h4>
        <p class="text-sm text-gray-600 mb-4">Período: ${periodDisplay}</p>
        <p class="text-sm text-gray-600 mb-4">Total de Aulas Registradas no Período: <span class="font-bold text-primary">${filteredRecords.length}</span></p>
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
    } else {
        const monthValue = mesInputEl.value;
        if (!monthValue) {
            showMessage("Selecione um mês.", 'error');
            return;
        }
        const [year, month] = monthValue.split('-');
        startDate = `${year}-${month}-01`;
        endDate = new Date(year, parseInt(month), 0).toISOString().split('T')[0];
        periodDisplay = `Mês: ${monthValue}`;
        periodFileName = monthValue;
    }

    const classFrequencies = currentFrequencies[currentClassId] || {};
    const fetchedRecords = Object.values(classFrequencies)
        .filter(data => data.date >= startDate && data.date <= endDate);

    const studentStats = {};
    currentClassData.students.forEach(name => {
        studentStats[name] = { 
            totalAulas: 0, 
            totalPresencas: 0, 
            totalAtrasos: 0, 
            totalConflitos: 0, 
            totalParticipativos: 0 
        };
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
}

// ========================================
// EVENTOS
// ========================================

closeMessageBtn.addEventListener('click', closeMessage);
logoUploadInput.addEventListener('change', handleLogoUpload);

// Eventos de Menu
classesSelectEl.addEventListener('change', (e) => handleClassSelection(e.target.value));
openAddClassBtn.addEventListener('click', () => { 
    currentClassId = null; 
    showClassModal(false);
});
openEditClassBtn.addEventListener('click', handleEditClassQuick);
openDeleteClassQuickBtn.addEventListener('click', handleDeleteClassQuick);
btnPreencherPresenca.addEventListener('click', () => navigateTo('presenca'));
btnGerarRelatorio.addEventListener('click', () => navigateTo('relatorio'));

// Eventos da Tela de Presença
btnVoltarMenuPresenca.addEventListener('click', () => {
    handleClassSelection(classesSelectEl.value);
    navigateTo('menu');
});
dateInputEl.addEventListener('change', (e) => handleDateChange(e.target.value));
saveAttendanceBtn.addEventListener('click', registerFrequency);
exportCSVBtn.addEventListener('click', exportAttendanceToCSV);

// Eventos da Tela de Relatório
btnVoltarMenuRelatorio.addEventListener('click', () => {
    handleClassSelection(classesSelectEl.value);
    navigateTo('menu');
});
btnPeriodoSemanal.addEventListener('click', () => handlePeriodSelection('Semanal'));
btnPeriodoMensal.addEventListener('click', () => handlePeriodSelection('Mensal'));
semanaInputEl.addEventListener('change', updateWeekDisplay);
btnGerarRelatorioFinal.addEventListener('click', generateReport);
exportRelatorioBtn.addEventListener('click', exportReportToCSV);

// Eventos do Modal
cancelAddClassBtn.addEventListener('click', hideClassModal);
saveClassBtn.addEventListener('click', saveClass);
deleteClassBtn.addEventListener('click', deleteClass);
studentListFileEl.addEventListener('change', handleStudentListFile);

// ========================================
// INICIALIZAÇÃO
// ========================================

function initializeApp() {
    console.log('🚀 Inicializando aplicação com localStorage...');
    
    // Define data padrão (hoje)
    const today = new Date().toISOString().split('T')[0];
    dateInputEl.value = today;

    // Define semana padrão (semana atual)
    const todayISOWeek = getISOWeek(new Date());
    semanaInputEl.value = todayISOWeek;

    // Define período padrão
    handlePeriodSelection('Semanal');

    // Esconde loading e mostra menu
    loadingEl.classList.add('hidden');
    menuInicialEl.classList.remove('hidden');

    // Carrega logo salva
    loadSavedLogo();

    // Carrega dados do localStorage
    loadFrequenciesFromLocal();
    loadClassesFromLocal();

    // Atualiza display da semana
    updateWeekDisplay();

    // Atualiza display do usuário
    userIdDisplayEl.textContent = `Armazenamento Local (Navegador)`;

    console.log('✅ Aplicação inicializada com sucesso!');
    console.log(`📊 Classes carregadas: ${currentClasses.length}`);
    console.log(`📅 Registros de frequência: ${Object.keys(currentFrequencies).length} turmas`);
}

// Inicializa quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

// Log para debug
console.log('📝 Script de localStorage carregado');