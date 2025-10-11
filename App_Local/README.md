# 📊 Sistema de Registro de Frequência e Observações (Local/HTML)

Este é um aplicativo web simples e de página única (SPA) desenvolvido em **HTML, CSS e JavaScript puro** para facilitar o registro rápido de frequência e observações pedagógicas de alunos por turma.

O foco é na **persistência de dados local no navegador (Local Storage)**, garantindo a **usabilidade offline**, e na geração de relatórios estruturados para posterior análise ou importação de dados.

# 💾 Armazenamento e Acesso

A aplicação utiliza o **Armazenamento Local (Local Storage)** do seu navegador para salvar todas as turmas e registros de frequência, permitindo que você retome seu trabalho mesmo após fechar a página.

> **Importante:** Os dados ficam salvos apenas no navegador que você está utilizando. Limpar o histórico ou o cache do navegador pode apagar todas as informações salvas.

## ✨ Funcionalidades Principais

* **Registro de Presença:** Marcação simples de "Presente" ou "Falta" por aluno.
* **Observações Pedagógicas:** Campos para registrar "Participação", "Harmonia" e "Pontualidade".
* **Gestão de Turmas:**
    * Criação, Edição e Exclusão de Turmas.
    * Carregamento de listas de alunos via arquivo `.txt` ou inserção manual.
* **Geração de Relatórios:** Geração de relatórios de frequência por período (**Semanal** ou **Mensal**), incluindo total de faltas e presenças (elementos para relatório por semana e mês foram identificados no script).
* **Exportação de Dados:** Exportação dos dados de frequência (relatórios ou dados brutos) em formato de texto estruturado (`.txt`).

## 🛠️ Como Utilizar (Localmente)

Por ser um projeto puramente HTML/CSS/JS, não requer servidor ou instalação de dependências:

1.  Mantenha os arquivos **`frequencia_alunos_local.html`**, **`frequencia_alunos_local_script.js`** e **`frequencia_alunos_local_styles.css`** na mesma pasta.
2.  Abra o arquivo **`frequencia_alunos_local.html`** diretamente no seu navegador (Chrome, Firefox, Edge, etc.).
3.  O sistema estará pronto para uso offline, salvando automaticamente seus dados.

---

**Nota sobre o link:** Eu removi o link específico para o GitHub Pages que estava no README anterior, pois o nome do arquivo HTML mudou de `frequencia_alunos.html` para `frequencia_alunos_local.html`, e não tenho como confirmar a nova URL de deploy. Se o projeto estiver ativo em um novo link, basta adicioná-lo no lugar da seção `# 🚀 Acesso ao Projeto` que foi removida.