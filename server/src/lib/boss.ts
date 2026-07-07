import { PgBoss } from 'pg-boss';

export const boss = new PgBoss({ connectionString: process.env.DATABASE_URL });

boss.on('error', error => console.error('pg-boss error:', error));
