# SGC SETEG - Sistema de Gestão Cartográfica

Sistema web para gerenciamento de solicitações cartográficas da SETEG, desenvolvido com HTML5, CSS3, JavaScript vanilla e Firebase Realtime Database.

## 📋 Sobre o Projeto

O SGC SETEG é uma aplicação web moderna que permite o gerenciamento completo de solicitações de mapas e produtos cartográficos, com controle de acesso para gestores e técnicos, acompanhamento de status em tempo real e geração de relatórios.

## ✨ Funcionalidades

### Gerais
- 🌓 **Tema Dark/Light**: Alternância entre temas escuro e claro com persistência
- 📱 **Design Responsivo**: Interface adaptável para diferentes tamanhos de tela
- 🔔 **Notificações**: Sistema de notificações visuais para feedback ao usuário
- 💾 **Persistência de Login**: Mantém sessão do usuário após recarregar a página

### Solicitações
- ➕ **Criar Solicitações**: Formulário completo para nova solicitação cartográfica
- 📊 **Visualizar Detalhes**: Modal com todas as informações da solicitação
- 🔍 **Filtros por Status**: Filtros rápidos (Na Fila, Processando, Aguardando, Finalizado)
- 📈 **Estatísticas em Tempo Real**: Contadores automáticos por status

### Controle de Acesso
- 👨‍💼 **Acesso Gestor**: Controle total sobre todas as solicitações
- 👨‍🔧 **Acesso Técnico**: Acesso às solicitações atribuídas ao técnico
- 🔐 **Autenticação por Código**: Sistema de códigos de acesso individuais

### Ações do Gestor
- 🔄 **Alterar Status**: Mudar estágio da solicitação (Na Fila, Processando, Aguardando Dados, Finalizado)
- 👤 **Atribuir Técnico**: Designar técnico responsável pela solicitação
- 🗑️ **Excluir Solicitação**: Remover solicitações do sistema
- 📊 **Gerar Relatórios**: Exportar dados em formato CSV

### Ações do Técnico
- ✏️ **Atualizar Status**: Alterar estágio das solicitações atribuídas
- 📋 **Visualizar Atribuições**: Ver apenas solicitações sob sua responsabilidade

## 🚀 Tecnologias Utilizadas

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Firebase Realtime Database
- **Autenticação**: Sistema customizado com códigos de acesso
- **Ícones**: Bootstrap Icons v1.11.3
- **Fonte**: Satoshi (via Fontshare)

## 📁 Estrutura do Projeto

```
sgc-seteg/
├── public/
│   └── index.html              # Página principal
├── src/
│   ├── assets/
│   │   └── images/             # Imagens e logos
│   ├── css/
│   │   └── style.css           # Estilos globais
│   ├── js/
│   │   ├── app.js              # Lógica principal
│   │   ├── firebase/
│   │   │   └── firebase-config.js  # Configuração Firebase
│   │   ├── modules/            # Módulos auxiliares
│   │   └── utils/              # Utilitários
├── .gitignore
├── README.md
└── iniciar-servidor-e-abrir.bat  # Script para iniciar servidor local
```

## 🔧 Instalação e Configuração

### Pré-requisitos
- Node.js instalado
- Conta Firebase com Realtime Database configurado

### Passo 1: Clonar o Repositório
```bash
git clone https://github.com/seteg-ce/sgc-seteg.git
cd sgc-seteg
```

### Passo 2: Configurar Firebase
1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Crie um novo projeto ou use um existente
3. Ative o Realtime Database
4. Copie as credenciais do Firebase
5. Edite o arquivo `src/js/firebase/firebase-config.js` com suas credenciais:

```javascript
const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "SEU_AUTH_DOMAIN",
  databaseURL: "SUA_DATABASE_URL",
  projectId: "SEU_PROJECT_ID",
  storageBucket: "SEU_STORAGE_BUCKET",
  messagingSenderId: "SEU_MESSAGING_SENDER_ID",
  appId: "SEU_APP_ID"
};
```

### Passo 3: Instalar Live Server (Opcional)
```bash
npm install -g live-server
```

### Passo 4: Iniciar o Servidor

**Opção 1 - Windows (Automático):**
```bash
iniciar-servidor-e-abrir.bat
```

**Opção 2 - Manual:**
```bash
live-server --port=8080
```

**Opção 3 - Qualquer servidor HTTP:**
```bash
# Python 3
python -m http.server 8080

# Node.js http-server
npx http-server -p 8080
```

Acesse: `http://localhost:8080/public/index.html`

## 🔑 Códigos de Acesso

### Gestor
- **Código**: `482913`
- **Permissões**: Acesso total ao sistema

### Técnicos
| Nome | Código |
|------|--------|
| Laís | 739156 |
| Laize | 885412 |
| Valeska | 605284 |
| Lizabeth | 918347 |
| Ismael | 274690 |
| Fernando | 563821 |

> ⚠️ **Nota**: Os códigos de acesso serão migrados para autenticação via PostgreSQL em versões futuras.

## 📊 Estrutura de Dados (Firebase)

```javascript
{
  "solicitacoes": {
    "1": {
      "id": 1,
      "solicitante": "Nome do Solicitante",
      "cliente": "Nome do Cliente",
      "nomeEstudo": "Nome do Estudo",
      "status": "fila", // fila | processando | aguardando | finalizado
      "tecnicoResponsavel": "LAIS",
      "dataSolicitacao": "2026-03-03",
      "dataCriacao": "2026-03-03T12:00:00.000Z",
      "tipoMapa": "TOPOGRAFICO",
      "finalidade": "LICENCIAMENTO",
      "produtos": {
        "mapa": true,
        "croqui": false,
        "shapefile": true,
        "kml": false
      },
      "elementos": {
        "localizacao": true,
        "acessoLocal": false,
        "acessoRegional": true,
        "areaAmostral": false
      }
      // ... outros campos
    }
  }
}
```

## 🎨 Temas

O sistema possui dois temas:

- **Dark Mode**: Tema escuro com azul (#2563eb) como cor primária
- **Light Mode**: Tema claro com laranja (#ff8200) como cor primária

A preferência é salva no `localStorage` e persiste entre sessões.

## 🔄 Fluxo de Status

```
Na Fila → Processando → Aguardando Dados → Finalizado
                ↓
            (pode voltar para qualquer estágio)
```

## 📝 Validações

- Campos obrigatórios marcados com `*`
- Validação HTML5 nativa
- Notificações de erro personalizadas
- Campos condicionais (aparecem conforme seleção)

## 🚧 Roadmap

- [ ] Migrar autenticação para PostgreSQL
- [ ] Implementar upload de arquivos
- [ ] Adicionar histórico de alterações
- [ ] Sistema de comentários nas solicitações
- [ ] Notificações por email
- [ ] Dashboard com gráficos avançados
- [ ] Exportação de relatórios em PDF
- [ ] API REST para integrações

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'Adiciona MinhaFeature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto é propriedade da SETEG - Superintendência Estadual do Meio Ambiente do Ceará.

## 👥 Equipe

- **Desenvolvimento**: Laís Mendes - Ricardo Junior

## 📞 Suporte

Para suporte e dúvidas, entre em contato com a equipe de TI da SETEG.

---

**Versão**: 2.0.0  
**Última Atualização**: Março 2026
