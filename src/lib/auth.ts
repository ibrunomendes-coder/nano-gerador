import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

// Arquivo local para armazenar usuários
const USERS_FILE = path.join(process.cwd(), 'data', 'users.json');

interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  createdAt: string;
}

// Garante que o diretório data existe
function ensureDataDir() {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// Lê usuários do arquivo
function getUsers(): User[] {
  ensureDataDir();
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify([]));
    return [];
  }
  const data = fs.readFileSync(USERS_FILE, 'utf-8');
  return JSON.parse(data);
}

// Salva usuários no arquivo
function saveUsers(users: User[]) {
  ensureDataDir();
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// Busca usuário por email
export function findUserByEmail(email: string): User | undefined {
  const users = getUsers();
  return users.find(u => u.email.toLowerCase() === email.toLowerCase());
}

// Cria novo usuário
export async function createUser(name: string, email: string, password: string): Promise<User> {
  const users = getUsers();

  // Verifica se email já existe
  if (findUserByEmail(email)) {
    throw new Error('Email já cadastrado');
  }

  // Hash da senha
  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser: User = {
    id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name,
    email: email.toLowerCase(),
    password: hashedPassword,
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  saveUsers(users);

  return newUser;
}

// Verifica credenciais
export async function verifyCredentials(email: string, password: string): Promise<User | null> {
  const user = findUserByEmail(email);
  if (!user) return null;

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) return null;

  return user;
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email e senha são obrigatórios');
        }

        const user = await verifyCredentials(credentials.email, credentials.password);

        if (!user) {
          throw new Error('Email ou senha incorretos');
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 dias
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
      }
      return session;
    },
  },
};
