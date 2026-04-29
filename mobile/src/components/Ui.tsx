import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, Pressable, ActivityIndicator, StyleSheet,
  Animated, Modal, Platform, type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme, type Colors, FONT, RADIUS, SPACE } from '../theme';

// ── Button ────────────────────────────────────────────────────────────────────

interface ButtonProps {
  onPress: () => void;
  label: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({ onPress, label, variant = 'primary', size = 'md', loading, disabled, style }: ButtonProps) {
  const { C } = useTheme();
  const bg = variant === 'primary' ? C.accent
    : variant === 'danger' ? C.danger
    : variant === 'secondary' ? C.surface
    : 'transparent';
  const fg = variant === 'primary' || variant === 'danger' ? '#fff'
    : variant === 'ghost' ? C.accent
    : C.text;
  const border = variant === 'secondary' ? C.borderStrong : 'transparent';

  const py = size === 'sm' ? 9 : size === 'lg' ? 16 : 12;
  const px = size === 'sm' ? 14 : size === 'lg' ? 24 : 18;
  const fs = size === 'sm' ? FONT.sm : size === 'lg' ? FONT.lg : FONT.base;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [{
        backgroundColor: bg,
        borderWidth: variant === 'secondary' ? 1 : 0,
        borderColor: border,
        borderRadius: RADIUS.md,
        paddingVertical: py,
        paddingHorizontal: px,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        opacity: (disabled || loading) ? 0.45 : pressed ? 0.75 : 1,
      }, style]}
    >
      {loading
        ? <ActivityIndicator color={fg} size="small" />
        : <Text style={{ color: fg, fontSize: fs, fontWeight: '600', letterSpacing: -0.2 }}>{label}</Text>
      }
    </Pressable>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
}

export function Card({ children, style, padding = SPACE[4] }: CardProps) {
  const { C } = useTheme();
  return (
    <View style={[{
      backgroundColor: C.surface,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: C.border,
      padding,
      overflow: 'hidden',
    }, style]}>
      {children}
    </View>
  );
}

// ── SectionHeader ─────────────────────────────────────────────────────────────

interface SectionHeaderProps {
  title: string;
  count?: number;
  action?: { label: string; onPress: () => void };
}

export function SectionHeader({ title, count, action }: SectionHeaderProps) {
  const { C } = useTheme();
  return (
    <View style={sh.row}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE[2] }}>
        <Text style={{ fontSize: FONT.xs, fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.9 }}>
          {title}
        </Text>
        {count !== undefined && count > 0 && (
          <View style={{ backgroundColor: C.overlay, borderRadius: RADIUS.full, paddingHorizontal: 7, paddingVertical: 2 }}>
            <Text style={{ fontSize: FONT.xs, fontWeight: '600', color: C.muted }}>{count}</Text>
          </View>
        )}
      </View>
      {action && (
        <Pressable onPress={action.onPress} hitSlop={8}>
          <Text style={{ fontSize: FONT.sm, color: C.accent, fontWeight: '600' }}>{action.label}</Text>
        </Pressable>
      )}
    </View>
  );
}

const sh = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACE[2] },
});

// ── Badge ─────────────────────────────────────────────────────────────────────

interface BadgeProps {
  label: string;
  variant?: 'default' | 'danger' | 'warning' | 'success' | 'muted' | 'accent' | 'info';
}

export function Badge({ label, variant = 'default' }: BadgeProps) {
  const { C } = useTheme();
  const bg = variant === 'danger' ? C.dangerBg
    : variant === 'warning' ? C.warningBg
    : variant === 'success' ? C.successBg
    : variant === 'accent' ? C.accentSubtle
    : variant === 'info' ? C.accentSubtle
    : C.overlay;
  const fg = variant === 'danger' ? C.danger
    : variant === 'warning' ? C.warning
    : variant === 'success' ? C.success
    : variant === 'accent' ? C.accent
    : variant === 'info' ? C.accent
    : C.muted;

  return (
    <View style={{ backgroundColor: bg, borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 3 }}>
      <Text style={{ fontSize: FONT.xs, color: fg, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

// ── EmptyState ────────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  title?: string;
  message: string;
  action?: { label: string; onPress: () => void };
}

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  const { C } = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: SPACE[8], paddingHorizontal: SPACE[6] }}>
      {icon && (
        <View style={{
          width: 56, height: 56, borderRadius: RADIUS.full,
          backgroundColor: C.overlay,
          alignItems: 'center', justifyContent: 'center',
          marginBottom: SPACE[3],
        }}>
          <Ionicons name={icon} size={26} color={C.mutedLight} />
        </View>
      )}
      {title && (
        <Text style={{ fontSize: FONT.base, fontWeight: '600', color: C.muted, textAlign: 'center', marginBottom: 4 }}>
          {title}
        </Text>
      )}
      <Text style={{ fontSize: FONT.sm, color: C.mutedLight, textAlign: 'center', lineHeight: 20 }}>{message}</Text>
      {action && (
        <Pressable
          onPress={action.onPress}
          style={({ pressed }) => [{
            marginTop: SPACE[4],
            backgroundColor: C.accentSubtle,
            borderRadius: RADIUS.md,
            paddingVertical: 10,
            paddingHorizontal: SPACE[5],
            opacity: pressed ? 0.7 : 1,
          }]}
          hitSlop={8}
        >
          <Text style={{ fontSize: FONT.sm, color: C.accent, fontWeight: '600' }}>{action.label}</Text>
        </Pressable>
      )}
    </View>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 16, borderRadius = RADIUS.sm, style }: SkeletonProps) {
  const { C, scheme } = useTheme();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [scheme === 'dark' ? 0.15 : 0.08, scheme === 'dark' ? 0.3 : 0.18] });

  return (
    <Animated.View style={[{ width: width as any, height, borderRadius, backgroundColor: C.muted, opacity }, style]} />
  );
}

// ── SkeletonCard ──────────────────────────────────────────────────────────────

export function SkeletonCard({ rows = 2 }: { rows?: number }) {
  return (
    <Card>
      <View style={{ gap: SPACE[3] }}>
        {Array.from({ length: rows }).map((_, i) => (
          <View key={i} style={{ gap: SPACE[2] }}>
            <Skeleton height={14} width="60%" />
            <Skeleton height={12} width="40%" />
          </View>
        ))}
      </View>
    </Card>
  );
}

// ── Divider ───────────────────────────────────────────────────────────────────

export function Divider({ style }: { style?: ViewStyle }) {
  const { C } = useTheme();
  return <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: C.borderStrong }, style]} />;
}

// ── Spinner ───────────────────────────────────────────────────────────────────

export function Spinner({ style }: { style?: ViewStyle }) {
  const { C } = useTheme();
  return (
    <View style={[{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACE[8] }, style]}>
      <ActivityIndicator size="large" color={C.accent} />
    </View>
  );
}

// ── FormField ─────────────────────────────────────────────────────────────────

interface FormFieldProps {
  label: string;
  error?: string;
  children: React.ReactNode;
}

export function FormField({ label, error, children }: FormFieldProps) {
  const { C } = useTheme();
  return (
    <View style={{ marginBottom: SPACE[4] }}>
      <Text style={{ fontSize: FONT.sm, fontWeight: '600', color: C.muted, marginBottom: 6, letterSpacing: 0.2 }}>
        {label}
      </Text>
      {children}
      {!!error && <Text style={{ fontSize: FONT.xs, color: C.danger, marginTop: 4 }}>{error}</Text>}
    </View>
  );
}

export function inputStyle(C: Colors) {
  return {
    borderWidth: 1 as const,
    borderColor: C.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACE[4],
    paddingVertical: SPACE[3],
    fontSize: FONT.base,
    color: C.text,
    backgroundColor: C.inputBg,
  };
}

// ── DateField ─────────────────────────────────────────────────────────────────

interface DateFieldProps {
  value: Date;
  onChange: (date: Date) => void;
  maximumDate?: Date;
  minimumDate?: Date;
}

export function DateField({ value, onChange, maximumDate, minimumDate }: DateFieldProps) {
  const { C, scheme } = useTheme();
  const [show, setShow] = useState(false);

  const formatted = value.toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

  function handleChange(_: any, selected?: Date) {
    if (Platform.OS === 'android') setShow(false);
    if (selected) onChange(selected);
  }

  return (
    <>
      <Pressable
        onPress={() => setShow(true)}
        style={({ pressed }) => [{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          borderWidth: 1, borderColor: C.border, borderRadius: RADIUS.md,
          paddingHorizontal: SPACE[4], paddingVertical: SPACE[3],
          backgroundColor: C.inputBg,
          opacity: pressed ? 0.75 : 1,
        }]}
      >
        <Text style={{ fontSize: FONT.base, color: C.text, fontWeight: '500' }}>{formatted}</Text>
        <Ionicons name="calendar-outline" size={18} color={C.muted} />
      </Pressable>

      {/* Android: renders as a native dialog when visible */}
      {Platform.OS === 'android' && show && (
        <DateTimePicker
          value={value}
          mode="date"
          display="default"
          onChange={handleChange}
          maximumDate={maximumDate}
          minimumDate={minimumDate}
        />
      )}

      {/* iOS: bottom sheet modal with spinner picker */}
      {Platform.OS === 'ios' && (
        <Modal visible={show} transparent animationType="slide">
          <Pressable
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }}
            onPress={() => setShow(false)}
          />
          <View style={{
            backgroundColor: C.surface,
            borderTopLeftRadius: RADIUS.xl,
            borderTopRightRadius: RADIUS.xl,
            paddingBottom: 24,
          }}>
            {/* Handle */}
            <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: C.borderStrong }} />
            </View>
            {/* Header */}
            <View style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              paddingHorizontal: SPACE[5], paddingVertical: SPACE[3],
              borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.borderSubtle,
            }}>
              <Text style={{ fontSize: FONT.base, fontWeight: '600', color: C.text }}>Select date</Text>
              <Pressable onPress={() => setShow(false)} hitSlop={12}>
                <Text style={{ fontSize: FONT.base, color: C.accent, fontWeight: '700' }}>Done</Text>
              </Pressable>
            </View>
            <DateTimePicker
              value={value}
              mode="date"
              display="spinner"
              onChange={handleChange}
              maximumDate={maximumDate}
              minimumDate={minimumDate}
              themeVariant={scheme}
              style={{ height: 200 }}
            />
          </View>
        </Modal>
      )}
    </>
  );
}

// ── ChipGroup ─────────────────────────────────────────────────────────────────

interface ChipGroupProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  wrap?: boolean;
}

export function ChipGroup({ options, value, onChange, wrap = false }: ChipGroupProps) {
  const { C } = useTheme();

  const chips = options.map((opt) => {
    const active = opt.value === value;
    return (
      <Pressable
        key={opt.value}
        onPress={() => onChange(opt.value)}
        style={({ pressed }) => [{
          paddingHorizontal: SPACE[3] + 2,
          paddingVertical: SPACE[2],
          borderRadius: RADIUS.full,
          borderWidth: 1.5,
          borderColor: active ? C.accent : C.border,
          backgroundColor: active ? C.accent : C.surface,
          opacity: pressed ? 0.75 : 1,
        }]}
      >
        <Text style={{
          fontSize: FONT.sm,
          color: active ? '#fff' : C.muted,
          fontWeight: active ? '700' : '500',
        }}>
          {opt.label}
        </Text>
      </Pressable>
    );
  });

  if (wrap) {
    return (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE[2] }}>
        {chips}
      </View>
    );
  }

  // Horizontal scroll for longer lists
  return (
    <View style={{ marginHorizontal: -2 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'nowrap', gap: SPACE[2], paddingHorizontal: 2, paddingBottom: 2 }}>
        {chips}
      </View>
    </View>
  );
}

// ── UndoToast ─────────────────────────────────────────────────────────────────

interface UndoToastState {
  message: string;
  onUndo: () => void;
}

export function useUndoToast() {
  const [toast, setToast] = useState<UndoToastState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast(null);
  }, []);

  const show = useCallback((message: string, onUndo: () => void) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ message, onUndo });
    timerRef.current = setTimeout(() => setToast(null), 5000);
  }, []);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return { show, dismiss, toast };
}

function UndoToast({ message, onUndo, onDismiss }: UndoToastState & { onDismiss: () => void }) {
  const { C } = useTheme();
  return (
    <View style={[ut.wrap, { backgroundColor: C.text }]}>
      <Text style={{ fontSize: FONT.sm, color: C.bg, flex: 1 }} numberOfLines={1}>
        {message}
      </Text>
      <Pressable onPress={onUndo} hitSlop={8} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
        <Text style={{ fontSize: FONT.sm, color: C.accent, fontWeight: '700', marginLeft: SPACE[3] }}>
          Undo
        </Text>
      </Pressable>
      <Pressable onPress={onDismiss} hitSlop={8} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, marginLeft: SPACE[3] }]}>
        <Ionicons name="close" size={16} color={C.muted} />
      </Pressable>
    </View>
  );
}

/** Render this inside the screen's root View, at the bottom. */
export function UndoToastSlot({ toast, onDismiss }: { toast: UndoToastState | null; onDismiss: () => void }) {
  if (!toast) return null;
  return <UndoToast message={toast.message} onUndo={toast.onUndo} onDismiss={onDismiss} />;
}

const ut = StyleSheet.create({
  wrap: {
    position: 'absolute', bottom: 16, left: 16, right: 16,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACE[4], paddingVertical: SPACE[3],
    borderRadius: RADIUS.lg,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    zIndex: 999,
  },
});

// ── Row (list item) ───────────────────────────────────────────────────────────

interface RowProps {
  left: React.ReactNode;
  right?: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  first?: boolean;
}

export function Row({ left, right, onPress, onLongPress, first }: RowProps) {
  const { C } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACE[3],
        paddingHorizontal: SPACE[4],
        borderTopWidth: first ? 0 : StyleSheet.hairlineWidth,
        borderTopColor: C.borderSubtle,
        backgroundColor: pressed && onPress ? C.overlay : 'transparent',
      }]}
    >
      <View style={{ flex: 1 }}>{left}</View>
      {right && <View style={{ marginLeft: SPACE[3] }}>{right}</View>}
    </Pressable>
  );
}
