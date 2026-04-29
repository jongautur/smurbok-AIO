import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, Pressable, Image,
  ActivityIndicator, KeyboardAvoidingView,
  Platform, Alert, ScrollView,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import { auth as firebaseAuth } from '@/lib/firebase';
import { auth as api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useTheme, FONT, RADIUS, SPACE } from '@/theme';

WebBrowser.maybeCompleteAuthSession();

type Mode = 'login' | 'signup' | 'magic';

export default function LoginScreen() {
  const { C } = useTheme();
  const { signInWithMagicLink, signInWithFirebaseToken } = useAuth();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Magic link state
  const [magicSent, setMagicSent] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Google OAuth — disable PKCE on insecure web origins (HTTP non-localhost) where WebCrypto is unavailable
  const pkceAvailable = Platform.OS !== 'web' || (typeof window !== 'undefined' && !!window.crypto?.subtle);
  const [googleRequest, googleResponse, googlePrompt] = Google.useIdTokenAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    usePKCE: pkceAvailable,
  });

  useEffect(() => {
    if (googleResponse?.type === 'success') {
      handleGoogleCredential(googleResponse.params.id_token);
    }
  }, [googleResponse]);

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  function switchMode(next: Mode) {
    setMode(next);
    setError('');
    setPassword('');
    setConfirm('');
    setMagicSent(false);
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }

  async function handleGoogleCredential(idToken: string) {
    setLoading(true);
    setError('');
    try {
      const credential = GoogleAuthProvider.credential(idToken);
      const result = await signInWithCredential(firebaseAuth, credential);
      const firebaseToken = await result.user.getIdToken();
      await signInWithFirebaseToken(firebaseToken);
    } catch (e: any) {
      setError(e?.message ?? 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailLogin() {
    if (!email.trim() || !password) return;
    setLoading(true);
    setError('');
    try {
      const result = await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
      const firebaseToken = await result.user.getIdToken();
      await signInWithFirebaseToken(firebaseToken);
    } catch (e: any) {
      const code = e?.code ?? '';
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        setError('Invalid email or password');
      } else {
        setError(e?.message ?? 'Sign in failed');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailSignup() {
    if (!email.trim() || !password) return;
    if (password !== confirm) { setError('Passwords do not match'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    setError('');
    try {
      const result = await createUserWithEmailAndPassword(firebaseAuth, email.trim(), password);
      if (name.trim()) {
        await updateProfile(result.user, { displayName: name.trim() });
      }
      const firebaseToken = await result.user.getIdToken();
      await signInWithFirebaseToken(firebaseToken);
    } catch (e: any) {
      const code = e?.code ?? '';
      if (code === 'auth/email-already-in-use') {
        setError('An account with this email already exists');
      } else if (code === 'auth/weak-password') {
        setError('Password is too weak');
      } else {
        setError(e?.message ?? 'Sign up failed');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleMagicLink() {
    if (!email.trim().includes('@')) { setError('Enter a valid email address'); return; }
    setLoading(true);
    setError('');
    const sessionId = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
          const r = Math.random() * 16 | 0;
          return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    try {
      await api.requestMagicLink(email.trim(), sessionId);
      setMagicSent(true);
      startPolling(sessionId);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to send email');
    } finally {
      setLoading(false);
    }
  }

  function startPolling(sessionId: string) {
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      if (attempts > 300) {
        clearInterval(pollRef.current!);
        setMagicSent(false);
        setError('Link expired. Please try again.');
        return;
      }
      try {
        const result = await api.pollMagicLink(sessionId);
        if (result.status === 'verified' && result.token) {
          clearInterval(pollRef.current!);
          await signInWithMagicLink(result.token);
        }
      } catch {}
    }, 3000);
  }

  // ── Shared styles ─────────────────────────────────────────────────────────
  const inputS = {
    borderWidth: 1 as const,
    borderColor: C.border,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    paddingHorizontal: SPACE[4],
    fontSize: FONT.base,
    color: C.text,
    backgroundColor: C.inputBg,
    marginBottom: SPACE[3],
  };

  const primaryBtn = (disabled?: boolean) => ({
    backgroundColor: C.accent,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    alignItems: 'center' as const,
    opacity: disabled ? 0.45 : 1,
    marginTop: SPACE[1],
  });

  const secondaryBtn = {
    backgroundColor: C.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 14,
    alignItems: 'center' as const,
    marginTop: SPACE[3],
  };

  // ── Magic link sent state ──────────────────────────────────────────────────
  if (mode === 'magic' && magicSent) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACE[8], backgroundColor: C.bg }}>
        <Image source={require('../../assets/logo.png')} style={{ width: 80, height: 80, marginBottom: SPACE[3] }} resizeMode="contain" />
        <Text style={{ fontSize: FONT['3xl'], fontWeight: '700', color: C.text, marginBottom: SPACE[6] }}>Smurbók</Text>
        <ActivityIndicator size="large" color={C.accent} style={{ marginBottom: SPACE[4] }} />
        <Text style={{ fontSize: FONT.base, color: C.text, fontWeight: '600', marginBottom: SPACE[2] }}>
          Check your email
        </Text>
        <Text style={{ fontSize: FONT.sm, color: C.muted, textAlign: 'center', marginBottom: SPACE[6] }}>
          Tap the link we sent to {email}
        </Text>
        {!!error && <Text style={{ color: C.danger, fontSize: FONT.sm, marginBottom: SPACE[3] }}>{error}</Text>}
        <Pressable onPress={() => { setMagicSent(false); if (pollRef.current) clearInterval(pollRef.current); }} style={{ padding: SPACE[2] }}>
          <Text style={{ color: C.accent, fontSize: FONT.sm, textDecorationLine: 'underline' }}>Send a new link</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: SPACE[6] }}
        keyboardShouldPersistTaps="handled"
      >
        <Image source={require('../../assets/logo.png')} style={{ width: 80, height: 80, marginBottom: SPACE[3] }} resizeMode="contain" />
        <Text style={{ fontSize: FONT['3xl'], fontWeight: '700', color: C.text, marginBottom: SPACE[6] }}>Smurbók</Text>

        {/* Mode tabs */}
        <View style={{
          flexDirection: 'row', borderWidth: 1, borderColor: C.border,
          borderRadius: RADIUS.md, overflow: 'hidden', width: '100%', marginBottom: SPACE[5],
        }}>
          {(['login', 'signup', 'magic'] as Mode[]).map((m) => (
            <Pressable
              key={m}
              onPress={() => switchMode(m)}
              style={{
                flex: 1, paddingVertical: 10, alignItems: 'center',
                backgroundColor: mode === m ? C.accent : C.surface,
              }}
            >
              <Text style={{ fontSize: FONT.sm, fontWeight: '600', color: mode === m ? '#fff' : C.muted }}>
                {m === 'login' ? 'Login' : m === 'signup' ? 'Sign up' : 'Magic link'}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={{ width: '100%' }}>
          {/* ── Magic link ────────────────────────────────────────────────── */}
          {mode === 'magic' && (
            <>
              <Text style={{ fontSize: FONT.sm, color: C.muted, marginBottom: SPACE[4] }}>
                We'll email you a link — no password needed.
              </Text>
              <TextInput
                style={inputS}
                placeholder="you@example.com"
                placeholderTextColor={C.mutedLight}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
              />
              {!!error && <Text style={{ color: C.danger, fontSize: FONT.sm, marginBottom: SPACE[2] }}>{error}</Text>}
              <Pressable
                style={primaryBtn(loading || !email.trim())}
                onPress={handleMagicLink}
                disabled={loading || !email.trim()}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={{ color: '#fff', fontSize: FONT.base, fontWeight: '600' }}>Send magic link</Text>
                }
              </Pressable>
            </>
          )}

          {/* ── Email / Password ──────────────────────────────────────────── */}
          {(mode === 'login' || mode === 'signup') && (
            <>
              {mode === 'signup' && (
                <TextInput
                  style={inputS}
                  placeholder="Full name"
                  placeholderTextColor={C.mutedLight}
                  value={name}
                  onChangeText={setName}
                  autoCorrect={false}
                />
              )}
              <TextInput
                style={inputS}
                placeholder="Email"
                placeholderTextColor={C.mutedLight}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
              />
              <TextInput
                style={inputS}
                placeholder="Password"
                placeholderTextColor={C.mutedLight}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
              {mode === 'signup' && (
                <TextInput
                  style={inputS}
                  placeholder="Confirm password"
                  placeholderTextColor={C.mutedLight}
                  value={confirm}
                  onChangeText={setConfirm}
                  secureTextEntry
                />
              )}

              {!!error && <Text style={{ color: C.danger, fontSize: FONT.sm, marginBottom: SPACE[2] }}>{error}</Text>}

              <Pressable
                style={primaryBtn(loading || !email.trim() || !password)}
                onPress={mode === 'login' ? handleEmailLogin : handleEmailSignup}
                disabled={loading || !email.trim() || !password}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={{ color: '#fff', fontSize: FONT.base, fontWeight: '600' }}>
                      {mode === 'login' ? 'Sign in' : 'Create account'}
                    </Text>
                }
              </Pressable>

              {/* Divider */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: SPACE[4] }}>
                <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
                <Text style={{ color: C.muted, fontSize: FONT.xs, marginHorizontal: SPACE[3] }}>or</Text>
                <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
              </View>

              {/* Google */}
              <Pressable
                style={({ pressed }) => [secondaryBtn, { opacity: pressed ? 0.7 : 1 }]}
                onPress={() => googlePrompt()}
                disabled={!googleRequest || loading}
              >
                <Text style={{ color: C.text, fontSize: FONT.base, fontWeight: '500' }}>
                  {mode === 'login' ? 'Continue with Google' : 'Sign up with Google'}
                </Text>
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
