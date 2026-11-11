import * as SQLite from 'expo-sqlite';
import { deleteDbKey, getOrCreateDbKey, HEX_KEY } from '../security/dbKey';
import { MIGRATIONS } from './schema';

export const DB_NAME = 'littlebooth.db';

export class DbOpenError extends Error {
  constructor(public code: 'ENCRYPTION_UNAVAILABLE' | 'KEY_MISMATCH' | 'MIGRATION_FAILED', msg?: string) {
    super(msg ?? code);
  }
}

/**
 * 암호화된(SQLCipher) DB를 연다.
 *  - 릴리스 빌드에서 SQLCipher가 꺼져 있으면 열지 않는다(암호화 없이 조용히 저장되는 사고를 막는다).
 *  - 개발(Expo Go 등 SQLCipher 없는 환경)에서는 경고만 하고 연다.
 *  - 키가 맞지 않으면(예: 기기 변경 후 복원) KEY_MISMATCH → 화면에서 안내 후 초기화를 제안한다.
 */
export async function openDb(): Promise<SQLite.SQLiteDatabase> {
  const key = await getOrCreateDbKey();
  if (!HEX_KEY.test(key)) throw new DbOpenError('KEY_MISMATCH', 'invalid key format'); // PRAGMA에 넣기 전에 한 번 더 검증
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  try {
    await db.execAsync(`PRAGMA key = "x'${key}'";`); // 열자마자, 다른 어떤 쿼리보다 먼저
    const c = await db.getFirstAsync<{ cipher_version: string }>('PRAGMA cipher_version;');
    if (!c?.cipher_version) {
      if (!__DEV__) throw new DbOpenError('ENCRYPTION_UNAVAILABLE');
      console.warn('[db] SQLCipher 없음: 개발 모드라 암호화 없이 엽니다. 릴리스 빌드에서는 열리지 않습니다.');
    }
    try { await db.getFirstAsync('SELECT count(*) AS n FROM sqlite_master;'); }
    catch { throw new DbOpenError('KEY_MISMATCH'); }
    await db.execAsync('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA secure_delete = ON;');
    await migrate(db);
    return db;
  } catch (e) {
    await db.closeAsync().catch(() => {});
    throw e instanceof DbOpenError ? e : new DbOpenError('MIGRATION_FAILED', String(e));
  }
}

async function migrate(db: SQLite.SQLiteDatabase) {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  const from = row?.user_version ?? 0;
  for (let v = from; v < MIGRATIONS.length; v++) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(MIGRATIONS[v]);
      await db.execAsync(`PRAGMA user_version = ${v + 1};`); // v는 우리가 정한 정수라 보간해도 안전
    });
  }
}

/** 모든 데이터 삭제: DB 파일과 키를 함께 지운다. 키를 지우면 남은 조각이 있어도 복호화할 수 없다. */
export async function wipeAll(db?: SQLite.SQLiteDatabase) {
  await db?.closeAsync().catch(() => {});
  await SQLite.deleteDatabaseAsync(DB_NAME).catch(() => {});
  await deleteDbKey().catch(() => {});
}
