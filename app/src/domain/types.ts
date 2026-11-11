// 도메인 타입 — UI·DB와 무관한 순수 타입. 금액은 통화의 최소 단위 정수(원·엔은 그대로, 달러·위안은 센트·펀).
export type PayMethod = 'cash' | 'transfer' | 'mobile' | 'card' | 'other';
export type SettleKind = 'personal' | 'joint'; // 개인 정산(담당자에게) | 공동 정산(비용을 뺀 뒤 n/1)
export type ProductStatus = 'active' | 'returned' | 'disposed' | 'deleted';
export type DisplayStatus = ProductStatus | 'soldout';
export type EventStatus = 'prep' | 'live' | 'done';

export interface Product {
  id: string;
  code: string;
  name: string;
  category: string;
  owner: string; // 담당자(별명 권장 — 실명을 쓰지 않아도 되게)
  consigned: boolean; // true면 위탁(남의 물건)
  settle: SettleKind;
  price: number;
  stock: number;
  status: ProductStatus;
}

// 판매 시점의 담당자·정산 구분을 복사해 둔다. 나중에 상품 정보를 고쳐도 과거 정산이 바뀌지 않게 하기 위함.
export interface SaleLine {
  productId: string;
  name: string;
  owner: string;
  settle: SettleKind;
  qty: number;
  unitPrice: number;
}

export interface Sale {
  id: string;
  eventId: string;
  at: number; // epoch ms
  pay: PayMethod;
  lines: SaleLine[];
  discount: number; // 세트·현장 할인 합계(공동 쪽에서 뺀다)
  extra: number; // 옵션·포장 등 추가금(공동 쪽에 더한다)
  voidedAt: number | null; // 취소는 삭제가 아니라 표시(이력 보존)
}

export interface EventInfo {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  place: string;
  status: EventStatus;
  teamSize: number; // 공동 정산을 나눌 인원
  hypothesis: string; // 이번 행사에서 확인할 것
  currency: string; // ISO 4217
}

export interface EventCost {
  id: string;
  eventId: string;
  label: string;
  amount: number;
}
