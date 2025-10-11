# 📊 Sistema de Registro de Frequência e Observações (Local/HTML)

Este projeto é um aplicativo web de página única (SPA) para registro de frequência, observações pedagógicas e relatórios de alunos. Utiliza **HTML, CSS (incluindo Tailwind via CDN) e JavaScript puro**, com persistência local (Local Storage), permitindo uso totalmente offline e exportação dos dados.

## ⚡ Principais Funcionalidades

- **Gestão de Turmas**
  - Criar, editar e excluir turmas.
  - Importar lista de alunos por arquivo `.txt` ou digitação manual.
  - Personalizar nome da turma e lista de estudantes.

- **Registro de Frequência**
  - Marcação rápida de presença/falta por aluno.
  - Registro de data da aula.
  - Campos para observações como participação, harmonia e pontualidade.

- **Relatórios**
  - Geração de relatórios por período (semanal ou mensal).
  - Visualização e exportação dos dados em formato CSV ou texto estruturado.
  - Análise de presenças, faltas e participação por turma/aluno.

- **Exportação de Dados**
  - Exportação de relatórios e dados brutos para arquivos `.txt` e `.csv`.
  - Exportação direta do relatório gerado.

- **Interface Moderna**
  - Visual limpo e responsivo, usando Tailwind CSS.
  - Suporte à troca de logo do aplicativo.
  - Notificações toast para feedback ao usuário.

- **Persistência Local**
  - Todos os dados ficam salvos no navegador (Local Storage).
  - Uso offline sem necessidade de servidor ou backend.

## 🛠️ Como Usar

1. **Download:** Certifique-se de que os arquivos `frequencia_alunos_local.html`, `frequencia_alunos_local_script.js` e `frequencia_alunos_local_styles.css` estão juntos na mesma pasta.
2. **Abrir:** Clique duas vezes ou abra o arquivo `frequencia_alunos_local.html` em qualquer navegador moderno (Chrome, Firefox, Edge, etc.).
3. **Configurar:** Adicione uma turma, importe ou escreva a lista de alunos, e comece a registrar presença e observações.
4. **Relatórios:** Gere e exporte relatórios conforme necessidade.
5. **Offline:** Todo o funcionamento é local, sem dependência de internet após baixar os arquivos.

> **Atenção:** Os dados são salvos somente no navegador utilizado. Apagar o histórico ou cache pode excluir todas as informações.

## 🎨 Personalização

- É possível alterar a logo do aplicativo via upload pela interface.
- Suporte a temas de cor com Tailwind configurado.
- Todos os campos importantes são customizáveis e fáceis de usar.

## 📂 Estrutura dos Arquivos

- `frequencia_alunos_local.html` – Página principal e interface.
- `frequencia_alunos_local_script.js` – Lógica de funcionamento, manipulação de dados, Local Storage.
- `frequencia_alunos_local_styles.css` – Estilos personalizados.
- (Opcional) Imagens/logos, listas de alunos em `.txt`.

## 💡 Dicas e Observações

- Recomenda-se exportar relatórios frequentemente para backup externo.
- Ideal para uso em escolas, aulas particulares, cursos livres ou qualquer contexto que exija controle prático de frequência.

---