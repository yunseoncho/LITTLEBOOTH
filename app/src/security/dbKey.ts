import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const KEY_NAME = 'lb.dbkey.v1';
const OPTS: SecureStore.SecureStoreOptions = {
  // 기기 잠금이 풀려 있을 때만, 이 기기에서만. 백업·새 기기 복원으로 키가 따라가지 않는다(분실 기기에서 데이터를 못 읽게).
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};
export const HEX_KEY = /^[0-9a-f]{64}$/;

const toHex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');

/** 256비트 무작위 DB 키. 키체인에만 두고, 로그·화면·파일에 절대 남기지 않는다. */
export async function getOrCreateDbKey(): Promise<string> {
  const have = await SecureStore.getItemAsync(KEY_NAME, OPTS);
  if (have && HEX_KEY.test(have)) return have;
  const key = toHex(Crypto.getRandomBytes(32));
  await SecureStore.setItemAsync(KEY_NAME, key, OPTS);
  return key;
}
export const deleteDbKey = () => SecureStore.deleteItemAsync(KEY_NAME, OPTS);

// 앱 잠금 설정도 키체인에 둔다(파일 접근만으로는 끌 수 없게). 값이 없으면 "사용"이 기본.
const LOCK_KEY = 'lb.applock.v1';
export async function getLockPref(): Promise<boolean> {
  return (await SecureStore.getItemAsync(LOCK_KEY, OPTS)) !== 'off';
}
export const setLockPref = (on: boolean) => SecureStore.setItemAsync(LOCK_KEY, on ? 'on' : 'off', OPTS);
