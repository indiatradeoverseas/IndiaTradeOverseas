import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { GoogleLogin } from '@react-oauth/google';
import { FcGoogle } from 'react-icons/fc';
import { FiLoader } from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../lib/utils';

/**
 * portal: 'admin' | 'employee' | 'client'
 * onSuccess(response) / onError(message) let the host page keep owning its own
 * toast + navigate + analytics logic, matching the existing password-login pattern.
 *
 * The real @react-oauth/google <GoogleLogin> widget (ID-token/credential flow,
 * unmodified — same props/behavior as before) is rendered invisibly, sized to
 * exactly overlay a fully custom-styled decorative button underneath. This keeps
 * every bit of Google's Identity Services behavior — click, keyboard, focus,
 * the credential callback — completely intact while giving full visual control.
 * The decorative layer is unmounted while disabled so a disabled button is also
 * fully unreachable by keyboard, not just visually dimmed.
 */
const GoogleAuthButton = ({ portal, onSuccess, onError, disabled = false }) => {
  const { googleLogin, adminGoogleLogin } = useAuth();
  const wrapperRef = useRef(null);
  const [buttonWidth, setButtonWidth] = useState(320);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    const node = wrapperRef.current;
    if (!node) return undefined;

    const updateWidth = () => {
      const measured = Math.floor(node.getBoundingClientRect().width);
      if (measured > 0) setButtonWidth(Math.min(400, Math.max(200, measured)));
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const isDisabled = disabled || isAuthenticating;

  const handleGoogleSuccess = async (credentialResponse) => {
    if (!credentialResponse?.credential) {
      onError?.('Google sign-in did not return a valid credential.');
      return;
    }
    setIsAuthenticating(true);
    try {
      const response = portal === 'admin'
        ? await adminGoogleLogin({ credential: credentialResponse.credential })
        : await googleLogin({ credential: credentialResponse.credential, portal });

      if (response.success) {
        onSuccess?.(response);
      } else {
        onError?.(response.message || 'Google sign-in failed.');
        setIsAuthenticating(false);
      }
    } catch (error) {
      onError?.(error.response?.data?.message || 'Google sign-in failed.');
      setIsAuthenticating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[#C5CBD3]/25" />
        <span className="text-[10px] uppercase tracking-[0.2em] text-[#6D7886]">Or continue with</span>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[#C5CBD3]/25" />
      </div>

      <div
        ref={wrapperRef}
        className={cn(
          'group relative w-full select-none',
          isDisabled && 'pointer-events-none opacity-50'
        )}
      >
        {/* Soft ambient glow, only visible on hover/focus */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-[3px] rounded-md bg-gradient-to-r from-[#4285F4]/0 via-[#C5CBD3]/25 to-[#4285F4]/0 opacity-0 blur-md transition-opacity duration-300 ease-out group-hover:opacity-100 group-focus-within:opacity-100"
        />

        {/* Decorative, fully custom visible button */}
        <div
          role={isDisabled ? 'button' : undefined}
          aria-hidden={!isDisabled}
          aria-disabled={isDisabled || undefined}
          tabIndex={-1}
          className={cn(
            'relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-sm border py-3.5 text-[13px] font-medium tracking-wide',
            'border-[#C5CBD3]/20 bg-gradient-to-b from-[#12161D] to-[#0B0F15] text-[#F2F4F7]',
            'shadow-[inset_0_1px_0_0_rgba(242,244,247,0.06),0_1px_2px_rgba(0,0,0,0.4)]',
            'transition-[transform,box-shadow,border-color] duration-200 ease-out',
            'group-hover:-translate-y-px group-hover:border-[#C5CBD3]/40',
            'group-hover:shadow-[inset_0_1px_0_0_rgba(242,244,247,0.08),0_10px_24px_-10px_rgba(0,0,0,0.65)]',
            'group-focus-within:border-[#C5CBD3]/50 group-focus-within:ring-1 group-focus-within:ring-[#C5CBD3]/40 group-focus-within:ring-offset-2 group-focus-within:ring-offset-[#040A12]',
            'group-active:translate-y-0 group-active:scale-[0.985]'
          )}
        >
          {/* Diagonal sheen sweep on hover */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent opacity-0 transition-all duration-700 ease-out group-hover:left-full group-hover:opacity-100"
          />

          {isAuthenticating ? (
            <>
              <motion.span
                className="inline-flex"
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
              >
                <FiLoader className="h-4 w-4 text-[#C5CBD3]" />
              </motion.span>
              <span>Signing in&hellip;</span>
            </>
          ) : (
            <>
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.35)] transition-transform duration-200 ease-out group-hover:scale-105">
                <FcGoogle className="h-3.5 w-3.5" />
              </span>
              <span>Continue with Google</span>
            </>
          )}
        </div>

        {/* Real Google Identity button — invisible, exact same box, owns all real interaction */}
        {!isDisabled && (
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden opacity-0">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => onError?.('Google sign-in failed. Please try again.')}
              theme="filled_black"
              shape="rectangular"
              size="large"
              text="continue_with"
              width={String(buttonWidth)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default GoogleAuthButton;
