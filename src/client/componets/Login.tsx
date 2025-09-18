import { ChangeEvent, FormEvent, useCallback, useMemo, useState } from "react";
import styled from "@emotion/styled";
import { useAuth, LoginResult } from "../hooks/AuthProvider";
import { LogoImage } from "./LogoImage";
import { FormControl } from "./FormControl";
import { Page } from "./Page";
import { ErrorMessage } from "./ErrorMessage";

const LoginShell = styled(Page)({
  alignItems: "center",
  textAlign: "center",
  gap: 32,
});

const LoginCard = styled.section({
  width: "min(520px, 100%)",
  background: "var(--color-surface)",
  borderRadius: "var(--border-radius-lg)",
  padding: "clamp(26px, 5vw, 38px)",
  boxShadow: "var(--shadow-soft)",
  border: "1px solid rgba(255, 255, 255, 0.45)",
  display: "flex",
  flexDirection: "column",
  gap: 24,
});

const Intro = styled.div({
  display: "flex",
  flexDirection: "column",
  gap: 8,
});

const LoginHeading = styled.h1({
  fontSize: "clamp(1.8rem, 4vw, 2.4rem)",
  margin: 0,
  fontWeight: 700,
});

const LoginDescription = styled.p({
  margin: 0,
  color: "var(--color-text-muted)",
});

const LoginForm = styled.form({
  display: "flex",
  flexDirection: "column",
  gap: 18,
  textAlign: "left",
});

const HelperText = styled.p({
  margin: 0,
  fontSize: "0.85rem",
  color: "var(--color-text-muted)",
  textAlign: "justify",
  fontStyle: "italic",
  maxWidth: 540,
});

const FooterNote = styled.div({
  display: "flex",
  justifyContent: "center",
});

const Divider = styled.div({
  display: "grid",
  gridTemplateColumns: "1fr auto 1fr",
  alignItems: "center",
  columnGap: 12,
  color: "var(--color-text-muted)",
  fontSize: "0.85rem",

  "&::before, &::after": {
    content: '""',
    display: "block",
    height: 1,
    background: "rgba(46, 42, 39, 0.16)",
  },
});

const InlineNotice = styled.div({
  background: "rgba(107, 91, 255, 0.12)",
  border: "1px solid rgba(107, 91, 255, 0.22)",
  borderRadius: "var(--border-radius-sm)",
  padding: "12px 16px",
  color: "var(--color-primary-dark)",
  fontWeight: 500,
  fontSize: "0.95rem",
});

const SecondaryButton = styled.button({
  background: "rgba(107, 91, 255, 0.08)",
  color: "var(--color-primary-dark)",
  boxShadow: "none",
  border: "1px solid rgba(107, 91, 255, 0.24)",
});

const GhostButton = styled.button({
  background: "rgba(255, 255, 255, 0.65)",
  color: "var(--color-text-primary)",
  boxShadow: "none",
  border: "1px solid rgba(46, 42, 39, 0.12)",
});

const SocialGrid = styled.div({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  gap: 12,
});

const SocialButton = styled.button<{ $selected: boolean }>(({ $selected }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  padding: "10px 16px",
  borderRadius: "var(--border-radius-sm)",
  border: $selected ? "1px solid var(--color-primary)" : "1px solid rgba(46, 42, 39, 0.12)",
  background: $selected ? "rgba(107, 91, 255, 0.12)" : "rgba(255, 255, 255, 0.9)",
  color: "var(--color-text-primary)",
  fontWeight: 600,
  cursor: "pointer",
  transition: "border var(--transition-base), box-shadow var(--transition-base)",
  boxShadow: $selected ? "0 0 0 3px rgba(107, 91, 255, 0.18)" : "none",
}));

const SocialIcon = styled.span<{ $bg: string; $color: string }>(({ $bg, $color }) => ({
  width: 28,
  height: 28,
  borderRadius: "999px",
  background: $bg,
  color: $color,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 700,
  fontSize: "0.85rem",
}));

const DebugCode = styled.code({
  background: "rgba(0, 0, 0, 0.08)",
  padding: "6px 12px",
  borderRadius: "var(--border-radius-sm)",
  fontWeight: 600,
});

const SmallText = styled.p({
  margin: 0,
  fontSize: "0.8rem",
  color: "var(--color-text-muted)",
});

const TogglePrompt = styled(SmallText)({
  textAlign: "center",
});

const ToggleButton = styled.button({
  background: "none",
  border: "none",
  color: "var(--color-primary)",
  fontWeight: 600,
  cursor: "pointer",
  padding: 0,
  fontSize: "0.85rem",
});

type SocialProvider = "google" | "facebook" | "apple";
type Mode = "signIn" | "signUp";

const providerConfig: Record<SocialProvider, { label: string; initial: string; iconBg: string; iconColor: string }> = {
  google: { label: "Google", initial: "G", iconBg: "#ffffff", iconColor: "#4285f4" },
  facebook: { label: "Facebook", initial: "f", iconBg: "#1877f2", iconColor: "#ffffff" },
  apple: { label: "Apple", initial: "A", iconBg: "#0b0b0b", iconColor: "#ffffff" },
};

export const Login = () => {
  const auth = useAuth();
  const [mode, setMode] = useState<Mode>("signIn");
  const [credentials, setCredentials] = useState({ identifier: "", password: "" });
  const [registration, setRegistration] = useState({ name: "", email: "", password: "", confirm: "" });
  const [pendingMfa, setPendingMfa] = useState<LoginResult | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<SocialProvider | null>(null);
  const [socialDetails, setSocialDetails] = useState({ email: "", name: "" });
  const [isSocialSubmitting, setIsSocialSubmitting] = useState(false);

  const isDev = useMemo(() => import.meta.env.MODE !== "production", []);
  const isSignUp = mode === "signUp";
  const activeChallenge = pendingMfa && pendingMfa.status === "mfa_required";
  const showSocial = !activeChallenge;

  const heading = isSignUp ? "Create your PlayMate account" : "Welcome to PlayMate";
  const description = isSignUp
    ? "Get ready to plan joyful playdates, coordinate with friends, and unlock neighborhood adventures."
    : "Sign in to coordinate playdates, track availability, and stay connected with your trusted circle.";

  const resetTransientState = useCallback(() => {
    setError(null);
    setInfo(null);
    setPendingMfa(null);
    setMfaCode("");
    setSelectedProvider(null);
    setSocialDetails({ email: "", name: "" });
  }, []);

  const switchToSignIn = useCallback(() => {
    setMode("signIn");
    resetTransientState();
    setRegistration({ name: "", email: "", password: "", confirm: "" });
  }, [resetTransientState]);

  const switchToSignUp = useCallback(() => {
    setMode("signUp");
    resetTransientState();
    setCredentials({ identifier: "", password: "" });
  }, [resetTransientState]);

  const handleCredentialChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setCredentials((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleRegistrationChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setRegistration((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleLoginSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setError(null);
      setInfo(null);
      setPendingMfa(null);
      setMfaCode("");
      setSelectedProvider(null);
      if (!credentials.identifier || !credentials.password) {
        setError("Please provide both your email or username and password.");
        return;
      }
      setIsSubmitting(true);
      try {
        const result = await auth.loginAction(credentials);
        if (result.status === "mfa_required") {
          setPendingMfa(result);
          setInfo("We just sent a six-digit verification code to your email. Enter it below to finish signing in.");
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unable to sign in right now.";
        setError(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [auth, credentials]
  );

  const handleSignUpSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setError(null);
      setInfo(null);
      setPendingMfa(null);
      setMfaCode("");
      setSelectedProvider(null);
      if (!registration.name || !registration.email || !registration.password) {
        setError("Please complete all fields to create your account.");
        return;
      }
      if (registration.password !== registration.confirm) {
        setError("Passwords do not match. Please try again.");
        return;
      }
      setIsSubmitting(true);
      try {
        const result = await auth.signUp({
          name: registration.name.trim(),
          email: registration.email.trim(),
          password: registration.password,
        });
        if (result.status === "mfa_required") {
          setPendingMfa(result);
          setInfo("Almost there! We sent a six-digit verification code to your email.");
          setRegistration({ name: "", email: "", password: "", confirm: "" });
          setMode("signIn");
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unable to complete sign up right now.";
        setError(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [auth, registration]
  );

  const handleMfaSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!pendingMfa || pendingMfa.status !== "mfa_required") {
        return;
      }
      if (!mfaCode) {
        setError("Enter the code from your email to continue.");
        return;
      }
      setIsSubmitting(true);
      setError(null);
      try {
        await auth.verifyMfa({ userId: pendingMfa.userId, code: mfaCode });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unable to verify the code.";
        setError(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [auth, mfaCode, pendingMfa]
  );

  const handleResend = useCallback(async () => {
    if (!pendingMfa || pendingMfa.status !== "mfa_required") {
      return;
    }
    setError(null);
    setInfo("Sending a fresh code...");
    try {
      const result = await auth.resendMfa(pendingMfa.userId);
      setPendingMfa(result);
      setInfo("We sent you a new code. It should arrive within a few seconds.");
      setMfaCode("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to resend the code.";
      setError(message);
    }
  }, [auth, pendingMfa]);

  const handleSelectProvider = useCallback((provider: SocialProvider) => {
    setSelectedProvider(provider);
    setSocialDetails({ email: "", name: "" });
    setError(null);
    setInfo(
      `Connect your ${provider.charAt(0).toUpperCase()}${provider.slice(1)} account by confirming the email you'd like to use.`
    );
  }, []);

  const handleSocialChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setSocialDetails((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleSocialSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!selectedProvider) {
        return;
      }
      if (!socialDetails.email) {
        setError("Please provide the email associated with your social account.");
        return;
      }
      setIsSocialSubmitting(true);
      setError(null);
      setInfo(null);
      try {
        await auth.loginWithSocial({
          provider: selectedProvider,
          email: socialDetails.email,
          name: socialDetails.name,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unable to sign in with social provider.";
        setError(message);
      } finally {
        setIsSocialSubmitting(false);
      }
    },
    [auth, selectedProvider, socialDetails]
  );

  const handleUseDifferentAccount = useCallback(() => {
    resetTransientState();
    setMode("signIn");
    setCredentials({ identifier: "", password: "" });
    setRegistration({ name: "", email: "", password: "", confirm: "" });
  }, [resetTransientState]);

  return (
    <LoginShell>
      <LogoImage />
      <LoginCard>
        <Intro>
          <LoginHeading>{heading}</LoginHeading>
          <LoginDescription>{description}</LoginDescription>
        </Intro>

        {error && <ErrorMessage>{error}</ErrorMessage>}
        {info && !error && <InlineNotice>{info}</InlineNotice>}

        {!activeChallenge && (
          <>
            {isSignUp ? (
              <LoginForm onSubmit={handleSignUpSubmit}>
                <FormControl>
                  <label htmlFor="name">Name</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    autoComplete="name"
                    onChange={handleRegistrationChange}
                    value={registration.name}
                    placeholder="Alex Johnson"
                  />
                </FormControl>
                <FormControl>
                  <label htmlFor="email">Email</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    autoComplete="email"
                    onChange={handleRegistrationChange}
                    value={registration.email}
                    placeholder="alex.johnson@example.com"
                  />
                </FormControl>
                <FormControl>
                  <label htmlFor="new-password">Password</label>
                  <input
                    type="password"
                    id="new-password"
                    name="password"
                    autoComplete="new-password"
                    onChange={handleRegistrationChange}
                    value={registration.password}
                    placeholder="********"
                  />
                </FormControl>
                <FormControl>
                  <label htmlFor="confirm-password">Confirm password</label>
                  <input
                    type="password"
                    id="confirm-password"
                    name="confirm"
                    autoComplete="new-password"
                    onChange={handleRegistrationChange}
                    value={registration.confirm}
                    placeholder="********"
                  />
                </FormControl>
                <button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creating account..." : "Create account"}
                </button>
              </LoginForm>
            ) : (
              <LoginForm onSubmit={handleLoginSubmit}>
                <FormControl>
                  <label htmlFor="identifier">Email or username</label>
                  <input
                    type="text"
                    id="identifier"
                    name="identifier"
                    autoComplete="username"
                    onChange={handleCredentialChange}
                    value={credentials.identifier}
                    placeholder="alex.johnson@example.com"
                  />
                </FormControl>
                <FormControl>
                  <label htmlFor="password">Password</label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    autoComplete="current-password"
                    onChange={handleCredentialChange}
                    value={credentials.password}
                    placeholder="********"
                  />
                </FormControl>
                <button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Signing in..." : "Sign in"}
                </button>
              </LoginForm>
            )}
          </>
        )}

        {activeChallenge && (
          <LoginForm onSubmit={handleMfaSubmit}>
            <FormControl>
              <label htmlFor="mfa">Verification code</label>
              <input
                type="text"
                id="mfa"
                name="mfa"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="one-time-code"
                value={mfaCode}
                onChange={(event) => setMfaCode(event.target.value)}
                placeholder="Enter your 6-digit code"
              />
            </FormControl>
            {isDev && pendingMfa?.status === "mfa_required" && pendingMfa.debugCode && (
              <SmallText>
                Dev helper: use code <DebugCode>{pendingMfa.debugCode}</DebugCode>
              </SmallText>
            )}
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Verifying..." : "Verify and continue"}
            </button>
            <SecondaryButton type="button" onClick={handleResend} disabled={isSubmitting}>
              Send a new code
            </SecondaryButton>
            <GhostButton type="button" onClick={handleUseDifferentAccount}>
              Use a different account
            </GhostButton>
          </LoginForm>
        )}

        {showSocial && (
          <>
            <Divider>or continue with</Divider>
            <SocialGrid>
              {(Object.keys(providerConfig) as SocialProvider[]).map((provider) => {
                const config = providerConfig[provider];
                const isSelected = selectedProvider === provider;
                return (
                  <SocialButton
                    key={provider}
                    type="button"
                    onClick={() => handleSelectProvider(provider)}
                    $selected={isSelected}
                    aria-pressed={isSelected}
                  >
                    <SocialIcon $bg={config.iconBg} $color={config.iconColor}>{config.initial}</SocialIcon>
                    {config.label}
                  </SocialButton>
                );
              })}
            </SocialGrid>

            {selectedProvider && (
              <LoginForm onSubmit={handleSocialSubmit}>
                <FormControl>
                  <label htmlFor="social-email">Email</label>
                  <input
                    type="email"
                    id="social-email"
                    name="email"
                    placeholder="you@example.com"
                    onChange={handleSocialChange}
                    value={socialDetails.email}
                  />
                </FormControl>
                <FormControl>
                  <label htmlFor="social-name">Name (optional)</label>
                  <input
                    type="text"
                    id="social-name"
                    name="name"
                    placeholder="Display name"
                    onChange={handleSocialChange}
                    value={socialDetails.name}
                  />
                </FormControl>
                <button type="submit" disabled={isSocialSubmitting}>
                  {isSocialSubmitting ? "Connecting..." : "Continue"}
                </button>
              </LoginForm>
            )}

            <TogglePrompt>
              {isSignUp ? "Already have an account?" : "New to PlayMate?"}{" "}
              <ToggleButton type="button" onClick={isSignUp ? switchToSignIn : switchToSignUp}>
                {isSignUp ? "Sign in" : "Create an account"}
              </ToggleButton>
            </TogglePrompt>
          </>
        )}
      </LoginCard>
      <FooterNote>
        <HelperText>
          PlayMate connects local families who want to organize joyful playdates. Discover nearby guardians with
          similar schedules, match children by age and interests, and build a supportive community that makes
          planning fun and effortless.
        </HelperText>
      </FooterNote>
    </LoginShell>
  );
};
