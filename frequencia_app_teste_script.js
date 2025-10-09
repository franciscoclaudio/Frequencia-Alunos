// Importações do Firebase SDK v11 (JavaScript)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, collection, query, onSnapshot, addDoc, getDoc, getDocs, where, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { setLogLevel } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";

// Importações do Firebase Storage ADICIONADAS AQUI
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";

// Ativa o log de debug para o Firestore
setLogLevel('Debug');

// Configurações Globais (Mantenha as variáveis injetadas se for usar o Canvas novamente, ou defina-as)
const appId = 'default-app-id'; // Defina um ID padrão se não estiver no Canvas
const initialAuthToken = null;

// --- CONFIGURAÇÃO FIREBASE ---
let firebaseConfig = {
    // ESTA CHAVE DEVE SER SUBSTITUÍDA PELA SUA PRÓPRIA CHAVE DO FIREBASE
    apiKey: "SUA_API_KEY_AQUI", // Exemplo: "AIzaSyDo6uA_fJGbKqLfj9kwUu1JSkC34HGlWk0"
    authDomain: "SEU_PROJETO.firebaseapp.com",
    projectId: "SEU_PROJETO",
    storageBucket: "SEU_PROJETO.appspot.com", // IMPORTANTE: O storageBucket deve ser configurado
    messagingSenderId: "SEU_SENDER_ID",
    appId: "SEU_APP_ID_WEB"
};


// Variáveis de Estado do Aplicativo
let app;
let db;
let auth;
let storage; // Instância do Storage
let userId = null;
let currentClasses = [];
let currentClassId = null;
let currentRoster = [];
let currentAttendanceRecord = {}; // { studentName: boolean }
let currentLogoFile = null; // Para armazenar o arquivo de imagem selecionado


// Referências ao DOM (Algumas foram movidas ou renomeadas)
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

// Referências DOM para Logo ADICIONADAS AQUI
const mainLogoEl = document.getElementById('mainLogo');
const logoUploadInput = document.getElementById('logoUploadInput');
const logoPreviewEl = document.getElementById('logoPreview');
const currentLogoMessageEl = document.getElementById('currentLogoMessage');


// --- FUNÇÕES DE UTILIDADE ---

/**
 * Exibe uma mensagem de toast/modal personalizada.
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
 * Define o logo principal na interface.
 */
function setMainLogo(url) {
    if (url) {
        mainLogoEl.src = url;
    } else {
        // Logo padrão (placeholder)
        mainLogoEl.src = "https://placehold.co/120x120/4f46e5/ffffff?text=LOGO";
    }
}

/**
 * Pré-visualiza a imagem no modal. (Lógica de preview de frequencia_alunos.html)
 */
function previewLogo(event) {
    const file = event.target.files[0];
    currentLogoFile = file; // Salva o arquivo no estado global
    
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            logoPreviewEl.src = e.target.result;
            logoPreviewEl.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
        currentLogoMessageEl.textContent = `Novo arquivo: ${file.name}`;
    } else {
        // Se o usuário cancelou a seleção, tenta manter o logo atual na preview, se for edição
        if (saveClassBtn.dataset.classId) {
             // A lógica de preview em edição é tratada em openClassModal, aqui apenas limpamos o arquivo
             currentLogoFile = null;
             currentLogoMessageEl.textContent = "Logo atual mantida. Selecione um novo arquivo para substituir.";
        } else {
            logoPreviewEl.src = '';
            logoPreviewEl.classList.add('hidden');
            currentLogoMessageEl.textContent = 'Selecione uma logo (opcional) para a nova turma.';
        }
    }
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
 */
function renderClassesSelect(classes) {
    classSelectEl.innerHTML = ''; // Limpa as opções existentes
    classSelectEl.disabled = false;
    editClassBtn.disabled = true;
    setMainLogo(null); // Reseta o logo principal ao recarregar a lista

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

    // Se uma turma estava selecionada, tenta re-selecioná-la
    if (currentClassId) {
        const selectedClass = classes.find(c => c.id === currentClassId);
        if (selectedClass) {
            classSelectEl.value = currentClassId;
            editClassBtn.disabled = false;
            loadRosterBtn.disabled = false;
            // Carrega o logo da turma selecionada
            if (selectedClass.logoUrl) {
                setMainLogo(selectedClass.logoUrl);
            }
        } else {
            // Se a turma foi deletada, reseta a seleção
            currentClassId = null;
            classSelectEl.value = "";
            rosterContainerEl.classList.add('hidden');
        }
    }
}

/**
 * Renderiza a lista de alunos para a chamada.
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
                <div class="relative w-11 h-6 bg-gray-200 rounded-full peer-focus:ring-2 peer-focus:ring-primary peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:border-gray-300 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500 transition-colors duration-300"></div>
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
 * Faz o upload da imagem para o Firebase Storage e retorna a URL pública.
 * (Lógica de upload de imagem)
 */
async function uploadLogoToStorage(file, classId) {
    if (!storage || !userId) {
        throw new Error("Storage ou Usuário não inicializado.");
    }
    
    // Caminho no Storage: images/{userId}/{classId}_logo
    const storageRef = ref(storage, `images/${userId}/${classId}_logo`);

    // Faz o upload do arquivo
    const snapshot = await uploadBytes(storageRef, file);
    
    // Obtém a URL pública
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
}


/**
 * Listener que carrega todas as turmas do Firestore em tempo real.
 */
function setupClassesListener() {
    const classesRef = getClassesCollectionRef();
    if (!classesRef) return;

    onSnapshot(classesRef, (snapshot) => {
        currentClasses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderClassesSelect(currentClasses);

    }, (error) => {
        console.error("Erro ao carregar turmas:", error);
        showMessage("Erro de Conexão", "Não foi possível carregar as turmas. Verifique sua conexão e regras do Firebase.");
    });
}

/**
 * Salva ou atualiza a definição de uma turma no Firestore.
 */
async function saveClassBase(className, studentRoster, docId = null) {
    const classesRef = getClassesCollectionRef();
    if (!classesRef) {
        showMessage("Erro", "Usuário não autenticado.");
        return;
    }
    
    // Desabilita o botão para evitar cliques duplos durante o upload
    saveClassBtn.disabled = true;

    try {
        let classDocRef;
        let finalClassId;
        let logoUrl = null;

        if (docId) {
            // MODO EDIÇÃO
            classDocRef = doc(classesRef, docId);
            finalClassId = docId;
            const currentData = currentClasses.find(c => c.id === docId);
            if (currentData) logoUrl = currentData.logoUrl; // Mantém a URL existente se não houver novo upload
        } else {
            // MODO NOVO: Cria um ID antes de salvar para usar no Storage
            classDocRef = doc(classesRef); 
            finalClassId = classDocRef.id;
        }

        // 1. Upload da Logo, se houver um novo arquivo
        if (currentLogoFile) {
            showMessage("Aguarde", "Carregando a nova logo para o servidor...");
            logoUrl = await uploadLogoToStorage(currentLogoFile, finalClassId);
        }
        
        // 2. Preparação dos Dados da Turma
        const classData = {
            name: className,
            roster: studentRoster,
            logoUrl: logoUrl, // Adiciona a URL do logo
            updatedAt: new Date().toISOString()
        };
        
        if (!docId) {
             classData.createdAt = new Date().toISOString();
        }

        // 3. Salva ou Atualiza o Documento no Firestore
        await setDoc(classDocRef, classData, { merge: true });

        const successMessage = docId ? 
            `Turma '${className}' atualizada com sucesso.` : 
            `Nova turma '${className}' adicionada com sucesso.`;

        showMessage("Sucesso", successMessage);

    } catch (error) {
        console.error("Erro ao salvar turma:", error);
        showMessage("Erro ao Salvar", `Não foi possível salvar a turma. Detalhes: ${error.message}. Verifique se o Firebase Storage está ativado e as regras de segurança permitem uploads.`);
    } finally {
        // Reseta o estado do modal e habilita o botão
        saveClassBtn.disabled = false;
        addClassModal.classList.add('hidden');
        currentLogoFile = null; // Limpa o arquivo de logo após o uso
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
    
    // Atualiza o logo principal ao carregar a lista
    setMainLogo(selectedClass.logoUrl);

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
    // Substituindo confirm() por showMessage() para rodar em IFrames/Canvas
    const confirmation = window.prompt(`Confirme a exclusão: Digite o nome da turma ("${className}") para EXCLUIR permanentemente. Isso removerá a base de dados desta turma.`)
    
    if (confirmation !== className) {
        if (confirmation !== null) {
            showMessage("Atenção", "O nome digitado não corresponde. Exclusão cancelada.");
        }
        return;
    }
    
    try {
        // 1. Deleta o documento da turma base
        const classDocRef = doc(getClassesCollectionRef(), classId);
        await deleteDoc(classDocRef);

        // 2. (OPCIONAL) O código não deleta os registros de frequência associados aqui.

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
 */
function openClassModal(isEdit = false) {
    // Reseta o estado do logo e do arquivo
    logoUploadInput.value = '';
    logoPreviewEl.src = '';
    logoPreviewEl.classList.add('hidden');
    currentLogoFile = null;

    if (isEdit) {
        const selectedClass = currentClasses.find(c => c.id === classSelectEl.value);
        if (!selectedClass) return;

        modalTitleEl.textContent = "Editar Turma Base";
        classNameInputEl.value = selectedClass.name;
        studentListInputEl.value = selectedClass.roster.join('\n');
        saveClassBtn.dataset.classId = selectedClass.id;
        deleteClassBtn.classList.remove('hidden');
        
        // Exibe o logo atual, se existir
        if (selectedClass.logoUrl) {
            logoPreviewEl.src = selectedClass.logoUrl;
            logoPreviewEl.classList.remove('hidden');
            currentLogoMessageEl.textContent = "Logo atual carregada. Selecione um novo arquivo para substituir.";
        } else {
            currentLogoMessageEl.textContent = "Nenhuma logo atual. Selecione um arquivo para adicionar.";
        }

    } else {
        modalTitleEl.textContent = "Adicionar Nova Turma Base";
        classNameInputEl.value = '';
        studentListInputEl.value = '';
        saveClassBtn.dataset.classId = '';
        deleteClassBtn.classList.add('hidden');
        currentLogoMessageEl.textContent = "Selecione uma logo (opcional) para a nova turma.";
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

    // Eventos do Modal de Adicionar/Editar Turma
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
    
    // Evento de Upload de Logo ADICIONADO AQUI
    logoUploadInput.addEventListener('change', previewLogo);


    // Eventos de Seleção
    classSelectEl.addEventListener('change', () => {
        currentClassId = classSelectEl.value;
        editClassBtn.disabled = !currentClassId;
        loadRosterBtn.disabled = !currentClassId;
        
        // Define o logo ao mudar a turma
        const selectedClass = currentClasses.find(c => c.id === currentClassId);
        setMainLogo(selectedClass ? selectedClass.logoUrl : null);

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
        if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "SUA_API_KEY_AQUI") {
            throw new Error("Por favor, configure sua chave de API do Firebase.");
        }

        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        storage = getStorage(app); // Inicializa o Firebase Storage

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
