# Controle de Frequência de Alunos — Firebase Web App

Este projeto é uma aplicação web para **registro e análise de frequência de alunos**, desenvolvida com o [Firebase Firestore](https://firebase.google.com/products/firestore) e JavaScript puro, e estilizada com [TailwindCSS](https://tailwindcss.com/).  
Permite gerenciar turmas, registrar presença diária, exportar dados em CSV e gerar relatórios semanais/mensais de frequência, atrasos, harmonia e participação.

## Funcionalidades

- **Autenticação anônima Firebase:** Cada usuário recebe um ID exclusivo para suas turmas.
- **Cadastro e edição de Turmas:** Adicione, edite ou exclua turmas e listas de alunos (importação .txt).
- **Registro de Presença:** Selecione a data, marque presença/ausência, e registre critérios opcionais (pontualidade, harmonia, participação).
- **Exportação CSV:** Baixe a frequência do dia da turma em CSV, compatível com Excel.
- **Relatórios Semanais e Mensais:** Gere relatórios detalhados com percentuais de presença, atrasos, conflitos e participação.
- **Exportação de Relatórios:** Baixe o relatório do período selecionado em CSV.
- **Interface intuitiva:** Visual moderno, responsivo, com notificações e modais.

## Como usar

1. **Clone ou baixe este repositório.**
2. Coloque os arquivos na pasta desejada do seu servidor ou execute localmente.
3. Altere as credenciais do Firebase em `Web_Firebase/frequencia_app_teste_script.js` (`firebaseConfig`) se desejar usar seu próprio projeto Firebase.
4. Abra o arquivo `Web_Firebase/frequencia_app_teste.html` em seu navegador.

> **Não é necessário backend próprio** — o Firestore armazena todos os dados no seu projeto Firebase.

## Estrutura de arquivos

```text
Web_Firebase/
├── frequencia_app_teste.html          # Página principal da aplicação
├── frequencia_app_teste_script.js     # Lógica JavaScript e integração Firebase
├── frequencia_app_teste_styles.css    # Estilos customizados (além do Tailwind)
├── img/
│   └── Logo_W_FB.png                 # Imagem padrão do logo do app
```

## Principais comandos e telas

- **Adicionar Nova Turma:** Preencha o nome, cole/importar lista de alunos (.txt).
- **Editar/Excluir Turma:** Botões visíveis ao selecionar uma turma.
- **Preencher Presença:** Escolha data, marque presença e critérios opcionais.
- **Exportar CSV:** Frequência do dia (com critérios extras).
- **Gerar Relatório:** Selecione semana/mês, visualize estatísticas, exporte relatório.
- **Trocar Logo:** Clique em "Trocar Logo" para customizar o logo do app.

## Requisitos

- Navegador moderno (Chrome, Edge, Firefox, Safari).
- Conexão à internet para acesso ao Firebase.

## Personalização

- **Logo:** Clique para alterar o logo exibido.
- **Firebase:** Use suas credenciais para garantir privacidade dos dados.
- **Estilos:** Modifique o CSS ou utilize Tailwind para personalizar o visual.

## Segurança e privacidade

- Este projeto utiliza **autenticação anônima** do Firebase — cada usuário tem acesso exclusivo às suas turmas e registros.
- **Atenção:** Os dados são salvos no Firestore do projeto indicado no `firebaseConfig`. Para uso em produção, configure regras de segurança apropriadas no [Console do Firebase](https://console.firebase.google.com/).

## Créditos

Desenvolvido por [franciscoclaudio](https://github.com/franciscoclaudio).  
Baseado em conceitos de apps educacionais, com foco em simplicidade e facilidade de uso.

---

**Dúvidas, sugestões ou problemas?**  
Abra uma [issue no GitHub](https://github.com/franciscoclaudio/Frequencia-Alunos/issues) ou envie um PR!
