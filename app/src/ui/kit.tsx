import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';

export const C = { bg: '#fbfbfa', paper: '#fff', fg: '#1b1b1d', sub: '#55555c', muted: '#8a8a91', line: '#e3e3e6', accent: '#ff4d8d', dark: '#141416', warn: '#c2410c' };

export const Screen = ({ children, style }: { children?: React.ReactNode; style?: ViewStyle }) => <View style={[k.screen, style]}>{children}</View>;
export const Card = ({ children, style }: { children: React.ReactNode; style?: ViewStyle }) => <View style={[k.card, style]}>{children}</View>;
export const H = ({ children }: { children: React.ReactNode }) => <Text style={k.h}>{children}</Text>;
export const P = ({ children, muted, bold }: { children: React.ReactNode; muted?: boolean; bold?: boolean }) =>
  <Text style={[k.p, muted && { color: C.muted }, bold && { fontWeight: '700', color: C.fg }]}>{children}</Text>;
export const Row = ({ children, style }: { children: React.ReactNode; style?: ViewStyle }) => <View style={[k.row, style]}>{children}</View>;

export function Btn({ label, onPress, kind = 'dark', disabled, small }: { label: string; onPress: () => void; kind?: 'dark' | 'line' | 'accent' | 'danger'; disabled?: boolean; small?: boolean }) {
  const bg = kind === 'dark' ? C.dark : kind === 'accent' ? C.accent : kind === 'danger' ? C.warn : 'transparent';
  const fg = kind === 'line' ? C.fg : '#fff';
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress}
      style={[k.btn, { backgroundColor: bg, borderColor: kind === 'line' ? C.line : bg, opacity: disabled ? 0.4 : 1, paddingVertical: small ? 8 : 13 }]}>
      <Text style={{ color: fg, fontWeight: '700', fontSize: small ? 14 : 16 }}>{label}</Text>
    </Pressable>
  );
}
export const Chip = ({ label, on, onPress }: { label: string; on?: boolean; onPress: () => void }) =>
  <Pressable accessibilityRole="button" onPress={onPress} style={[k.chip, on && { backgroundColor: C.dark, borderColor: C.dark }]}><Text style={{ color: on ? '#fff' : C.fg, fontSize: 14 }}>{label}</Text></Pressable>;

export function Field({ label, ...p }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={k.label}>{label}</Text>
      <TextInput {...p} style={k.input} placeholderTextColor={C.muted} autoCorrect={false} />
    </View>
  );
}
export const num = (s: string) => parseInt(s.replace(/[^\d]/g, ''), 10) || 0;

export function Stepper({ value, onChange, max = 9999 }: { value: number; onChange: (n: number) => void; max?: number }) {
  return (
    <Row style={{ gap: 6 }}>
      <Chip label="−" onPress={() => onChange(Math.max(0, value - 1))} />
      <Text style={{ minWidth: 34, textAlign: 'center', fontWeight: '700', fontSize: 16 }}>{value}</Text>
      <Chip label="+" onPress={() => onChange(Math.min(max, value + 1))} />
    </Row>
  );
}

const k = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  card: { backgroundColor: C.paper, borderRadius: 14, borderWidth: 1, borderColor: C.line, padding: 14, gap: 10 },
  h: { fontSize: 20, fontWeight: '800', color: C.fg },
  p: { fontSize: 15, color: C.sub, lineHeight: 22 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  btn: { borderRadius: 12, borderWidth: 1, alignItems: 'center', paddingHorizontal: 16 },
  chip: { borderWidth: 1, borderColor: C.line, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: C.paper },
  label: { fontSize: 13, color: C.muted },
  input: { borderWidth: 1, borderColor: C.line, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, backgroundColor: C.paper, color: C.fg },
});
