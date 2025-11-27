import { Router } from 'express';
import { loadCharacters, forceReloadCharacters } from '../../../packages/core/src/index';

const router = Router();

// Admin endpoint to list all characters
router.get('/characters', (_req, res) => {
  const characters = loadCharacters();
  res.json(characters.characters); // Return only the characters array
});

// Admin endpoint to force reload characters from disk
router.post('/characters/reload', (_req, res) => {
  const reloadedCharacters = forceReloadCharacters();
  res.json({ status: 'reloaded', count: reloadedCharacters.characters.length });
});

export { router };


