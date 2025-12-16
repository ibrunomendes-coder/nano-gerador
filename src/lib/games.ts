import fs from 'fs';
import path from 'path';
import { GameType, Difficulty, CrosswordPuzzle, WordSearchPuzzle, GeneratedWord } from '@/types';

// Arquivo local para armazenar jogos (compartilhado entre todos os usuários)
const GAMES_FILE = path.join(process.cwd(), 'data', 'games.json');

export type GameStatus = 'draft' | 'complete' | 'published';

export interface SavedGame {
  id: string;
  // Metadados
  title: string;
  theme: string;
  gameType: GameType;
  difficulty: Difficulty;
  status: GameStatus;
  // Dados do jogo
  words: GeneratedWord[];
  description: string;
  puzzle: CrosswordPuzzle | WordSearchPuzzle | null;
  // Controle
  createdBy: string; // email do usuário
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  // Flags
  isTested: boolean;
  isPublished: boolean;
}

// Garante que o diretório data existe
function ensureDataDir() {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// Lê jogos do arquivo
export function getGames(): SavedGame[] {
  ensureDataDir();
  if (!fs.existsSync(GAMES_FILE)) {
    fs.writeFileSync(GAMES_FILE, JSON.stringify([]));
    return [];
  }
  const data = fs.readFileSync(GAMES_FILE, 'utf-8');
  return JSON.parse(data);
}

// Salva jogos no arquivo
function saveGames(games: SavedGame[]) {
  ensureDataDir();
  fs.writeFileSync(GAMES_FILE, JSON.stringify(games, null, 2));
}

// Busca jogo por ID
export function getGameById(id: string): SavedGame | undefined {
  const games = getGames();
  return games.find(g => g.id === id);
}

// Cria ou atualiza jogo
export function saveGame(game: Omit<SavedGame, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): SavedGame {
  const games = getGames();
  const now = new Date().toISOString();

  if (game.id) {
    // Atualiza jogo existente
    const index = games.findIndex(g => g.id === game.id);
    if (index !== -1) {
      const updated: SavedGame = {
        ...games[index],
        ...game,
        id: game.id,
        updatedAt: now,
      };
      games[index] = updated;
      saveGames(games);
      return updated;
    }
  }

  // Cria novo jogo
  const newGame: SavedGame = {
    ...game,
    id: `game_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    createdAt: now,
    updatedAt: now,
  } as SavedGame;

  games.unshift(newGame); // Adiciona no início (mais recentes primeiro)
  saveGames(games);
  return newGame;
}

// Deleta jogo
export function deleteGame(id: string): boolean {
  const games = getGames();
  const index = games.findIndex(g => g.id === id);
  if (index === -1) return false;

  games.splice(index, 1);
  saveGames(games);
  return true;
}

// Atualiza status do jogo
export function updateGameStatus(id: string, updates: Partial<Pick<SavedGame, 'isTested' | 'isPublished' | 'status'>>): SavedGame | null {
  const games = getGames();
  const index = games.findIndex(g => g.id === id);
  if (index === -1) return null;

  games[index] = {
    ...games[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  saveGames(games);
  return games[index];
}

// Lista jogos com filtros
export function listGames(filters?: {
  status?: GameStatus;
  gameType?: GameType;
  createdBy?: string;
}): SavedGame[] {
  let games = getGames();

  if (filters?.status) {
    games = games.filter(g => g.status === filters.status);
  }
  if (filters?.gameType) {
    games = games.filter(g => g.gameType === filters.gameType);
  }
  if (filters?.createdBy) {
    games = games.filter(g => g.createdBy === filters.createdBy);
  }

  return games;
}
