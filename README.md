# 📊 Sistema de Registro de Frequência e Observações (Local/HTML)

Este é um aplicativo web simples e de página única (SPA) desenvolvido em **HTML, CSS e JavaScript puro** para facilitar o registro rápido de frequência e observações pedagógicas de alunos por turma.

Para utilizá-lo clique aqui:

O foco é na **usabilidade offline** e na geração de um arquivo de texto estruturado (`.txt`) para posterior análise ou importação de dados.

## ✨ Funcionalidades Principais

* **Registro de Presença:** Marcação simples de "Presente" ou "Falta" por aluno.
* **Observações Pedagógicas:** Campos para registrar "Participação", "Harmonia" e "Pontualidade".
* **Gestão de Turmas:**
    * Carregamento de listas de alunos via arquivo `.txt`.
    * Opções de turmas pré-carregadas.
* **Exportação de Dados:** Ao submeter, o sistema gera e baixa automaticamente um arquivo `.txt` com todos os dados preenchidos, formatados por turma e data.
* **Interface Dinâmica:** O bloco de upload de novas turmas só é exibido quando a opção é selecionada no dropdown.

## 🛠️ Como Utilizar (Localmente)

Por ser um projeto puramente HTML/CSS/JS, não requer servidor ou instalação de dependências:

1.  **Clone o repositório** (ou baixe o arquivo `index.html` ou `Frequencia.html`).
2.  Abra o arquivo **diretamente no seu navegador** (Chrome, Firefox, Edge, etc.).
3.  O sistema estará pronto para uso offline.

### 📝 Formato de Arquivo de Turma (`.txt`)

Para carregar uma nova turma, o arquivo de texto (`.txt`) deve conter um nome de aluno por linha, sem numeração ou caracteres adicionais.

```txt
Nome do Aluno A
Nome do Aluno B
Nome do Aluno C
...
