// 마이그레이션은 앞에서부터 한 번씩만 실행된다(PRAGMA user_version). 이미 적용된 항목은 절대 고치지 말고 새 항목을 추가한다.
export const MIGRATIONS: string[] = [
  `
  CREATE TABLE products(
    id TEXT PRIMARY KEY, code TEXT NOT NULL, name TEXT NOT NULL, category TEXT NOT NULL DEFAULT '',
    owner TEXT NOT NULL, consigned INTEGER NOT NULL DEFAULT 0,
    settle TEXT NOT NULL CHECK(settle IN ('personal','joint')),
    price INTEGER NOT NULL CHECK(price >= 0), stock INTEGER NOT NULL CHECK(stock >= 0),
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','returned','disposed','deleted'))
  );
  CREATE TABLE events(
    id TEXT PRIMARY KEY, name TEXT NOT NULL, date TEXT NOT NULL, place TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'prep' CHECK(status IN ('prep','live','done')),
    team_size INTEGER NOT NULL DEFAULT 1 CHECK(team_size >= 1), hypothesis TEXT NOT NULL DEFAULT '',
    currency TEXT NOT NULL DEFAULT 'KRW'
  );
  CREATE TABLE event_items(
    event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES products(id),
    qty INTEGER NOT NULL CHECK(qty >= 0), PRIMARY KEY(event_id, product_id)
  );
  CREATE TABLE sales(
    id TEXT PRIMARY KEY, event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    at INTEGER NOT NULL, pay TEXT NOT NULL CHECK(pay IN ('cash','transfer','mobile','card','other')),
    discount INTEGER NOT NULL DEFAULT 0 CHECK(discount >= 0), extra INTEGER NOT NULL DEFAULT 0 CHECK(extra >= 0),
    voided_at INTEGER
  );
  CREATE TABLE sale_lines(
    sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE, idx INTEGER NOT NULL,
    product_id TEXT NOT NULL, name TEXT NOT NULL, owner TEXT NOT NULL,
    settle TEXT NOT NULL CHECK(settle IN ('personal','joint')),
    qty INTEGER NOT NULL CHECK(qty >= 1), unit_price INTEGER NOT NULL CHECK(unit_price >= 0),
    PRIMARY KEY(sale_id, idx)
  );
  CREATE TABLE costs(
    id TEXT PRIMARY KEY, event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    label TEXT NOT NULL, amount INTEGER NOT NULL CHECK(amount >= 0)
  );
  CREATE INDEX idx_sales_event ON sales(event_id, at);
  `,
];
