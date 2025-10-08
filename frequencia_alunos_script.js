
  let studentList = [];

    const classes = {
        'Turma 10C PE (37 Alunos)': [
            "Maria Eduarda de Almeida Custódio", "Maria Isabel da Penha Marques", "Mariana Marques da Silva", 
            "MATEUS RAMGUND PEREIRA", "Mavana Priscila de Oliveira", "RAYSSA DE PAULA ALMEIDA NEPOMUCENO", 
            "Sophia Maria Lima da Costa", "Stela Magela Valdete da Silva", "Tupinangé João Caboclo Da Silva", 
            "Vinicius Franco da Silva", "Washington Luiz Dantas Júnior", "Anny Monique Arcanjo Rocha", 
            "Antonio Francisco Gama Neto", "Demétrius Vinícius Ferreira da Silva", "Diêgo Claudiano da Silva", 
            "Edvania chaves de Araujo", "Matheus Alves Cruz da Silva", "Rebeka Raiany Barbosa dos Santos", 
            "Rodrigo Barros Mendes da Silva", "Thatiane Cavalcanti Alves", "Natália Pimenta Da franca", 
            "Isabela Dias Albuquerque", "Daylane Duarte", "Jessica Santos", "JOSENILDA Teodoro da Costa", 
            "Thiago Valença de Melo", "Erica Flavia Almeida gomes", "Evellyn Mayara da Silva Ramalho", 
            "Francisco Cláudio Almeida da Silva Junior", "gabriel vinicius soares de lima", "Guilherme Guimarães da Silva Aires",
            "Isabela Garcia Menezes", "Isabelly Victória Nascimento dos Santos", "Jefferson Fernandes Souza do Nascimento", 
            "JULIANA MARIA DA SILVA DO NASCIMENTO", "Luiz Fellipe Bezerra da Silva"
        ],
    };

    window.onload = function() {
        const select = document.getElementById('turmasSelect');
        
        for (const className in classes) {
            if (select.querySelector(`option[value="${className}"]`)) {
                continue;
            }
            const option = document.createElement('option');
            option.value = className;
            option.textContent = className;
            const novaTurmaOption = select.querySelector('option[value="NOVA_TURMA_UPLOAD"]');
            select.insertBefore(option, novaTurmaOption);
        }
        
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('dataAula').value = today;
    };
    
    function toggleUploadBlock(selectedValue) {
        const uploadBlock = document.getElementById('uploadBlockContainer');
        const alunosContainer = document.getElementById('alunosContainer');
        
        if (selectedValue === 'NOVA_TURMA_UPLOAD') {
            uploadBlock.style.display = 'flex';
            alunosContainer.innerHTML = '<p>Selecione o arquivo da turma (.txt) para carregar a lista de alunos.</p>';
            studentList = [];
        } else {
            uploadBlock.style.display = 'none';
        }
    }

    function gerarCampoAluno(nomeAluno, idIndex) {
        const id = idIndex; 
        
        return `
            <fieldset id="aluno${id}">
                <legend><b>${nomeAluno}</b></legend> 
                <div class="aluno-field-group">
                    <div class="field-row">
                        <label>Frequência:</label>
                        <input type="radio" id="presente${id}" name="frequencia${id}" value="Presente" required>
                        <label for="presente${id}">Presente</label>
                        <input type="radio" id="falta${id}" name="frequencia${id}" value="Falta" required>
                        <label for="falta${id}">Falta</label>
                    </div>
            
                    <div class="field-row">
                        <label for="participacao${id}">Participação:</label>
                        <select id="participacao${id}" name="participacao${id}">
                            <option value="Muito Participativo">Muito Participativo</option>
                            <option value="Participativo" selected>Participativo</option>
                            <option value="Pouco Participativo">Pouco Participativo</option>
                        </select>
                    </div>
            
                    <div class="field-row">
                        <label for="harmonia${id}">Harmonia:</label>
                        <select id="harmonia${id}" name="harmonia${id}">
                            <option value="Muito Boa">Muito Boa</option>
                            <option value="Boa" selected>Boa</option>
                            <option value="Ruim">Ruim</option>
                        </select>
                    </div>
            
                    <div class="field-row">
                        <label for="pontualidade${id}">Pontualidade:</label>
                        <select id="pontualidade${id}" name="pontualidade${id}">
                            <option value="Pontual">Pontual</option>
                            <option value="Levemente atrasado" selected>Levemente atrasado</option>
                            <option value="Muito atrasado">Muito atrasado</option>
                        </select>
                    </div>
                </div>
            </fieldset>
        `;
    }

    function carregarAlunosNoContainer(nomes, className) {
        studentList = nomes;
        const container = document.getElementById('alunosContainer');
        container.innerHTML = '';

        if (nomes.length === 0) {
            container.innerHTML = '<p>Nenhum aluno nesta turma.</p>';
            document.getElementById('resultado').textContent = `Turma ${className} carregada, mas a lista está vazia.`;
            return;
        }

        let htmlCampos = '';
        nomes.forEach((nome, index) => {
            htmlCampos += gerarCampoAluno(nome, index + 1); 
        });
        
        container.innerHTML = htmlCampos;
        document.getElementById('resultado').textContent = `${className} carregada com sucesso!`;
    }

    function carregarTurmaSelecionada(className) {
        if (className === 'NOVA_TURMA_UPLOAD') { 
            document.getElementById('resultado').textContent = '';
            return;
        }

        if (!className) {
            document.getElementById('alunosContainer').innerHTML = '<p>Selecione ou carregue uma turma para iniciar a chamada.</p>';
            studentList = [];
            document.getElementById('resultado').textContent = '';
            return;
        }

        const nomes = classes[className] || [];
        carregarAlunosNoContainer(nomes, className);
    }

    function processarListaAlunos(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const fileName = file.name.replace(/\.txt$/i, '');

        const reader = new FileReader();
        reader.onload = function(e) {
            const fileContent = e.target.result;
            const nomes = fileContent.split(/\r?\n/).map(name => name.trim()).filter(name => name.length > 0);
            
            const className = `[NOVA] ${fileName} (${nomes.length} Alunos)`;
            classes[className] = nomes;

            const select = document.getElementById('turmasSelect');
            let existingOption = select.querySelector(`option[value="${className}"]`);
            if (!existingOption) {
                existingOption = document.createElement('option');
                existingOption.value = className;
                existingOption.textContent = className;
                const novaTurmaOption = select.querySelector('option[value="NOVA_TURMA_UPLOAD"]');
                select.insertBefore(existingOption, novaTurmaOption);
            }
            
            select.value = className;
            
            toggleUploadBlock(className); 

            carregarAlunosNoContainer(nomes, className);
            
            document.getElementById('listaAlunosUpload').value = ''; 
        };
        reader.readAsText(file);
    }

    function previewImage(event, targetId) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById(targetId).src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
    
    function formatarDadosParaTXT(dados) {
        const className = document.getElementById('turmasSelect').value || 'Turma Nao Selecionada';
        let texto = `REGISTRO DE FREQUÊNCIA E OBSERVAÇÕES - ${className}\n`;
        texto += `------------------------------------------\n`;
        texto += `Data da Aula: ${dados.data}\n\n`;

        dados.alunos.forEach((aluno, index) => {
            texto += `ALUNO: ${aluno.nome}\n`;
            texto += `  Frequência: ${aluno.frequencia}\n`;
            texto += `  Participação: ${aluno.participacao}\n`;
            texto += `  Harmonia: ${aluno.harmonia}\n`;
            texto += `  Pontualidade: ${aluno.pontualidade}\n`;
            if (index < dados.alunos.length - 1) {
                texto += `\n`;
            }
        });

        return texto;
    }

    function coletarDados() {
        if (studentList.length === 0) {
            alert("Por favor, selecione ou carregue uma turma antes de submeter.");
            return;
        }

        const dados = {
            data: document.getElementById('dataAula').value,
            alunos: []
        };

        if (!dados.data) {
            alert("Por favor, preencha a data da aula.");
            return;
        }

        let todosPreenchidos = true;
        const className = document.getElementById('turmasSelect').value || 'CUSTOM';

        studentList.forEach((nomeAluno, index) => {
            const id = index + 1;
            const frequenciaInput = document.querySelector(`input[name="frequencia${id}"]:checked`);
            const participacaoSelect = document.getElementById(`participacao${id}`);
            const harmoniaSelect = document.getElementById(`harmonia${id}`);
            const pontualidadeSelect = document.getElementById(`pontualidade${id}`);
            
            if (!frequenciaInput) {
                todosPreenchidos = false;
                document.getElementById(`aluno${id}`).style.border = '2px solid red'; 
            } else {
                document.getElementById(`aluno${id}`).style.border = 'none';
            }


            dados.alunos.push({
                nome: nomeAluno, 
                frequencia: frequenciaInput ? frequenciaInput.value : 'NÃO PREENCHIDO',
                participacao: participacaoSelect ? participacaoSelect.value : 'N/A',
                harmonia: harmoniaSelect ? harmoniaSelect.value : 'N/A',
                pontualidade: pontualidadeSelect ? pontualidadeSelect.value : 'N/A'
            });
        });

        if (!todosPreenchidos) {
            alert("Por favor, preencha a frequência (Presente/Falta) para todos os alunos antes de submeter.");
            return;
        }
        
        const conteudoTxt = formatarDadosParaTXT(dados);
        const blob = new Blob([conteudoTxt], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const nomeArquivo = `Frequencia_${className.replace(/ /g, '_')}_${dados.data}.txt`;
        a.download = nomeArquivo;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        document.getElementById('resultado').textContent = `Arquivo '${nomeArquivo}' gerado com sucesso!`;
    }
