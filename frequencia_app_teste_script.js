// Importações do Firebase SDK v11 (mínimo necessário)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, collection, query, onSnapshot, addDoc, getDocs, where, limit, updateDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { setLogLevel } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";

// Configurações Globais (Fornecidas pelo ambiente Canvas)
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// setLogLevel('debug'); // Descomente para ver logs detalhados do Firebase

// Variáveis de Estado Global
let app, db, auth;
let userId = null;
let classes = []; // Cache das turmas
let currentRoster = []; // Lista de alunos da turma selecionada
let currentClassId = null;

// Referências DOM
const loadingEl = document.getElementById('loading');
const appContentEl = document.getElementById('appContent');
const userIdDisplayEl = document.getElementById('userIdDisplay');
const classSelectEl = document.getElementById('classSelect');
const attendanceSectionEl = document.getElementById('attendanceSection');
const currentClassNameEl = document.getElementById('currentClassName');
const studentListContainerEl = document.getElementById('studentListContainer');
const saveAttendanceBtn = document.getElementById('saveAttendanceBtn');
const exportDataBtn = document.getElementById('exportDataBtn');
const loadClassBtn = document.getElementById('loadClassBtn');
const classErrorEl = document.getElementById('classError');

// Refs do Modal de Mensagem
const messageBox = document.getElementById('messageBox');
const messageTitle = document.getElementById('messageTitle');
const messageText = document.getElementById('messageText');
const closeMessageBtn = document.getElementById('closeMessageBtn');

// Refs do Modal Adicionar Turma
const addClassModal = document.getElementById('addClassModal');
const showAddClassModalBtn = document.getElementById('showAddClassModalBtn');
const cancelAddClassBtn = document.getElementById('cancelAddClassBtn');
const saveClassBtn = document.getElementById('saveClassBtn');
const classNameInput = document.getElementById('classNameInput');
const studentListInput = document.getElementById('studentListInput');

// --- Funções de UI e Utilidade ---

/**
 * Exibe uma mensagem de feedback para o usuário.
 * @param {string} title 
 * @param {string} text 
 */
function showMessage(title, text) {
    messageTitle.textContent = title;
    messageText.textContent = text;
    messageBox.classList.remove('hidden');
    messageBox.classList.add('flex');
}

closeMessageBtn.addEventListener('click', () => {
    messageBox.classList.add('hidden');
    messageBox.classList.remove('flex');
});

/**
 * Mostra ou esconde o modal de Adicionar Turma.
 * @param {boolean} show 
 */
function toggleAddClassModal(show) {
    if (show) {
        addClassModal.classList.remove('hidden');
        addClassModal.classList.add('flex');
    } else {
        addClassModal.classList.add('hidden');
        addClassModal.classList.remove('flex');
    }
}

showAddClassModalBtn.addEventListener('click', () => toggleAddClassModal(true));
cancelAddClassBtn.addEventListener('click', () => toggleAddClassModal(false));

/**
 * Renderiza a lista de turmas no dropdown e atualiza o estado `classes`.
 * @param {Array} classList 
 */
function renderClasses(classList) {
    classes = classList; // Atualiza o cache
    classSelectEl.innerHTML = '<option value="">-- Selecione uma Turma --</option>';
    classList.forEach(cls => {
        const option = document.createElement('option');
        option.value = cls.id;
        option.textContent = cls.name;
        classSelectEl.appendChild(option);
    });

    // Restaura a seleção anterior, se houver
    if (currentClassId) {
        classSelectEl.value = currentClassId;
    }
}

/**
 * Renderiza a lista de alunos para registro de presença.
 */
function renderRoster() {
    studentListContainerEl.innerHTML = '';

    if (currentRoster.length === 0) {
        studentListContainerEl.innerHTML = '<p class="text-gray-500 text-center py-4">Nenhum aluno cadastrado nesta turma.</p>';
        return;
    }

    const ul = document.createElement('ul');
    ul.className = 'divide-y divide-gray-200';

    currentRoster.forEach(student => {
        const li = document.createElement('li');
        li.className = 'flex justify-between items-center p-3 hover:bg-indigo-50 transition duration-100';
        li.innerHTML = `
            <span class="text-gray-800 flex-grow">${student.name}</span>
            <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" data-student-id="${student.id}" class="sr-only peer presence-checkbox">
                <div class="w-11 h-6 bg-red-400 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                <span class="ml-3 text-sm font-medium text-gray-700">Presente</span>
            </label>
        `;
        ul.appendChild(li);
    });
    studentListContainerEl.appendChild(ul);

    saveAttendanceBtn.disabled = false;
}

// --- Funções de Banco de Dados (Firestore) ---

/**
 * Retorna a referência da coleção base do usuário.
 * @param {string} collectionName 
 * @returns {object} Referência da coleção.
 */
function getUserCollection(collectionName) {
    if (!db || !userId) throw new Error("Database not initialized or User ID missing.");
    // Usamos a coleção privada do usuário: /artifacts/{appId}/users/{userId}/{collectionName}
    return collection(db, `artifacts/${appId}/users/${userId}/${collectionName}`);
}

/**
 * Inicia o listener em tempo real para as Turmas do usuário.
 */
function setupClassesListener() {
    const q = query(getUserCollection('classes'));
    onSnapshot(q, (snapshot) => {
        const classList = [];
        snapshot.forEach((doc) => {
            classList.push({ id: doc.id, ...doc.data() });
        });
        renderClasses(classList);
    }, (error) => {
        console.error("Erro ao carregar turmas:", error);
        showMessage("Erro de Carregamento", "Não foi possível carregar as turmas do banco de dados.");
    });
}

/**
 * Adiciona uma nova turma ao banco de dados.
 */
async function addNewClass() {
    const className = classNameInput.value.trim();
    const studentListText = studentListInput.value.trim();

    if (!className || !studentListText) {
        showMessage("Campos Vazios", "Por favor, preencha o nome da turma e a lista de alunos.");
        return;
    }

    try {
        // 1. Processa a lista de alunos
        const students = studentListText.split('\n')
            .map(name => name.trim())
            .filter(name => name.length > 0)
            .map(name => ({
                // Cria um ID único simples para cada aluno
                id: crypto.randomUUID(),
                name: name
            }));

        if (students.length === 0) {
            showMessage("Lista Vazia", "A lista de alunos não pode estar vazia.");
            return;
        }

        // 2. Salva a turma no Firestore
        await addDoc(getUserCollection('classes'), {
            name: className,
            // É melhor armazenar a lista de alunos diretamente aqui para simplicidade
            students: students,
            createdAt: new Date().toISOString()
        });

        toggleAddClassModal(false);
        classNameInput.value = '';
        studentListInput.value = '';
        showMessage("Sucesso!", `A turma "${className}" foi salva no banco de dados.`);

    } catch (error) {
        console.error("Erro ao salvar a turma:", error);
        showMessage("Erro ao Salvar", "Não foi possível salvar a nova turma. Tente novamente.");
    }
}

saveClassBtn.addEventListener('click', addNewClass);


/**
 * Carrega a lista de alunos da turma selecionada.
 */
loadClassBtn.addEventListener('click', () => {
    currentClassId = classSelectEl.value;
    classErrorEl.classList.add('hidden');

    if (!currentClassId) {
        classErrorEl.classList.remove('hidden');
        attendanceSectionEl.classList.add('hidden');
        return;
    }

    const selectedClass = classes.find(c => c.id === currentClassId);
    if (selectedClass) {
        currentRoster = selectedClass.students || [];
        currentClassNameEl.textContent = selectedClass.name;
        document.getElementById('attendanceDate').valueAsDate = new Date(); // Data atual

        renderRoster();
        attendanceSectionEl.classList.remove('hidden');
        exportDataBtn.disabled = false;
    } else {
        showMessage("Erro", "Turma selecionada não encontrada.");
    }
});

/**
 * Salva o registro de frequência atual no Firestore.
 */
async function saveAttendance() {
    if (!currentClassId) {
        showMessage("Aviso", "Nenhuma turma selecionada para salvar.");
        return;
    }

    const date = document.getElementById('attendanceDate').value;
    if (!date) {
        showMessage("Aviso", "Selecione uma data para o registro.");
        return;
    }

    const checkboxes = document.querySelectorAll('.presence-checkbox');
    const records = Array.from(checkboxes).map(checkbox => ({
        studentId: checkbox.dataset.studentId,
        present: checkbox.checked
    }));

    // Usamos a data e o ID da turma para criar um ID único para o registro
    const docId = `${currentClassId}_${date}`;

    try {
        await setDoc(doc(getUserCollection('attendance_records'), docId), {
            classId: currentClassId,
            date: date,
            records: records,
            savedAt: new Date().toISOString(),
            className: currentClassNameEl.textContent
        });
        showMessage("Sucesso!", `Frequência de ${date} salva para a turma ${currentClassNameEl.textContent}.`);
    } catch (error) {
        console.error("Erro ao salvar frequência:", error);
        showMessage("Erro ao Salvar", "Não foi possível salvar o registro de frequência.");
    }
}

saveAttendanceBtn.addEventListener('click', saveAttendance);


/**
 * Exporta os dados de frequência da turma selecionada para CSV.
 */
async function exportData() {
    if (!currentClassId) {
        showMessage("Aviso", "Nenhuma turma selecionada para exportação.");
        return;
    }

    exportDataBtn.disabled = true;

    try {
        // 1. Recupera todos os registros de presença para esta turma
        const q = query(getUserCollection('attendance_records'), where('classId', '==', currentClassId));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            showMessage("Exportação", "Nenhum registro de frequência encontrado para esta turma.");
            exportDataBtn.disabled = false;
            return;
        }

        const attendanceHistory = snapshot.docs.map(doc => doc.data());
        const className = currentClassNameEl.textContent;

        // 2. Cria o cabeçalho CSV: Data, Nome do Aluno 1, Nome do Aluno 2, ...
        const studentNames = currentRoster.map(s => s.name);
        let csvContent = "Data;" + studentNames.join(";") + "\n";

        // 3. Preenche as linhas de dados
        attendanceHistory.forEach(record => {
            // Mapeia os IDs dos alunos para seus status de presença
            const presenceMap = record.records.reduce((map, r) => {
                map[r.studentId] = r.present ? 'P' : 'F'; // P=Presente, F=Falta
                return map;
            }, {});

            // Cria a linha para a data
            let row = record.date;
            currentRoster.forEach(student => {
                // Garante que a ordem das colunas de presença corresponda à ordem dos nomes
                row += ";" + (presenceMap[student.id] || 'N/D'); // N/D = Não Definido
            });
            csvContent += row + "\n";
        });

        // 4. Cria e dispara o download do arquivo CSV
        const filename = `${className.replace(/[^a-z0-9]/gi, '_')}_Frequencia_Export.csv`;
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");

        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showMessage("Exportação Concluída", `O arquivo CSV "${filename}" foi baixado com sucesso.`);
        } else {
            // Fallback para navegadores que não suportam 'download' (raros hoje)
            showMessage("Aviso", "Seu navegador pode não suportar download direto. Copie o conteúdo da console se necessário.");
            console.log("Conteúdo CSV:\n", csvContent);
        }

    } catch (error) {
        console.error("Erro na Exportação:", error);
        showMessage("Erro de Exportação", "Ocorreu um erro ao gerar ou baixar o arquivo CSV.");
    } finally {
        exportDataBtn.disabled = false;
    }
}

exportDataBtn.addEventListener('click', exportData);


// --- Inicialização da Aplicação ---

/**
 * Inicializa o Firebase e realiza a autenticação.
 */
async function initializeAppAndAuth() {
    try {
        if (Object.keys(firebaseConfig).length === 0) {
             throw new Error("Configuração do Firebase não encontrada. Verifique as variáveis de ambiente.");
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
        loadingEl.innerHTML = `<span class="text-red-600">Erro de Inicialização: ${error.message}.</span>`;
    }
}

initializeAppAndAuth();
