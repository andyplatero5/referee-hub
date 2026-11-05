import 'dotenv/config';
import { loadEnv } from './env';

// Se valida una sola vez al arrancar: si falta algo, el proceso falla con un mensaje claro.
export const env = loadEnv();
