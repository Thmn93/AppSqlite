import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

type UsuarioPayload = {
	nome: string;
	email: string;
	cpf: string;
	cep?: string;
	logradouro?: string;
	bairro?: string;
	cidade?: string;
	estado?: string;
	numero?: string;
	complemento?: string;
};

const app = express();
const PORT = 3333;

app.use(cors());
app.use(express.json());

const dbPromise = open({
	filename: './fatec-local.db',
	driver: sqlite3.Database,
});

async function ensureSchema() {
	const db = await dbPromise;
	await db.exec(`
		CREATE TABLE IF NOT EXISTS USUARIO(
			ID_US INTEGER PRIMARY KEY AUTOINCREMENT,
			NOME_US VARCHAR(100),
			EMAIL_US VARCHAR(100),
			CPF_US VARCHAR(11),
			CEP_US VARCHAR(20),
			LOGRADOURO_US VARCHAR(200),
			BAIRRO_US VARCHAR(200),
			CIDADE_US VARCHAR(100),
			ESTADO_US VARCHAR(50),
			NUMERO_US VARCHAR(30),
			COMPLEMENTO_US VARCHAR(200)
		)
	`);

	// Ensure columns exist for older DBs: attempt to add each column if missing
	await db.exec('ALTER TABLE USUARIO ADD COLUMN CEP_US VARCHAR(20)').catch(() => null);
	await db.exec('ALTER TABLE USUARIO ADD COLUMN LOGRADOURO_US VARCHAR(200)').catch(() => null);
	await db.exec('ALTER TABLE USUARIO ADD COLUMN BAIRRO_US VARCHAR(200)').catch(() => null);
	await db.exec('ALTER TABLE USUARIO ADD COLUMN CIDADE_US VARCHAR(100)').catch(() => null);
	await db.exec('ALTER TABLE USUARIO ADD COLUMN ESTADO_US VARCHAR(50)').catch(() => null);
	await db.exec('ALTER TABLE USUARIO ADD COLUMN NUMERO_US VARCHAR(30)').catch(() => null);
	await db.exec('ALTER TABLE USUARIO ADD COLUMN COMPLEMENTO_US VARCHAR(200)').catch(() => null);
	// Create unique index to enforce CPF uniqueness at DB level
	await db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_usuario_cpf ON USUARIO(CPF_US)').catch(() => null);
}

async function InserirUsuario(payload: UsuarioPayload) {
	const db = await dbPromise;
	await db.run(
		'INSERT INTO USUARIO(NOME_US, EMAIL_US, CPF_US, CEP_US, LOGRADOURO_US, BAIRRO_US, CIDADE_US, ESTADO_US, NUMERO_US, COMPLEMENTO_US) VALUES(?,?,?,?,?,?,?,?,?,?)',
		payload.nome,
		payload.email,
		(payload.cpf ?? '').replace(/\D/g, ''),
		payload.cep ?? '',
		payload.logradouro ?? '',
		payload.bairro ?? '',
		payload.cidade ?? '',
		payload.estado ?? '',
		payload.numero ?? '',
		payload.complemento ?? '',
	);
}

async function selectUsuarios() {
	const db = await dbPromise;
	return db.all('SELECT * FROM USUARIO ORDER BY ID_US DESC');
}

async function SelectUsuariosId(cpf: string) {
	const db = await dbPromise;
	const normalized = (cpf ?? '').replace(/\D/g, '');
	// Normalize stored CPF by removing dots, dashes and spaces before comparing
	return db.get(
		"SELECT * FROM USUARIO WHERE REPLACE(REPLACE(REPLACE(CPF_US, '.', ''), '-', ''), ' ', '') = ?",
		normalized,
	);
}

app.get('/usuarios', async (_req: Request, res: Response) => {
	try {
		const users = await selectUsuarios();
		res.json(users);
	} catch {
		res.status(500).json({ message: 'Erro ao consultar cadastros.' });
	}
});

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

app.post('/usuarios', async (req: Request, res: Response) => {
	try {
		const payload = req.body as UsuarioPayload;
		// Prevent duplicate CPF
		const existing = await SelectUsuariosId(payload.cpf ?? '');
		if (existing) {
			return res.status(409).json({ message: 'CPF ja cadastrado.' });
		}
		await InserirUsuario(payload);
		res.status(201).json({ message: 'Cadastro realizado com sucesso.' });
	} catch {
		res.status(500).json({ message: 'Erro ao cadastrar usuario.' });
	}
});

app.put('/usuarios/:id', async (req: Request, res: Response) => {
	try {
		const payload = req.body as UsuarioPayload;
		const db = await dbPromise;
		// Prevent duplicate CPF on update (exclude current record)
		const existing = await SelectUsuariosId(payload.cpf ?? '');
		if (existing && Number(existing.ID_US) !== Number(req.params.id)) {
			return res.status(409).json({ message: 'CPF ja cadastrado por outro registro.' });
		}

		await db.run(
			'UPDATE USUARIO SET NOME_US = ?, EMAIL_US = ?, CPF_US = ?, CEP_US = ?, LOGRADOURO_US = ?, BAIRRO_US = ?, CIDADE_US = ?, ESTADO_US = ?, NUMERO_US = ?, COMPLEMENTO_US = ? WHERE ID_US = ?',
			payload.nome,
			payload.email,
			(payload.cpf ?? '').replace(/\D/g, ''),
			payload.cep ?? '',
			payload.logradouro ?? '',
			payload.bairro ?? '',
			payload.cidade ?? '',
			payload.estado ?? '',
			payload.numero ?? '',
			payload.complemento ?? '',
			Number(req.params.id),
		);
		res.json({ message: 'Cadastro atualizado com sucesso.' });
	} catch {
		res.status(500).json({ message: 'Erro ao atualizar cadastro.' });
	}
});

app.delete('/usuarios/:id', async (req: Request, res: Response) => {
	try {
		const db = await dbPromise;
		await db.run('DELETE FROM USUARIO WHERE ID_US = ?', Number(req.params.id));
		res.json({ message: 'Cadastro excluido com sucesso.' });
	} catch {
		res.status(500).json({ message: 'Erro ao excluir cadastro.' });
	}
});

ensureSchema().then(() => {
	app.listen(PORT, () => {
		console.log(`API local em http://localhost:${PORT}`);
	});
});
