import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

type UsuarioPayload = {
	nome: string;
	email: string;
	cpf: string;
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
			CPF_US VARCHAR(11)
		)
	`);

	await db.exec('ALTER TABLE USUARIO ADD COLUMN CPF_US VARCHAR(11)').catch(() => null);
}

async function InserirUsuario(payload: UsuarioPayload) {
	const db = await dbPromise;
	await db.run(
		'INSERT INTO USUARIO(NOME_US, EMAIL_US, CPF_US) VALUES(?,?,?)',
		payload.nome,
		payload.email,
		payload.cpf,
	);
}

async function selectUsuarios() {
	const db = await dbPromise;
	return db.all('SELECT * FROM USUARIO ORDER BY ID_US DESC');
}

async function SelectUsuariosId(cpf: string) {
	const db = await dbPromise;
	return db.get('SELECT * FROM USUARIO WHERE CPF_US = ?', cpf);
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
		await db.run(
			'UPDATE USUARIO SET NOME_US = ?, EMAIL_US = ?, CPF_US = ? WHERE ID_US = ?',
			payload.nome,
			payload.email,
			payload.cpf,
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
