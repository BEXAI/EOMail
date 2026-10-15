import { useState, useEffect } from "react";
import type { UseMutationResult } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Eye, EyeOff, Check, X, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { normalizeUsername, validateUsername } from "@shared/username";
import logoPath from "@assets/912AF931-1EA4-4CC4-8976-8C6D0557A5A5_1_105_c_1772859976130.jpeg";

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  if (user) {
    return null;
  }

  // The welcome screen links here with ?mode=signup to open the Create Account tab
  const initialTab = new URLSearchParams(window.location.search).get("mode") === "signup" ? "register" : "login";

  return (
    <div
      className="min-h-[100dvh] flex items-center justify-center bg-background px-4 py-8"
      style={{ paddingTop: "max(env(safe-area-inset-top), 2rem)", paddingBottom: "max(env(safe-area-inset-bottom), 2rem)" }}
    >
      <div className="w-full max-w-md">
        <Link href="/" className="md:hidden -ml-1 mb-4 inline-flex items-center gap-1 h-10 text-sm text-muted-foreground hover:text-foreground" data-testid="link-auth-back">
          <ChevronLeft className="w-4 h-4" />
          Back
        </Link>
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <img src={logoPath} alt="EOMail logo" className="w-12 h-12 rounded-xl object-cover" />
            <div className="text-left">
              <h1 className="text-3xl font-bold text-foreground tracking-tight">EOMail</h1>
              <p className="text-xs text-muted-foreground">.co</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Your autonomous Chief of Staff. From Inbox Zero to <span className="font-medium text-foreground">Zero Time Spent.</span>
          </p>
        </div>

        <Tabs defaultValue={initialTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2" data-testid="auth-tabs">
            <TabsTrigger value="login" data-testid="tab-login">Sign In</TabsTrigger>
            <TabsTrigger value="register" data-testid="tab-register">Create Account</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <LoginForm loginMutation={loginMutation} />
          </TabsContent>

          <TabsContent value="register">
            <RegisterForm registerMutation={registerMutation} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

interface LoginData { username: string; password: string }
interface RegisterData { username: string; password: string; displayName: string }

function LoginForm({ loginMutation }: { loginMutation: UseMutationResult<unknown, Error, LoginData> }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ username: username.trim().toLowerCase(), password });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome back</CardTitle>
        <CardDescription>Sign in to your EOMail account</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="login-username">Username</Label>
            <Input
              id="login-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              autoFocus
              data-testid="input-login-username"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="login-password">Password</Label>
            <PasswordInput
              id="login-password"
              value={password}
              onChange={setPassword}
              placeholder="Enter your password"
              autoComplete="current-password"
              testId="input-login-password"
            />
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={loginMutation.isPending}
            data-testid="button-login"
          >
            {loginMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </Button>
          <div className="text-center">
            <Link href="/forgot-password">
              <span className="text-sm text-muted-foreground hover:text-foreground cursor-pointer" data-testid="link-forgot-password">
                Forgot your password?
              </span>
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function PasswordInput({ id, value, onChange, placeholder, autoComplete, testId, invalid }: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoComplete: string;
  testId: string;
  invalid?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
        aria-invalid={invalid || undefined}
        className="pr-10"
        data-testid={testId}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
        aria-label={visible ? "Hide password" : "Show password"}
        data-testid={`${testId}-toggle`}
      >
        {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

const PASSWORD_MIN = 12;

function passwordStrength(password: string): { score: 0 | 1 | 2 | 3; label: string } {
  if (password.length < PASSWORD_MIN) return { score: 0, label: "Too short" };
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((r) => r.test(password)).length;
  if (password.length >= 16 && classes >= 3) return { score: 3, label: "Strong" };
  if (classes >= 2) return { score: 2, label: "Good" };
  return { score: 1, label: "Fair" };
}

type Availability =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "available" }
  | { state: "unavailable"; message: string }
  | { state: "error" };

function useUsernameAvailability(username: string): Availability {
  const [result, setResult] = useState<Availability>({ state: "idle" });

  useEffect(() => {
    if (!username || validateUsername(username)) {
      setResult({ state: "idle" });
      return;
    }
    setResult({ state: "checking" });
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/username-available?username=${encodeURIComponent(username)}`, {
          signal: controller.signal,
          credentials: "include",
        });
        if (!res.ok) throw new Error(String(res.status));
        const data: { available: boolean; message?: string } = await res.json();
        setResult(data.available ? { state: "available" } : { state: "unavailable", message: data.message || "That username is taken" });
      } catch {
        if (!controller.signal.aborted) setResult({ state: "error" });
      }
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [username]);

  return result;
}

function RegisterForm({ registerMutation }: { registerMutation: UseMutationResult<unknown, Error, RegisterData> }) {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [touched, setTouched] = useState({ username: false, confirm: false });
  const [error, setError] = useState("");

  const normalized = normalizeUsername(username);
  const usernameError = normalized ? validateUsername(normalized) : null;
  const availability = useUsernameAvailability(normalized);
  const strength = passwordStrength(password);
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const showMismatch = touched.confirm && confirmPassword.length > 0 && !passwordsMatch;

  const canSubmit =
    displayName.trim().length > 0 &&
    !!normalized &&
    !usernameError &&
    availability.state !== "unavailable" &&
    availability.state !== "checking" &&
    password.length >= PASSWORD_MIN &&
    passwordsMatch &&
    !registerMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const validationError =
      validateUsername(normalized) ||
      (password.length < PASSWORD_MIN ? `Password must be at least ${PASSWORD_MIN} characters` : null) ||
      (password !== confirmPassword ? "Passwords do not match" : null);
    if (validationError) {
      setError(validationError);
      return;
    }

    registerMutation.mutate(
      { username: normalized, password, displayName: displayName.trim() },
      { onError: (err) => setError(err.message || "Could not create account") },
    );
  };

  const usernameHint = (() => {
    if (!touched.username && !normalized) return null;
    if (usernameError) return <span className="text-destructive">{usernameError}</span>;
    switch (availability.state) {
      case "checking":
        return <span className="text-muted-foreground flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />Checking availability…</span>;
      case "available":
        return <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><Check className="w-3 h-3" />{normalized}@eomail.co is available</span>;
      case "unavailable":
        return <span className="text-destructive flex items-center gap-1"><X className="w-3 h-3" />{availability.message}</span>;
      case "error":
        return <span className="text-muted-foreground">Couldn't check availability, but you can still try.</span>;
      default:
        return null;
    }
  })();

  const strengthColors = ["bg-destructive", "bg-orange-500", "bg-yellow-500", "bg-emerald-500"];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>Get started with EOMail — your AI-powered inbox</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="register-displayname">Your name</Label>
            <Input
              id="register-displayname"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Jane Doe"
              autoComplete="name"
              maxLength={60}
              required
              autoFocus
              data-testid="input-register-displayname"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="register-username">Username</Label>
            <div className="flex items-center rounded-md border border-input focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 ring-offset-background">
              <input
                id="register-username"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/\s/g, "").toLowerCase())}
                onBlur={() => setTouched((t) => ({ ...t, username: true }))}
                placeholder="jane.doe"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={30}
                required
                aria-invalid={!!usernameError || availability.state === "unavailable" || undefined}
                aria-describedby="register-username-hint"
                className="flex-1 min-w-0 h-10 px-3 bg-transparent text-base md:text-sm outline-none placeholder:text-muted-foreground"
                data-testid="input-register-username"
              />
              <span className="pr-3 text-sm text-muted-foreground select-none">@eomail.co</span>
            </div>
            <p id="register-username-hint" className="text-xs min-h-4" aria-live="polite" data-testid="text-username-hint">
              {usernameHint ?? <span className="text-muted-foreground">This becomes your email address.</span>}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="register-password">Password</Label>
            <PasswordInput
              id="register-password"
              value={password}
              onChange={setPassword}
              placeholder={`At least ${PASSWORD_MIN} characters`}
              autoComplete="new-password"
              testId="input-register-password"
            />
            {password && (
              <div className="space-y-1" data-testid="password-strength">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className={cn("h-1 flex-1 rounded-full bg-muted", strength.score > i && strengthColors[strength.score])} />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {strength.label}
                  {password.length < PASSWORD_MIN && ` · ${PASSWORD_MIN - password.length} more character${PASSWORD_MIN - password.length === 1 ? "" : "s"}`}
                </p>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="register-confirm">Confirm password</Label>
            <PasswordInput
              id="register-confirm"
              value={confirmPassword}
              onChange={(v) => {
                setConfirmPassword(v);
                setTouched((t) => ({ ...t, confirm: true }));
              }}
              placeholder="Re-enter your password"
              autoComplete="new-password"
              testId="input-register-confirm"
              invalid={showMismatch}
            />
            {showMismatch && <p className="text-xs text-destructive" data-testid="text-password-mismatch">Passwords don't match</p>}
            {passwordsMatch && <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><Check className="w-3 h-3" />Passwords match</p>}
          </div>
          {error && (
            <p className="text-sm text-destructive" role="alert" data-testid="text-register-error">{error}</p>
          )}
          <Button
            type="submit"
            className="w-full"
            disabled={!canSubmit}
            data-testid="button-register"
          >
            {registerMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating your inbox...
              </>
            ) : (
              "Create Account"
            )}
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            You will get a few welcome emails to help you get started.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
