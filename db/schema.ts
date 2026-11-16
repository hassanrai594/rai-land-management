import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const estates = sqliteTable('estates', { owner: text('owner').primaryKey(), data: text('data').notNull(), version: integer('version').notNull().default(0) });
