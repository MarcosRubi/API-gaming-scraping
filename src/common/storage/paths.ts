import { join } from 'node:path';

// data/ vive en la raíz del proyecto (montado como volumen en Docker).
export const DATA_DIR = join(process.cwd(), 'data');
export const dataPath = (file: string) => join(DATA_DIR, file);
