# Documentação Backend - AppSqlite API

## Sumário
1. [Visão Geral](#visão-geral)
2. [Estrutura do Projeto](#estrutura-do-projeto)
3. [Configuração Inicial](#configuração-inicial)
4. [Endpoints da API](#endpoints-da-api)
5. [Modelo de Dados](#modelo-de-dados)
6. [Camada de Banco de Dados](#camada-de-banco-de-dados)
7. [Tratamento de Erros](#tratamento-de-erros)
8. [Como Executar](#como-executar)

---

## Visão Geral

**AppSqlite** é um servidor Express que fornece uma API REST para gerenciar cadastros de usuários com dados de endereço. Utiliza SQLite como banco de dados local e pode ser chamado a partir do frontend ViaCEP.

### Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **Banco de Dados**: SQLite3
- **ORM**: sqlite (open package)
- **Linguagem**: TypeScript

---

## Estrutura do Projeto

```
AppSqlite/
├── server.ts                  # Arquivo principal (Express + endpoints)
├── package.json               # Dependências e scripts
├── tsconfig.json              # Configuração TypeScript
├── fatec-local.db             # Banco SQLite (criado em runtime)
└── Conf/
    └── Bd.tsx                 # (Não utilizado, legado do projeto)
```

---

## Configuração Inicial

### `package.json`

```json
{
  "name": "appsqlite",
  "version": "1.0.0",
  "scripts": {
    "start": "expo start",
    "dev": "concurrently \"npm run api\" \"expo start\"",
    "api": "ts-node server.ts"
  },
  "dependencies": {
    "express": "^4.21.2",
    "cors": "^2.8.5",
    "sqlite": "^5.1.1",
    "sqlite3": "^5.1.7"
  },
  "devDependencies": {
    "@types/express": "^5.0.1",
    "@types/node": "^24.0.1",
    "ts-node": "^10.9.2",
    "typescript": "~5.9.2",
    "concurrently": "^9.2.1"
  }
}
```

### Iniciar Servidor

```bash
# Rodando apenas a API
npm run api

# Rodando frontend + API juntos (no AppSqlite)
npm run dev
```

---

## Endpoints da API

### 1. GET `/usuarios`

**Descrição**: Retorna todos os usuários cadastrados.

**Request**:
```http
GET http://localhost:3333/usuarios
```

**Response (200 OK)**:
```json
[
  {
    "ID_US": 1,
    "NOME_US": "João Silva",
    "EMAIL_US": "joao@email.com",
    "CPF_US": "12345678900",
    "CEP_US": "01001000",
    "LOGRADOURO_US": "Avenida Paulista",
    "BAIRRO_US": "Bela Vista",
    "CIDADE_US": "São Paulo",
    "ESTADO_US": "SP",
    "NUMERO_US": "100",
    "COMPLEMENTO_US": "Apto 1001"
  },
  {
    "ID_US": 2,
    "NOME_US": "Maria Santos",
    ...
  }
]
```

**Código no servidor**:
```typescript
app.get('/usuarios', async (_req: Request, res: Response) => {
  try {
    const users = await selectUsuarios();
    res.json(users);
  } catch {
    res.status(500).json({ message: 'Erro ao consultar cadastros.' });
  }
});

async function selectUsuarios() {
  const db = await dbPromise;
  return db.all('SELECT * FROM USUARIO ORDER BY ID_US DESC');
}
```

**Erros possíveis**:
- `500 Internal Server Error`: Erro ao acessar banco de dados

---

### 2. GET `/usuarios/cpf/:cpf`

**Descrição**: Busca um usuário específico pelo CPF.

**Request**:
```http
GET http://localhost:3333/usuarios/cpf/12345678900
```

**Response (200 OK)**:
```json
{
  "ID_US": 1,
  "NOME_US": "João Silva",
  "EMAIL_US": "joao@email.com",
  "CPF_US": "12345678900",
  "CEP_US": "01001000",
  ...
}
```

**Response (404 Not Found)**:
```json
{
  "message": "Cadastro nao encontrado."
}
```

**Código no servidor**:
```typescript
app.get('/usuarios/cpf/:cpf', async (req: Request, res: Response) => {
  try {
    const cpfParam = Array.isArray(req.params.cpf)
      ? req.params.cpf[0]
      : req.params.cpf;
    
    const user = await SelectUsuariosId(cpfParam ?? '');
    
    if (!user) {
      return res.status(404).json({ message: 'Cadastro nao encontrado.' });
    }
    
    res.json(user);
  } catch {
    res.status(500).json({ message: 'Erro ao consultar CPF.' });
  }
});

async function SelectUsuariosId(cpf: string) {
  const db = await dbPromise;
  return db.get('SELECT * FROM USUARIO WHERE CPF_US = ?', cpf);
}
```

**Tratamento especial**: 
- `req.params.cpf` é verificado se é array (caso haja duplicação de parâmetro)
- CPF vem sem formatação (ex: 12345678900)

**Erros possíveis**:
- `404 Not Found`: Nenhum cadastro com esse CPF
- `500 Internal Server Error`: Erro ao acessar banco

---

### 3. POST `/usuarios`

**Descrição**: Cria um novo cadastro de usuário.

**Request**:
```http
POST http://localhost:3333/usuarios
Content-Type: application/json

{
  "nome": "João Silva",
  "email": "joao@email.com",
  "cpf": "12345678900",
  "cep": "01001000",
  "logradouro": "Avenida Paulista",
  "bairro": "Bela Vista",
  "cidade": "São Paulo",
  "estado": "SP",
  "numero": "100",
  "complemento": "Apto 1001"
}
```

**Response (201 Created)**:
```json
{
  "message": "Cadastro realizado com sucesso."
}
```

**Código no servidor**:
```typescript
app.post('/usuarios', async (req: Request, res: Response) => {
  try {
    const payload = req.body as UsuarioPayload;
    await InserirUsuario(payload);
    res.status(201).json({ message: 'Cadastro realizado com sucesso.' });
  } catch {
    res.status(500).json({ message: 'Erro ao cadastrar usuario.' });
  }
});

async function InserirUsuario(payload: Partial<UsuarioPayload>) {
  const db = await dbPromise;
  const normalized = normalizePayload(payload);
  
  await db.run(
    `INSERT INTO USUARIO(
      NOME_US, EMAIL_US, CPF_US, CEP_US, LOGRADOURO_US, 
      BAIRRO_US, CIDADE_US, ESTADO_US, NUMERO_US, COMPLEMENTO_US
    ) VALUES(?,?,?,?,?,?,?,?,?,?)`,
    ...Object.values(normalized)
  );
}
```

**Normalização**: 
- Todos os campos são trimados
- CPF e CEP são removidos de pontos e hífens
- Strings vazias são preenchidas com valor padrão

**Erros possíveis**:
- `500 Internal Server Error`: Erro ao inserir (ex: CPF duplicado, validação banco)

---

### 4. PUT `/usuarios/:id`

**Descrição**: Atualiza um cadastro existente.

**Request**:
```http
PUT http://localhost:3333/usuarios/1
Content-Type: application/json

{
  "nome": "João Silva Atualizado",
  "email": "joao.novo@email.com",
  "cpf": "12345678900",
  "cep": "01001000",
  "logradouro": "Avenida Paulista",
  "bairro": "Bela Vista",
  "cidade": "São Paulo",
  "estado": "SP",
  "numero": "200",
  "complemento": "Apto 2002"
}
```

**Response (200 OK)**:
```json
{
  "message": "Cadastro atualizado com sucesso."
}
```

**Código no servidor**:
```typescript
app.put('/usuarios/:id', async (req: Request, res: Response) => {
  try {
    const payload = req.body as UsuarioPayload;
    const normalizedPayload = normalizePayload(payload);
    const db = await dbPromise;
    
    await db.run(
      `UPDATE USUARIO SET 
        NOME_US = ?, EMAIL_US = ?, CPF_US = ?, CEP_US = ?, 
        LOGRADOURO_US = ?, BAIRRO_US = ?, CIDADE_US = ?, ESTADO_US = ?, 
        NUMERO_US = ?, COMPLEMENTO_US = ? 
      WHERE ID_US = ?`,
      normalizedPayload.nome,
      normalizedPayload.email,
      normalizedPayload.cpf,
      normalizedPayload.cep,
      normalizedPayload.logradouro,
      normalizedPayload.bairro,
      normalizedPayload.cidade,
      normalizedPayload.estado,
      normalizedPayload.numero,
      normalizedPayload.complemento,
      Number(req.params.id)
    );
    
    res.json({ message: 'Cadastro atualizado com sucesso.' });
  } catch {
    res.status(500).json({ message: 'Erro ao atualizar cadastro.' });
  }
});
```

**Comportamento**:
- Atualiza TODOS os campos do usuário
- ID é extraído da URL e convertido para número
- Se ID não existir, nenhuma linha é atualizada (sem erro)

**Erros possíveis**:
- `500 Internal Server Error`: Erro ao atualizar (ex: CPF duplicado)

---

### 5. DELETE `/usuarios/:id`

**Descrição**: Deleta um cadastro.

**Request**:
```http
DELETE http://localhost:3333/usuarios/1
```

**Response (200 OK)**:
```json
{
  "message": "Cadastro excluido com sucesso."
}
```

**Código no servidor**:
```typescript
app.delete('/usuarios/:id', async (req: Request, res: Response) => {
  try {
    const db = await dbPromise;
    await db.run('DELETE FROM USUARIO WHERE ID_US = ?', Number(req.params.id));
    res.json({ message: 'Cadastro excluido com sucesso.' });
  } catch {
    res.status(500).json({ message: 'Erro ao excluir cadastro.' });
  }
});
```

**Comportamento**:
- Deleta usuário com ID específico
- Se ID não existir, nenhuma linha é deletada (sem erro)

**Erros possíveis**:
- `500 Internal Server Error`: Erro ao deletar

---

## Modelo de Dados

### Tipo TypeScript

```typescript
type UsuarioPayload = {
  nome: string;
  email: string;
  cpf: string;
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  estado: string;
  numero: string;
  complemento: string;
};

type NormalizedUsuarioPayload = {
  // Mesmo que UsuarioPayload, mas garantido que os valores estão normalizados
};
```

### Schema SQLite

```sql
CREATE TABLE IF NOT EXISTS USUARIO(
  ID_US INTEGER PRIMARY KEY AUTOINCREMENT,
  NOME_US VARCHAR(100),
  EMAIL_US VARCHAR(100),
  CPF_US VARCHAR(11),
  CEP_US VARCHAR(9),
  LOGRADOURO_US VARCHAR(120),
  BAIRRO_US VARCHAR(120),
  CIDADE_US VARCHAR(120),
  ESTADO_US VARCHAR(2),
  NUMERO_US VARCHAR(20),
  COMPLEMENTO_US VARCHAR(120)
)
```

### Descrição de Colunas

| Coluna | Tipo | Tamanho | Descrição |
|--------|------|--------|-----------|
| `ID_US` | INTEGER | - | Identificador único, auto-incrementado |
| `NOME_US` | VARCHAR | 100 | Nome completo do usuário |
| `EMAIL_US` | VARCHAR | 100 | Email |
| `CPF_US` | VARCHAR | 11 | CPF sem formatação (apenas dígitos) |
| `CEP_US` | VARCHAR | 9 | CEP com hífen (formato: 12345-678) |
| `LOGRADOURO_US` | VARCHAR | 120 | Rua/Avenida |
| `BAIRRO_US` | VARCHAR | 120 | Bairro |
| `CIDADE_US` | VARCHAR | 120 | Cidade |
| `ESTADO_US` | VARCHAR | 2 | Sigla do estado (ex: SP, RJ) |
| `NUMERO_US` | VARCHAR | 20 | Número da casa/prédio |
| `COMPLEMENTO_US` | VARCHAR | 120 | Apto, andar, bloco, etc |

### Razão dos Tamanhos

- **CPF (11)**: Sem formatação = 11 dígitos
- **CEP (9)**: Com hífen = 12345-678
- **ESTADO_US (2)**: Sigla de 2 letras (SP, RJ, etc)
- **NUMERO_US (20)**: Alguns endereços têm números complexos
- Demais: Tamanhos conservadores para dados brasileiros

---

## Camada de Banco de Dados

### Inicialização

```typescript
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const dbPromise = open({
  filename: './fatec-local.db',
  driver: sqlite3.Database,
});
```

**O que faz**:
- `open()` cria uma conexão Promise com SQLite
- `fatec-local.db` é criado no diretório de execução
- `dbPromise` é reutilizado em todas as operações (singleton)

### Garantia de Schema

```typescript
async function ensureSchema() {
  const db = await dbPromise;
  
  // Criar tabela se não existir
  await db.exec(`
    CREATE TABLE IF NOT EXISTS USUARIO(
      ID_US INTEGER PRIMARY KEY AUTOINCREMENT,
      NOME_US VARCHAR(100),
      EMAIL_US VARCHAR(100),
      CPF_US VARCHAR(11),
      CEP_US VARCHAR(9),
      LOGRADOURO_US VARCHAR(120),
      BAIRRO_US VARCHAR(120),
      CIDADE_US VARCHAR(120),
      ESTADO_US VARCHAR(2),
      NUMERO_US VARCHAR(20),
      COMPLEMENTO_US VARCHAR(120)
    )
  `);
  
  // Adicionar colunas em caso de ALTER TABLE necessário
  await db.exec('ALTER TABLE USUARIO ADD COLUMN CPF_US VARCHAR(11)').catch(() => null);
  await db.exec('ALTER TABLE USUARIO ADD COLUMN CEP_US VARCHAR(9)').catch(() => null);
  // ... mais ALTERs
}

// Executar no startup
ensureSchema().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`API local em http://localhost:${PORT}`);
  });
});
```

**Estratégia**:
- `CREATE TABLE IF NOT EXISTS`: Não falha se tabela já existe
- `ALTER TABLE ... ADD COLUMN`: Usa `.catch(() => null)` para ignorar "column already exists"
- Executa antes de escutar requisições

### Normalização de Dados

```typescript
function normalizePayload(payload: Partial<UsuarioPayload>): NormalizedUsuarioPayload {
  return {
    nome: payload.nome?.trim() ?? '',
    email: payload.email?.trim() ?? '',
    cpf: payload.cpf?.replace(/\D/g, '') ?? '',             // Remove formatação
    cep: payload.cep?.replace(/\D/g, '') ?? '',             // Remove formatação
    logradouro: payload.logradouro?.trim() ?? '',
    bairro: payload.bairro?.trim() ?? '',
    cidade: payload.cidade?.trim() ?? '',
    estado: payload.estado?.trim() ?? '',
    numero: payload.numero?.trim() ?? '',
    complemento: payload.complemento?.trim() ?? '',
  };
}
```

**Operações**:
- `trim()`: Remove espaços em branco nas extremidades
- `replace(/\D/g, '')`: Remove tudo que não é dígito (pontos, hífens)
- `?? ''`: Se undefined, usa string vazia como padrão

---

## Tratamento de Erros

### Try-Catch Padrão

```typescript
app.post('/usuarios', async (req: Request, res: Response) => {
  try {
    const payload = req.body as UsuarioPayload;
    await InserirUsuario(payload);
    res.status(201).json({ message: 'Cadastro realizado com sucesso.' });
  } catch {
    res.status(500).json({ message: 'Erro ao cadastrar usuario.' });
  }
});
```

**Estratégia**:
- Toda operação de banco vem com try-catch
- Erros retornam JSON com mensagem descritiva
- Status HTTP apropriado:
  - `201`: Criado com sucesso
  - `404`: Não encontrado
  - `500`: Erro do servidor

### CORS Habilitado

```typescript
import cors from 'cors';

app.use(cors());
```

**O que faz**:
- Aceita requisições de qualquer origem
- Necessário para o frontend fazer chamadas locais

---

## Como Executar

### Pré-requisitos

```bash
# Node.js v16+ instalado
node --version

# Git (para clonar o repo, se necessário)
git --version
```

### 1. Instalar Dependências

```bash
cd C:/Users/Alunos/Desktop/React-Native-Emerson/AppSqlite/AppSqlite
npm install
```

**Output esperado**:
```
added 750 packages in 30s
```

### 2. Rodar o Servidor

```bash
npm run api
```

**Output esperado**:
```
> appsqlite@1.0.0 api
> ts-node server.ts

API local em http://localhost:3333
```

### 3. Testar Endpoints

**Com cURL**:
```bash
# GET todos os usuários
curl http://localhost:3333/usuarios

# POST novo usuário
curl -X POST http://localhost:3333/usuarios \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "João",
    "email": "joao@email.com",
    "cpf": "12345678900",
    "cep": "01001000",
    "logradouro": "Av Paulista",
    "bairro": "Bela Vista",
    "cidade": "São Paulo",
    "estado": "SP",
    "numero": "100",
    "complemento": "Apto 1001"
  }'
```

**Com Postman**:
1. Crie nova request POST
2. URL: `http://localhost:3333/usuarios`
3. Headers: `Content-Type: application/json`
4. Body (raw JSON): Conforme exemplo acima
5. Clique Send

**Com Frontend ViaCEP**:
```bash
# Em outro terminal, no diretório ViaCEP
npm start
# Escolha 'w' para web ou 'a' para Android
```

---

## Troubleshooting

### Erro: "EADDRINUSE: address already in use :::3333"

**Causa**: Porta 3333 já está em uso.

**Soluções**:
```bash
# Windows - Encontrar processo na porta
netstat -ano | findstr :3333
# Matar processo
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :3333
kill -9 <PID>
```

### Erro: "Cannot find module 'express'"

**Causa**: Dependências não instaladas.

**Solução**:
```bash
npm install
```

### Banco de Dados Corrompido

**Sintomas**: Erros ao inserir/ler dados, tabela vazia inesperadamente.

**Solução**: Deletar arquivo de banco e deixar recriar
```bash
rm fatec-local.db  # ou delete fatec-local.db no Windows
npm run api        # Recria banco com schema limpo
```

### Conexão Recusada do Frontend

**Causa**: App está tentando conectar em endereço errado.

**Verificação**:
```typescript
// Em cep-search.tsx
const API_URL =
  Platform.OS === "android" 
    ? "http://10.0.2.2:3333"      // Emulador: correto
    : "http://localhost:3333";     // Web: correto
    // Para celular físico: "http://<seu-ip>:3333"
```

**Para celular físico**:
- Obter IP da máquina: `ipconfig` ou `ifconfig`
- Substitua a constante `API_URL` por `http://<seu-ip>:3333`

---

## Contato e Suporte

Para dúvidas sobre o backend:
- Verifique logs do servidor (npm run api)
- Teste endpoints com curl/Postman antes de usar no frontend
- Inspecione o arquivo `fatec-local.db` com um visualizador SQLite se necessário
