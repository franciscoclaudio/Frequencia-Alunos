# 📝 Sistema de Registro de Frequência e Observações (SPA)

Este é um aplicativo web de **Página Única (SPA)**, desenvolvido com **HTML, CSS e JavaScript puros**, focado em otimizar o registro de frequência e observações pedagógicas dos alunos.

Seu principal diferencial é o foco na **usabilidade offline** e na geração de um arquivo de texto estruturado (`.txt`) para análise e importação posterior de dados.

## 🚀 Acesso e Demonstração

O projeto está hospedado no GitHub Pages e pode ser acessado diretamente:

🔗 **[Acesse a Aplicação Aqui](https://franciscoclaudio.github.io/Frequencia-Alunos/frequencia_alunos.html)**

---

## ✨ Funcionalidades Principais

* **Marcação de Presença:** Registro rápido de **Presente** ou **Falta** por aluno.
* **Observações Detalhadas:** Campos específicos para registrar **Participação**, **Harmonia** e **Pontualidade**.
* **Gestão Dinâmica de Turmas:**
    * Suporte a **turmas pré-carregadas**.
    * Capacidade de carregar novas listas de alunos via arquivo local (`.txt`).
* **Exportação de Dados (Offline):** Ao submeter, o sistema gera e baixa automaticamente um arquivo `.txt` com todos os registros formatados por **turma e data**.
* **Interface Limpa:** O bloco de upload de turmas é exibido de forma condicional, apenas quando a opção de carregamento é selecionada.

---

## 🛠️ Como Utilizar Localmente

Por ser um projeto puramente **HTML/CSS/JS**, ele não exige servidor web, ambiente Node.js ou instalação de dependências.

1.  **Clone o repositório** (ou baixe os arquivos fonte).
2.  Abra o arquivo HTML principal (ex: `frequencia_app_teste.html` ou `index.html`) **diretamente no seu navegador** (Chrome, Firefox, etc.).
3.  O sistema estará totalmente funcional para **uso offline**.

### 📝 Formato do Arquivo de Turma (`.txt`)

Para carregar uma nova turma, o arquivo de texto (`.txt`) deve conter **um nome de aluno por linha**, sem numeração, vírgulas ou caracteres adicionais.

**Exemplo:**

```txt
Nome do Aluno A
Nome do Aluno B
Nome do Aluno C
...
