// Importações do Firebase SDK v11 (JavaScript)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, collection, query, onSnapshot, addDoc, getDoc, getDocs, deleteDoc, where } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// CONFIGURAÇÃO FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyDo6uA_fJGbKqLfj9kwUu1JSkC34HGlWk0",
    authDomain: "registrar-frenquencia.firebaseapp.com",
    projectId: "registrar-frenquencia",
    storageBucket: "registrar-frenquencia.firebasestorage.app",
    messagingSenderId: "571143130821",
    appId: "1:571143130821:web:812eb820306f6b0338eaac"
};

let app, db, auth, userId = null;
let currentClasses = [];
let currentClassId = null;
let currentClassData = null;
let currentFrequencyDocId = null;
let periodoRelatorio = 'semanal';

// ELEMENTOS DO DOM
const loadingEl = document.getElementById('loadingIndicator');
const menuInicialEl = document.getElementById('menuInicial');
const telaPresencaEl = document.getElementById('telaPresenca');
const telaRelatorioEl = document.getElementById('telaRelatorio');
const userIdDisplayEl = document.getElementById('userIdDisplay');
const logoImg = document.getElementById('logoImg');
const logoUploadInput = document.getElementById('logoUpload');
const classesSelectMenuEl = document.getElementById('classesSelectMenu');
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
const openAddClassBtnMenu = document.getElementById('openAddClassBtnMenu');
const openEditClassBtnMenu = document.getElementById('openEditClassBtnMenu');
const deleteClassQuickBtnMenu = document.getElementById('deleteClassQuickBtnMenu');
const exportCSVBtn = document.getElementById('exportCSVBtn');
const btnPreencherPresenca = document.getElementById('btnPreencherPresenca');
const btnGerarRelatorio = document.getElementById('btnGerarRelatorio');
const btnVoltarMenu = document.getElementById('btnVoltarMenu');
const btnVoltarMenuRelatorio = document.getElementById('btnVoltarMenuRelatorio');
const btnPeriodoSemanal = document.getElementById('btnPeriodoSemanal');
const btnPeriodoMensal = document.getElementById('btnPeriodoMensal');
const periodoSemanalConfig = document.getElementById('periodoSemanalConfig');
const periodoMensalConfig = document.getElementById('periodoMensalConfig');
const semanaInput = document.getElementById('semanaInput');
const mesInput = document.getElementById('mesInput');
const btnGerarRelatorioFinal = document.getElementById('btnGerarRelatorioFinal');
const relatorioResultado = document.getElementById('relatorioResultado');
const relatorioConteudo = document.getElementById('relatorioConteudo');
const exportRelatorioBtn = document.getElementById('exportRelatorioBtn');

// UTILIDADES
function showMessage(message, type = 'success') {
    messageTextEl.textContent = message;
    messageToast.classList.remove('bg-green-500', 'bg-red-500', 'bg-blue-500');
    if (type === 'error') messageToast.classList.add('bg-red-500');
    else if (type === 'info') messageToast.classList.add('bg-blue-500');
    else messageToast.classList.add('bg-green-500');
    messageToast.classList.remove('hidden');
    messageToast.classList.add('flex', 'opacity-100');
    setTimeout(() => closeMessage(), 4000);
}

function closeMessage() {
    messageToast.classList.add('opacity-0');
    setTimeout(() => messageToast.classList.add('hidden'), 300);
}

function handleLogoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        logoImg.src = e.target.result;
        showMessage('Logo atualizada!', 'info');
    };
    reader.readAsDataURL(file);
}

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
    }
    studentListFileEl.value = '';
    addClassModal.classList.remove('hidden');
    addClassModal.classList.add('flex');
}

function hideClassModal() {
    addClassModal.classList.add('hidden');
    classNameInputEl.value = '';
    studentListInputEl.value = '';
    studentListFileEl.value = '';
    handleClassSelectionMenu(classesSelectMenuEl.value);
}

function handleStudentListFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const names = e.target.result.split(/\r?\n/).map(n => n.trim()).filter(n => n.length > 0);
        studentListInputEl.value = names.join('\n');
        if (!classNameInputEl.value.trim()) {
            classNameInputEl.value = file.name.replace(/\.txt$/i, '');
        }
        showMessage(`${names.length} alunos carregados do arquivo`, 'info');
    };
    reader.readAsText(file);
}

// FIREBASE / FIRESTORE
function getClassCollectionPath() {
    return userId ? `users/${userId}/classes` : null;
}

function getFrequencyCollectionPath(classId) {
    return classId ? `${getClassCollectionPath()}/${classId}/frequency_records` : null;
}

function setupClassesListener() {
    const classesPath = getClassCollectionPath();
    if (!classesPath) return;
    const q = query(collection(db, classesPath));
    onSnapshot(q, (snapshot) => {
        currentClasses = [];
        snapshot.forEach((doc) => currentClasses.push({ id: doc.id, ...doc.data() }));
        updateClassSelects();
    }, (error) => {
        console.error("Erro ao ouvir turmas:", error);
        showMessage("Erro ao carregar turmas: " + error.message, 'error');
    });
}

async function saveClass() {
    const className = classNameInputEl.value.trim();
    const studentList = studentListInputEl.value.trim();
    if (!className || !studentList) {
        showMessage("Preencha o nome da turma e a lista de alunos.", 'error');
        return;
    }
    const students = studentList.split('\n').map(n => n.trim()).filter(n => n.length > 0);
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
            await setDoc(doc(db, classesPath, currentClassId), classData);
            showMessage(`Turma "${className}" atualizada!`);
        } else {
            const newDocRef = await addDoc(collection(db, classesPath), classData);
            showMessage(`Turma "${className}" adicionada!`);
            currentClassId = newDocRef.id;
            classesSelectMenuEl.value = newDocRef.id;
        }
        hideClassModal();
    } catch (error) {
        console.error("Erro ao salvar turma:", error);
        showMessage("Erro ao salvar turma: " + error.message, 'error');
    }
}

async function deleteClass() {
    if (!currentClassId) return;
    if (!confirm(`Excluir a turma "${classNameInputEl.value.trim()}" e todos os registros? IRREVERSÍVEL!`)) return;
    const classesPath = getClassCollectionPath();
    if (!classesPath) return;
    try {
        const frequencyPath = getFrequencyCollectionPath(currentClassId);
        const snapshot = await getDocs(query(collection(db, frequencyPath)));
        await Promise.all(snapshot.docs.map(d => deleteDoc(doc(db, frequencyPath, d.id))));
        await deleteDoc(doc(db, classesPath, currentClassId));
        showMessage(`Turma excluída com sucesso!`);
        currentClassId = null;
        currentClassData = null;
        hideClassModal();
    } catch (error) {
        console.error("Erro ao excluir turma:", error);
        showMessage("Erro ao excluir turma: " + error.message, 'error');
    }
}

async function loadFrequencyForDate(classId, dateString) {
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
        const pontualidade = item.querySelector('.pontualidade-select')?.value || "não observado";
        const harmonia = item.querySelector('.harmonia-select')?.value || "não observado";
        const participacao = item.querySelector('.participacao-select')?.value || "não observado";
        records[name] = {
