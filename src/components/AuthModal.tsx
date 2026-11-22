import React, { useState } from 'react';
import { X, Mail, Lock, User as UserIcon, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useQaza } from '../context/QazaContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup' | 'reset';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
}) => {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword } = useQaza();
  const { tr } = useLanguage();
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const formatAuthError = (err: unknown): string => {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('auth/operation-not-allowed')) {
      return tr(
        'Email/Password sign-in is not yet enabled in Firebase Console. You can sign in with Google right away.',
        'ईमेल/पासवर्ड अभी सक्षम नहीं है। आप सीधे Google से साइन इन कर सकते हैं।'
      );
    }
    if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password')) {
      return tr(
        'Incorrect email or password. Please check your credentials and try again.',
        'ईमेल या पासवर्ड ग़लत है। कृपया दोबारा जांचें।'
      );
    }
    if (msg.includes('auth/email-already-in-use')) {
      return tr(
        'An account with this email already exists. Try signing in instead.',
        'इस ईमेल से खाता पहले से मौजूद है। साइन इन करें।'
      );
    }
    if (msg.includes('auth/weak-password')) {
      return tr('Please choose a password with at least 6 characters.', 'कम से कम 6 अक्षरों का पासवर्ड चुनें।');
    }
    if (msg.includes('auth/popup-closed-by-user')) {
      return tr('Sign-in window was closed before completing.', 'साइन-इन पूरा होने से पहले विंडो बंद हो गई।');
    }
    return msg;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    setLoading(true);
    try {
      if (mode === 'login') {
        await signInWithEmail(email, password);
        onClose();
      } else if (mode === 'signup') {
        await signUpWithEmail(email, password, displayName);
        onClose();
      } else {
        await resetPassword(email);
        setInfoMsg(
          tr(
            'Password reset instructions have been sent to your email.',
            'पासवर्ड रीसेट लिंक आपके ईमेल पर भेज दिया गया है।'
          )
        );
      }
    } catch (err) {
      setErrorMsg(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setErrorMsg(null);
    setInfoMsg(null);
    setLoading(true);
    try {
      await signInWithGoogle();
      onClose();
    } catch (err) {
      setErrorMsg(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#151C19] border border-[#E5E2DC] dark:border-[#242E2A] p-6 sm:p-7 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="auth-modal-title"
              className="text-xl font-semibold text-[#1A1D1B] dark:text-[#F1F3F2]"
            >
              {mode === 'login'
                ? tr('Sign in to QazaFlow', 'QazaFlow में साइन इन करें')
                : mode === 'signup'
                  ? tr('Create your account', 'नया खाता बनाएं')
                  : tr('Reset your password', 'पासवर्ड रीसेट करें')}
            </h2>
            <p className="mt-1 text-sm text-[#5C635E] dark:text-[#9AA59E]">
              {tr(
                'Save your Qaza ledger in the cloud and keep devices in sync.',
                'अपना रिकॉर्ड क्लाउड में सुरक्षित रखें और हर डिवाइस पर सिंक करें।'
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-[#5C635E] hover:bg-[#F1EFE9] dark:hover:bg-[#1D2622] transition-colors"
            aria-label={tr('Close sign in dialog', 'बंद करें')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {mode !== 'reset' && (
          <>
            <button
              type="button"
              disabled={loading}
              onClick={() => void handleGoogle()}
              className="w-full min-h-[44px] flex items-center justify-center gap-3 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-[#F8F7F4] dark:bg-[#0E1311] text-[#1A1D1B] dark:text-[#F1F3F2] text-sm font-medium hover:bg-[#F1EFE9] dark:hover:bg-[#1D2622] transition-colors disabled:opacity-60"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-8.97z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96z"
                />
              </svg>
              <span>{tr('Continue with Google', 'Google से साइन इन करें')}</span>
            </button>

            <div className="flex items-center gap-3 text-xs text-[#7A827D]">
              <div className="h-px flex-1 bg-[#E5E2DC] dark:bg-[#242E2A]" />
              <span>{tr('or with email', 'या ईमेल से')}</span>
              <div className="h-px flex-1 bg-[#E5E2DC] dark:bg-[#242E2A]" />
            </div>
          </>
        )}

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3.5">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-medium text-[#5C635E] dark:text-[#9AA59E] mb-1.5">
                {tr('Name', 'नाम')}
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-[#7A827D] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={tr('Your name', 'आपका नाम')}
                  maxLength={100}
                  className="w-full min-h-[44px] pl-10 pr-3.5 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-[#F8F7F4] dark:bg-[#0E1311] text-sm text-[#1A1D1B] dark:text-[#F1F3F2] focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[#5C635E] dark:text-[#9AA59E] mb-1.5">
              {tr('Email address', 'ईमेल पता')}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#7A827D] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full min-h-[44px] pl-10 pr-3.5 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-[#F8F7F4] dark:bg-[#0E1311] text-sm text-[#1A1D1B] dark:text-[#F1F3F2] focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]"
              />
            </div>
          </div>

          {mode !== 'reset' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-[#5C635E] dark:text-[#9AA59E]">
                  {tr('Password', 'पासवर्ड')}
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('reset');
                      setErrorMsg(null);
                      setInfoMsg(null);
                    }}
                    className="text-xs text-[#1B4D3E] dark:text-[#7FD1B2] hover:underline"
                  >
                    {tr('Forgot password?', 'पासवर्ड भूल गए?')}
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#7A827D] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={tr('Minimum 6 characters', 'कम से कम 6 अक्षर')}
                  className="w-full min-h-[44px] pl-10 pr-3.5 rounded-xl border border-[#E5E2DC] dark:border-[#242E2A] bg-[#F8F7F4] dark:bg-[#0E1311] text-sm text-[#1A1D1B] dark:text-[#F1F3F2] focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]"
                />
              </div>
            </div>
          )}

          {errorMsg && (
            <p className="text-xs text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl p-3 leading-relaxed">
              {errorMsg}
            </p>
          )}

          {infoMsg && (
            <div className="flex items-start gap-2 text-xs text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-xl p-3">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{infoMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-[#1B4D3E] dark:bg-[#2A6F5A] text-white text-sm font-medium hover:bg-[#143B2F] dark:hover:bg-[#225B49] transition-colors disabled:opacity-60"
          >
            <span>
              {loading
                ? tr('Please wait...', 'प्रतीक्षा करें...')
                : mode === 'login'
                  ? tr('Sign In', 'साइन इन')
                  : mode === 'signup'
                    ? tr('Create Account', 'खाता बनाएं')
                    : tr('Send Reset Link', 'रीसेट लिंक भेजें')}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-2 border-t border-[#E5E2DC] dark:border-[#242E2A] flex items-center justify-between text-xs text-[#5C635E] dark:text-[#9AA59E]">
          {mode === 'login' ? (
            <>
              <span>{tr('New to QazaFlow?', 'QazaFlow पर नए हैं?')}</span>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setErrorMsg(null);
                  setInfoMsg(null);
                }}
                className="font-medium text-[#1B4D3E] dark:text-[#7FD1B2] hover:underline"
              >
                {tr('Create an account', 'नया खाता बनाएं')}
              </button>
            </>
          ) : (
            <>
              <span>{tr('Already have an account?', 'पहले से खाता है?')}</span>
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMsg(null);
                  setInfoMsg(null);
                }}
                className="font-medium text-[#1B4D3E] dark:text-[#7FD1B2] hover:underline"
              >
                {tr('Back to sign in', 'साइन इन पर वापस जाएं')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
