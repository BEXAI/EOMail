import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Eye, EyeOff } from "lucide-react";
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex flex-col items-center justify-center gap-3 mb-3">
            <img src={logoPath} alt="EOMail logo" className="w-16 h-16 rounded-2xl shadow-xl object-cover" />
            <div className="text-center mt-2">
              <h1 className="text-4xl font-black uppercase italic text-[#0a1930] tracking-widest [text-shadow:0_0_10px_#1e3a8a,0_0_20px_#3b82f6,0_0_30px_#3b82f6]">EOMAIL</h1>
              <div className="flex items-center gap-2 mt-2 justify-center opacity-80">
                <div className="h-px w-8 bg-[#0a1930]/30"></div>
                <p className="text-[10px] text-[#0a1930] uppercase tracking-[0.2em] font-bold">Optimized AI Tools</p>
                <div className="h-px w-8 bg-[#0a1930]/30"></div>
              </div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-4">
            Basic Gmail email website with optimized AI tools to supercharge your productivity.
          </p>
        </div>

        <Tabs defaultValue="login" className="w-full">
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

// Password Strength Helper
const calculateStrength = (pass: string) => {
  let strength = 0;
  if (pass.length === 0) return 0;
  if (pass.length > 5) strength += 1;
  if (pass.length > 11) strength += 1;
  if (/[A-Z]/.test(pass)) strength += 1;
  if (/[0-9]/.test(pass)) strength += 1;
  if (/[^A-Za-z0-9]/.test(pass)) strength += 1;
  return Math.min(4, strength); // Max strength of 4
};

const PasswordStrengthMeter = ({ password }: { password: string }) => {
  const strength = calculateStrength(password);

  const getStrengthColor = (level: number) => {
    if (strength === 0) return "bg-muted";
    if (strength < 2 && level < 2) return "bg-red-500";
    if (strength === 2 && level < 3) return "bg-yellow-500";
    if (strength >= 3 && level <= strength) return "bg-green-500";
    return "bg-muted"; // inactive
  };

  const getLabel = () => {
    if (strength === 0) return "";
    if (strength < 2) return "Weak";
    if (strength === 2) return "Fair";
    if (strength === 3) return "Good";
    return "Strong";
  };

  if (password.length === 0) return null;

  return (
    <div className="space-y-1.5 mt-2">
      <div className="flex justify-between items-center text-xs">
        <span className="text-muted-foreground">Password strength</span>
        <span className="font-medium text-foreground">{getLabel()}</span>
      </div>
      <div className="flex gap-1 h-1.5">
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={`flex-1 rounded-full transition-colors duration-300 ${getStrengthColor(level)}`}
          />
        ))}
      </div>
    </div>
  );
}

function LoginForm({ loginMutation }: { loginMutation: any }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Please fill out both fields.");
      return;
    }
    setError("");
    loginMutation.mutate({ username, password });
  };

  return (
    <Card className="bg-card border-border shadow-md">
      <CardHeader>
        <CardTitle className="uppercase tracking-wider text-sm text-center">LOGIN</CardTitle>
        <CardDescription className="text-center text-[10px] uppercase font-bold tracking-widest">Access your optimized inbox</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="login-username" className="text-xs font-semibold tracking-wide text-muted-foreground">Username</Label>
            <Input
              id="login-username"
              name="username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              className="bg-background border-input focus-visible:ring-blue-600"
              autoFocus
              data-testid="input-login-username"
            />
          </div>
          <div className="space-y-2 relative">
            <Label htmlFor="login-password" className="text-xs font-semibold tracking-wide text-muted-foreground">Password</Label>
            <div className="relative">
              <Input
                id="login-password"
                name="password"
                autoComplete="current-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="bg-background border-input focus-visible:ring-blue-600 pr-10"
                data-testid="input-login-password"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground/80 focus:outline-none"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-400 font-medium" data-testid="text-login-error">{error}</p>
          )}
          <Button
            type="submit"
            className="w-full font-bold bg-[#1e3a8a] hover:bg-[#172554] text-white shadow-none uppercase tracking-widest text-xs h-10"
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
          <div className="text-center pt-2">
            <Link href="/forgot-password">
              <span className="text-sm font-medium text-blue-400/90 hover:text-blue-300 hover:underline cursor-pointer transition-colors" data-testid="link-forgot-password">
                Forgot your password?
              </span>
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function RegisterForm({ registerMutation }: { registerMutation: any }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    const newErrors: Record<string, string> = {};

    if (!displayName) newErrors.displayName = "Display Name is required.";
    if (!username) newErrors.username = "Username is required.";
    if (!email) {
      newErrors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email format.";
    }

    if (password.length < 12) {
      newErrors.password = "Password must be at least 12 characters.";
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match.";
    }

    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors);
      return;
    }

    registerMutation.mutate({ username, email, password, displayName });
  };

  return (
    <Card className="bg-card border-border shadow-md">
      <CardHeader>
        <CardTitle className="uppercase tracking-wider text-sm text-center">Sign Up</CardTitle>
        <CardDescription className="text-center text-[10px] uppercase font-bold tracking-widest">Create your optimized EOMail account</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="register-displayname" className="text-xs font-semibold tracking-wide text-muted-foreground">Full Name</Label>
            <Input
              id="register-displayname"
              name="name"
              autoComplete="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="John Doe"
              className={`bg-background border-input focus-visible:ring-blue-600 ${fieldErrors.displayName ? "border-red-500/50" : ""}`}
              autoFocus
              data-testid="input-register-displayname"
            />
            {fieldErrors.displayName && <p className="text-[11px] font-medium text-red-400">{fieldErrors.displayName}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="register-username" className="text-xs font-semibold tracking-wide text-muted-foreground">Username</Label>
            <Input
              id="register-username"
              name="username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username"
              className={`bg-background border-input focus-visible:ring-blue-600 ${fieldErrors.username ? "border-red-500/50" : ""}`}
              data-testid="input-register-username"
            />
            {fieldErrors.username && <p className="text-[11px] font-medium text-red-400">{fieldErrors.username}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="register-email" className="text-xs font-semibold tracking-wide text-muted-foreground">Email Address</Label>
            <Input
              id="register-email"
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="username@eomail.co"
              className={`bg-background border-input focus-visible:ring-blue-600 ${fieldErrors.email ? "border-red-500/50" : ""}`}
              data-testid="input-register-email"
            />
            {fieldErrors.email && <p className="text-[11px] font-medium text-red-400">{fieldErrors.email}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 relative">
              <Label htmlFor="register-password" className="text-xs font-semibold tracking-wide text-muted-foreground">Password</Label>
              <Input
                id="register-password"
                type={showPassword ? "text" : "password"}
                name="new-password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`bg-background border-input focus-visible:ring-blue-600 pr-8 ${fieldErrors.password ? "border-red-500/50" : ""}`}
                data-testid="input-register-password"
              />
              <button
                type="button"
                className="absolute right-2.5 top-8 text-muted-foreground hover:text-foreground/80 focus:outline-none"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
              {fieldErrors.password && <p className="text-[11px] font-medium text-red-400">{fieldErrors.password}</p>}
              {!fieldErrors.password && <PasswordStrengthMeter password={password} />}
            </div>

            <div className="space-y-2">
              <Label htmlFor="register-confirm" className="text-xs font-semibold tracking-wide text-muted-foreground">Confirm</Label>
              <Input
                id="register-confirm"
                type={showPassword ? "text" : "password"}
                name="new-password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className={`bg-background border-input focus-visible:ring-blue-600 ${fieldErrors.confirmPassword ? "border-red-500/50" : ""}`}
                data-testid="input-register-confirm"
              />
              {fieldErrors.confirmPassword && <p className="text-[11px] font-medium text-red-400">{fieldErrors.confirmPassword}</p>}
            </div>
          </div>
          {error && (
            <p className="text-sm text-destructive" data-testid="text-register-error">{error}</p>
          )}
          <Button
            type="submit"
            className="w-full font-bold bg-[#1e3a8a] hover:bg-[#172554] text-white shadow-none uppercase tracking-widest text-xs h-10"
            disabled={registerMutation.isPending}
            data-testid="button-register"
          >
            {registerMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating account...
              </>
            ) : (
              "Create Account"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
