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

// --- ELEMENTOS DO DOM ---
const loadingEl = document.getElementById('loadingIndicator');
const appContentEl = document.getElementById('appContent');
const userIdDisplayEl = document.getElementById('userIdDisplay');
const logoImg = document.getElementById('logoImg');
const logoUploadInput = document.getElementById('logoUpload');
const classesSelectEl = document.getElementById('classesSelect');
const studentsListContainerEl = document.getElementById('studentsListContainer');
const dateInputEl = document.getElementById('dateInput');
const dateDisplayEl = document.getElementById('dateDisplay');
const currentClassTitleEl = document.getElementById('currentClassTitle');
const saveAttendanceBtn = document.getElementById('saveAttendanceBtn');
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
const openAddClassModalBtn = document.getElementById('openAddClassModalBtn');

// --- UTILIDADES ---

/**
 * Exibe a mensagem de feedback em um toast.
 */
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

/**
 * Fecha o toast de mensagem.
 */
function closeMessage() {
    messageToast.classList.add('opacity-0');
    setTimeout(() => {
        messageToast.classList.add('hidden');
        messageToast.classList.remove('flex');
    }, 300);
}

/**
 * Manipula o upload e preview da logo.
 */
function handleLogoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        logoImg.src = e.target.result;
        // Salva no localStorage para persistir
        try {
            localStorage.setItem('customLogo', e.target.result);
            showMessage('Logo atualizada!', 'info');
        } catch (err) {
            console.warn('Não foi possível salvar logo:', err);
        }
    };
    reader.readAsDataURL(file);
}

/**
 * Carrega logo salva do localStorage.
 */
function loadSavedLogo() {
    try {
        const savedLogo = localStorage.getItem('customLogo');
        if (savedLogo) {
            logoImg.src = savedLogo;
        }
    } catch (err) {
        console.warn('Não foi possível carregar logo salva:', err);
    }
}

/**
 * Mostra o modal de Adicionar/Editar Turma.
 */
function showClassModal(isEditing = false, classData = null) {
    if (isEditing && classData) {
        modalTitleEl.textContent = `Editar: ${classData.name}`;
        classNameInputEl.value = classData.name || '';
        studentListInputEl.value = (classData.students || []).join('\n');
        deleteClassBtn.classList.remove('hidden');
        currentClassId = classData.id;
    } else {
        modalTitleEl.textContent = 'Adicionar Nova Turma';
        classNameInputEl.value = '';
        studentListInputEl.value = '';
        deleteClassBtn.classList.add('hidden');
        currentClassId = null;
    }
    studentListFileEl.value = ''; // Limpa o input de arquivo
    addClassModal.classList.remove('hidden');
    addClassModal.classList.add('flex');
}

/**
 * Esconde o modal de Adicionar/Editar Turma.
 */
function hideClassModal() {
    addClassModal.classList.add('hidden');
    addClassModal.classList.remove('flex');
    currentClassId = null;
    classNameInputEl.value = '';
    studentListInputEl.value = '';
    studentListFileEl.value = '';
}

/**
 * Processa arquivo TXT com lista de alunos.
 */
function handleStudentListFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const fileContent = e.target.result;
        const names = fileContent.split(/\r?\n/)
            .map(name => name.trim())
            .filter(name => name.length > 0);
        
        // Atualiza o textarea com os nomes
        studentListInputEl.value = names.join('\n');
        
        // Se não houver nome de turma, sugere o nome do arquivo
        if (!classNameInputEl.value.trim()) {
            const fileName = file.name.replace(/\.txt$/i, '');
            classNameInputEl.value = fileName;
        }
        
        showMessage(`${names.length} alunos carregados do arquivo`, 'info');
    };
    reader.readAsText(file);
}

// --- FUNÇÕES DE FIREBASE / FIRESTORE ---

/**
 * Obtém o path da coleção de Turmas.
 */
function getClassCollectionPath() {
    if (!userId) {
        console.error("UserID não definido.");
        return null;
    }
    return `users/${userId}/classes`;
}

/**
 * Obtém o path da coleção de Frequências.
 */
function getFrequencyCollectionPath(classId) {
    if (!classId) {
        console.error("Class ID não definido para frequência.");
        return null;
    }
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

    onSnapshot(q, (snapshot) => {
        currentClasses = [];
        snapshot.forEach((doc) => {
            currentClasses.push({ id: doc.id, ...doc.data() });
        });
        console.log("Turmas atualizadas:", currentClasses);
        updateClassSelects();
    }, (error) => {
        console.error("Erro ao ouvir a coleção de Turmas:", error);
        showMessage("Erro ao carregar turmas: " + error.message, 'error');
    });
}

/**
 * Salva (adiciona ou atualiza) uma turma.
 */
async function saveClass() {
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
        const classData = {
            name: className,
            students: students,
            createdAt: currentClassId ? currentClassData.createdAt : new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (currentClassId) {
            const classDocRef = doc(db, classesPath, currentClassId);
            await setDoc(classDocRef, classData);
            showMessage(`Turma "${className}" atualizada!`);
        } else {
            await addDoc(collection(db, classesPath), classData);
            showMessage(`Turma "${className}" adicionada!`);
        }

        hideClassModal();

    } catch (error) {
        console.error("Erro ao salvar turma:", error);
        showMessage("Erro ao salvar turma: " + error.message, 'error');
    }
}

/**
 * Exclui a turma atualmente aberta no modal de edição.
 */
async function deleteClass() {
    if (!currentClassId) return;

    if (!window.confirm(`Excluir a turma "${classNameInputEl.value.trim()}" e todos os registros? IRREVERSÍVEL!`)) {
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
        hideClassModal();
        currentClassId = null;
        currentClassData = null;
        clearStudentList();
        classesSelectEl.value = '';

    } catch (error) {
        console.error("Erro ao excluir turma:", error);
        showMessage("Erro ao excluir turma: " + error.message, 'error');
    }
}

/**
 * Busca o registro de frequência para a data e turma selecionadas.
 */
async function loadFrequencyForDate(classId, dateString) {
    currentFrequencyDocId = null;
    saveAttendanceBtn.textContent = 'Salvar Frequência';
    saveAttendanceBtn.disabled = false;

    if (!classId || !dateString) return;

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
 * Salva o registro de frequência.
 */
async function registerFrequency() {
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
        records[name] = {
            present: presenceCheckbox.checked
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

// --- FUNÇÕES DE RENDERIZAÇÃO E UI ---

/**
 * Atualiza o select de turmas.
 */
function updateClassSelects() {
    classesSelectEl.innerHTML = '<option value="" disabled selected>-- Selecione uma Turma --</option>';
    
    currentClasses.forEach(classData => {
        const option = document.createElement('option');
        option.value = classData.id;
        option.textContent = `${classData.name} (${classData.students.length} alunos)`;
        classesSelectEl.appendChild(option);
    });

    if (currentClassId && currentClasses.some(c => c.id === currentClassId)) {
        classesSelectEl.value = currentClassId;
    } else {
        currentClassId = null;
        currentClassData = null;
        clearStudentList();
    }
}

/**
 * Limpa a lista de alunos.
 */
function clearStudentList() {
    studentsListContainerEl.innerHTML = `
        <p class="text-center text-gray-500 py-4">Selecione uma turma e data.</p>
    `;
    currentClassTitleEl.textContent = 'Selecione uma turma acima';
    dateDisplayEl.textContent = '';
    saveAttendanceBtn.disabled = true;
}

/**
 * Renderiza a lista de alunos.
 */
function renderStudentList(students, records) {
    studentsListContainerEl.innerHTML = '';
    
    const listHtml = students.map((name, index) => {
        const record = records[name] || { present: true };
        const isPresent = record.present;
        const indexDisplay = index + 1;
        const studentRowClasses = isPresent ? 'bg-white' : 'bg-red-50';
        const switchBgColor = isPresent ? 'bg-primary' : 'bg-gray-200';
        const switchTranslate = isPresent ? 'translate-x-6' : 'translate-x-1';

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
            </li>
        `;
    }).join('');

    studentsListContainerEl.innerHTML = `<ul class="space-y-1">${listHtml}</ul>`;
    
    currentClassTitleEl.textContent = currentClassData.name;
    dateDisplayEl.textContent = dateInputEl.value ? `Data: ${new Date(dateInputEl.value + 'T00:00:00').toLocaleDateString('pt-BR')}` : '';
    saveAttendanceBtn.disabled = false;
}

/**
 * Lida com a mudança de presença.
 */
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

// --- FUNÇÕES DE CONTROLE DE FLUXO ---

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

    if (dateInputEl.value) {
        loadFrequencyForDate(currentClassId, dateInputEl.value);
    } else {
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

// --- CONFIGURAÇÃO DE EVENTOS ---

closeMessageBtn.addEventListener('click', closeMessage);
logoUploadInput.addEventListener('change', handleLogoUpload);
openAddClassModalBtn.addEventListener('click', () => showClassModal(false));
cancelAddClassBtn.addEventListener('click', hideClassModal);
saveClassBtn.addEventListener('click', saveClass);
deleteClassBtn.addEventListener('click', deleteClass);
studentListFileEl.addEventListener('change', handleStudentListFile);
classesSelectEl.addEventListener('change', (e) => handleClassSelection(e.target.value));
dateInputEl.addEventListener('change', (e) => handleDateChange(e.target.value));
saveAttendanceBtn.addEventListener('click', registerFrequency);

// Configuração de data padrão (hoje)
const today = new Date().toISOString().split('T')[0];
dateInputEl.value = today;

// --- INICIALIZAÇÃO DA APLICAÇÃO ---

async function initializeAppAndAuth() {
    console.log("🚀 Iniciando aplicação...");
    
    try {
        app = initializeApp(firebaseConfig);
        console.log("✅ Firebase inicializado");
        
        db = getFirestore(app);
        console.log("✅ Firestore conectado");
        
        auth = getAuth(app);
        console.log("✅ Auth configurado");

        console.log("🔐 Tentando autenticação anônima...");
        await signInAnonymously(auth);
        console.log("✅ Autenticação anônima bem-sucedida!");

        onAuthStateChanged(auth, (user) => {
            if (user) {
                userId = user.uid;
                userIdDisplayEl.textContent = `Usuário: ${userId.substring(0, 8)}...`;

                loadingEl.classList.add('hidden');
                appContentEl.classList.remove('hidden');

                // Carrega logo salva
                loadSavedLogo();

                setupClassesListener();
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

// Inicia a aplicação
initializeAppAndAuth();
