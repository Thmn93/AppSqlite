import * as SQLite from 'expo-sqlite';
//fazer em casa

async function Banco() {
    const bd = await SQLite.openDatabaseAsync("FatecV")
    console.log('Banco criado, bd')
    return bd
}

async function createTable(db:SQLite.SQLiteDatabase)  {
    try {
        await db.execAsync(`
            PRAGMA journal_mode = WAL;
            CREATE TABLE IF NOT EXISTS USUARIO(
                ID_US INTEGER PRIMARY KEY AUTOINCREMENT,
                NOME_US VARCHAR(100),
                EMAIL_US VARCHAR(100),
                CPF_US VARCHAR(11)
            )
            `)
        await db.execAsync(`ALTER TABLE USUARIO ADD COLUMN CPF_US VARCHAR(11)`).catch(() => null)
        console.log('tabela CRIADA!!')
    } catch (error) {
        console.log('Erro ao criar tabela', error)
    }
}

async function inserirUsuario(db: SQLite.SQLiteDatabase, nome: string, email: string, cpf = '') {
    try {
        await db.runAsync(
            "INSERT INTO USUARIO(NOME_US, EMAIL_US, CPF_US) VALUES (?,?,?)",
            nome, email, cpf
        )
        console.log('Usuário inserido')
    } catch (error) {
        console.log('Ocorreu um problema ao cadastrar o usuário', error)
    }
}

async function InserirUsuario(db: SQLite.SQLiteDatabase, nome: string, email: string, cpf = '') {
    await inserirUsuario(db, nome, email, cpf)
}

// Exibir os dados 

async function selectUsuarios(db: SQLite.SQLiteDatabase) {
    try{
        const resultado = await db.getAllAsync("SELECT * FROM USUARIO")
        console.log('Usuarios encontrados')
        return resultado;
    } catch (error) {
        console.log('Erro ao selecionar usuários', error)
    }
}
    //FILTRO

    async function SelectUsuariosId(db:SQLite.SQLiteDatabase, cpf:string) {
       try {
           const resultado = await db.getFirstAsync("SELECT * FROM USUARIO WHERE CPF_US = ?", cpf);
           console.log('Usuário encontrado por CPF')
           return resultado;
       } catch (error) {
           console.log('Erro ao selecionar usuário pelo CPF', error)
       }
    }

    async function selectUsuarioId(db:SQLite.SQLiteDatabase, id:number) {
       try {
           const resultado = await db.getFirstAsync("SELECT * FROM USUARIO WHERE ID_US = ?", id);
           console.log('Usuário encontrado')
           return resultado;
       } catch (error) {
           console.log('Erro ao selecionar usuário pelo ID', error)
       }
    }

    //DELETAR
    
          async function deletaUsuario(db:SQLite.SQLiteDatabase, id:number) {
            try {
              await db.runAsync("DELETE FROM USUARIO WHERE ID_US = ?", id);
              console.log('Deletado com sucesso')
            } catch (error) {
              console.log('Erro ao deletar usuário', error)
            }
        }

export { Banco, createTable, InserirUsuario, inserirUsuario, selectUsuarios, SelectUsuariosId, selectUsuarioId, deletaUsuario}
        