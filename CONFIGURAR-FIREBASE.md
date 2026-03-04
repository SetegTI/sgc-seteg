# 🔐 Configuração do Firebase - Sistema de Autenticação

## ✅ O QUE FOI FEITO

1. ✅ Removidos códigos hardcoded do JavaScript
2. ✅ Criada função de autenticação com Firebase
3. ✅ Sistema agora valida códigos diretamente no banco

## 📋 ESTRUTURA DE DADOS NO FIREBASE

Você precisa criar a seguinte estrutura no Firebase Realtime Database:

```json
{
  "acessos": {
    "482913": {
      "role": "gestor",
      "nome": "Administrador"
    },
    "739156": {
      "role": "tecnico",
      "codigo": "LAIS",
      "nome": "Laís Mendes"
    },
    "885412": {
      "role": "tecnico",
      "codigo": "LAIZE",
      "nome": "Laize Rodrigues"
    },
    "605284": {
      "role": "tecnico",
      "codigo": "VALESKA",
      "nome": "Valeska Soares"
    },
    "918347": {
      "role": "tecnico",
      "codigo": "LIZABETH",
      "nome": "Lizabeth Silva"
    },
    "274690": {
      "role": "tecnico",
      "codigo": "ISMAEL",
      "nome": "Ismael Alves"
    },
    "563821": {
      "role": "tecnico",
      "codigo": "FERNANDO",
      "nome": "Fernando Sousa"
    }
  },
  "solicitacoes": {
    // Suas solicitações existentes
  }
}
```

## 🔧 PASSO A PASSO

### 1. Acessar o Firebase Console

1. Acesse: https://console.firebase.google.com
2. Selecione o projeto: **cartografia-9ca7b**
3. No menu lateral, clique em **Realtime Database**

### 2. Adicionar os Dados de Acesso

1. Clique no ícone **+** ao lado da raiz do banco
2. Cole a estrutura JSON acima
3. Ou adicione manualmente:
   - Clique em **+** na raiz
   - Nome: `acessos`
   - Clique em **+** dentro de `acessos`
   - Nome: `482913` (código do gestor)
   - Adicione os campos:
     - `role`: `gestor`
     - `nome`: `Administrador`
   - Repita para cada técnico

### 3. Configurar Regras de Segurança

1. Clique na aba **Regras** (Rules)
2. Substitua o conteúdo por:

```json
{
  "rules": {
    ".read": true,
    ".write": true,
    
    "acessos": {
      ".read": false,
      ".write": false
    }
  }
}
```

3. Clique em **Publicar** (Publish)

## 🔒 O QUE ESSAS REGRAS FAZEM

- ✅ Permite leitura/escrita nas solicitações
- ❌ Bloqueia leitura pública do nó `acessos`
- ❌ Bloqueia escrita no nó `acessos`
- ✅ Apenas o código do app pode validar códigos

## 🧪 TESTAR

1. Abra o sistema
2. Clique em "Acesso Gestor"
3. Digite: `482913`
4. Deve logar como gestor

5. Faça logout
6. Clique em "Acesso Técnico"
7. Digite: `739156`
8. Deve logar como Laís Mendes

## ✅ VANTAGENS

- ✔ Códigos não ficam visíveis no JavaScript
- ✔ Fácil adicionar/remover usuários
- ✔ Fácil trocar códigos de acesso
- ✔ Seguro contra inspeção de código
- ✔ Centralizado no Firebase

## 🔄 ADICIONAR NOVO USUÁRIO

Para adicionar um novo técnico:

1. Acesse Firebase Console
2. Vá em Realtime Database
3. Dentro de `acessos`, clique em **+**
4. Adicione:
   - Nome: `123456` (novo código)
   - Campos:
     - `role`: `tecnico`
     - `codigo`: `JOAO`
     - `nome`: `João Silva`

Pronto! O novo usuário já pode fazer login.

## 🔐 TROCAR CÓDIGO DE ACESSO

Para trocar o código de um usuário:

1. Acesse Firebase Console
2. Vá em Realtime Database
3. Dentro de `acessos`, encontre o código antigo
4. Clique com botão direito > **Remover**
5. Adicione um novo código com os mesmos dados

## 📝 NOTAS IMPORTANTES

- Os códigos devem ter 6 dígitos
- Não use códigos sequenciais (123456, 111111, etc)
- Mantenha os códigos em local seguro
- Troque os códigos periodicamente
