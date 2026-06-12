// Loads environment files before any other server module reads process.env.
// .env.local wins over .env (dotenv does not override already-set vars).
import { config } from 'dotenv';

config({ path: '.env.local' });
config({ path: '.env' });
