import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ShieldCheck, Zap, Bot } from "lucide-react";
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
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] relative overflow-hidden px-4">
      {/* Immersive Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/20 blur-[130px] rounded-full animate-pulse opacity-40" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/20 blur-[130px] rounded-full opacity-40" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-[0.05] pointer-events-none" />

      <div className="w-full max-w-[440px] relative z-10 animate-stagger-fade-in py-12">
        <div className="text-center mb-10">
          <div className="flex flex-col items-center justify-center gap-6 mb-6">
            <div className="relative group">
              <div className="absolute -inset-2 bg-gradient-to-tr from-primary to-indigo-600 rounded-3xl blur opacity-30 group-hover:opacity-60 transition duration-1000 group-hover:duration-200"></div>
              <img src={logoPath} alt="EOMail logo" className="relative w-24 h-24 rounded-3xl object-cover shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10" />
            </div>
            <div className="text-center space-y-1">
              <h1 className="text-5xl font-black text-white tracking-tighter uppercase italic">
                EOMail
              </h1>
              <div className="flex items-center justify-center gap-2">
                <span className="h-px w-8 bg-gradient-to-r from-transparent to-primary/50"></span>
                <p className="text-[11px] font-black text-primary tracking-[0.2em] uppercase text-shadow-glow">Optimized AI Tools</p>
                <span className="h-px w-8 bg-gradient-to-l from-transparent to-primary/50"></span>
              </div>
            </div>
          </div>
          <p className="text-base text-white/60 max-w-[360px] mx-auto leading-relaxed font-medium">
            Basic Gmail email website with optimized AI tools to supercharge your productivity.
          </p>
        </div>

        <div className="eomail-glass p-2 shadow-2xl shadow-indigo-500/10 rounded-[2rem] border-white/20">
          <Tabs defaultValue="login" className="w-full">
            <div className="px-6 pt-6 pb-2">
              <TabsList className="grid w-full grid-cols-2 bg-white/[0.05] p-1.5 rounded-2xl h-12 border border-white/10" data-testid="auth-tabs">
                <TabsTrigger value="login" className="rounded-xl text-xs font-bold uppercase tracking-widest data-[state=active]:bg-white/[0.12] data-[state=active]:text-white data-[state=active]:shadow-xl transition-all" data-testid="tab-login">Login</TabsTrigger>
                <TabsTrigger value="register" className="rounded-xl text-xs font-bold uppercase tracking-widest data-[state=active]:bg-white/[0.12] data-[state=active]:text-white data-[state=active]:shadow-xl transition-all" data-testid="tab-register">Sign Up</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="login" className="mt-0 outline-none">
              <LoginForm loginMutation={loginMutation} />
            </TabsContent>

            <TabsContent value="register" className="mt-0 outline-none">
              <RegisterForm registerMutation={registerMutation} />
            </TabsContent>
          </Tabs>
        </div>

        <div className="mt-10 flex flex-col items-center gap-4">
          <div className="flex items-center gap-6 opacity-40 grayscale-0 transition-all duration-500">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            <Zap className="w-6 h-6 text-amber-400" />
            <Bot className="w-6 h-6 text-primary" />
          </div>
          <p className="text-[10px] font-black text-white/40 tracking-[0.3em] uppercase">
            AI-Powered Encryption Active
          </p>
        </div>
      </div>
    </div>
  );
}

function LoginForm({ loginMutation }: { loginMutation: any }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ username, password });
  };

  return (
    <Card className="border-0 bg-transparent shadow-none px-6 pb-6 pt-2">
      <CardHeader className="text-center pb-6">
        <CardTitle className="text-2xl font-black tracking-tight text-white uppercase italic">Login</CardTitle>
        <CardDescription className="text-white/40 font-bold text-[11px] uppercase tracking-wider">Access your optimized inbox</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="login-username" className="text-sm font-bold uppercase tracking-widest text-white/80 ml-1">Username</Label>
            <Input
              id="login-username"
              className="h-12 bg-white/[0.05] border-white/20 focus:border-primary focus:bg-white/[0.08] rounded-xl transition-all text-white placeholder:text-white/20 font-medium text-base"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
              autoFocus
              data-testid="input-login-username"
            />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center ml-1">
              <Label htmlFor="login-password" className="text-sm font-bold uppercase tracking-widest text-white/80">Password</Label>
              <Link href="/forgot-password">
                <span className="text-[10px] font-bold text-white/40 hover:text-white transition-colors cursor-pointer uppercase tracking-widest" data-testid="link-forgot-password">
                  Forgot?
                </span>
              </Link>
            </div>
            <Input
              id="login-password"
              type="password"
              className="h-12 bg-white/[0.05] border-white/20 focus:border-primary focus:bg-white/[0.08] rounded-xl transition-all text-white placeholder:text-white/20 font-medium text-base"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              data-testid="input-login-password"
            />
          </div>
          <Button
            type="submit"
            className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-sm shadow-xl shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
            disabled={loginMutation.isPending}
            data-testid="button-login"
          >
            {loginMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "Log In"
            )}
          </Button>
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
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be 8+ characters");
      return;
    }

    registerMutation.mutate({ username, email, password, displayName });
  };

  return (
    <Card className="border-0 bg-transparent shadow-none px-6 pb-6 pt-2">
      <CardHeader className="text-center pb-6">
        <CardTitle className="text-2xl font-black tracking-tight text-white uppercase italic">Sign Up</CardTitle>
        <CardDescription className="text-white/40 font-bold text-[11px] uppercase tracking-wider">Create your optimized EOMail account</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="register-displayname" className="text-[11px] font-bold uppercase tracking-widest text-white/80 ml-1">Full Name</Label>
            <Input
              id="register-displayname"
              className="h-11 bg-white/[0.05] border-white/20 focus:border-primary rounded-lg transition-all text-white placeholder:text-white/20 text-sm"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="John Doe"
              required
              data-testid="input-register-displayname"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="register-username" className="text-[11px] font-bold uppercase tracking-widest text-white/80 ml-1">Username</Label>
            <Input
              id="register-username"
              className="h-11 bg-white/[0.05] border-white/20 focus:border-primary rounded-lg transition-all text-white placeholder:text-white/20 text-sm font-mono"
              value={username}
              onChange={(e) => {
                const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "");
                setUsername(val);
                // Auto-fill email if it's empty or looks like a default eomail address
                if (!email || email.includes("@eomail.co")) {
                  setEmail(val ? `${val}@eomail.co` : "");
                }
              }}
              placeholder="username"
              required
              data-testid="input-register-username"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="register-email" className="text-[11px] font-bold uppercase tracking-widest text-white/80 ml-1">Email Address</Label>
            <Input
              id="register-email"
              type="email"
              className="h-11 bg-white/[0.05] border-white/20 focus:border-primary rounded-lg transition-all text-white placeholder:text-white/20 text-sm font-mono"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="username@eomail.co"
              required
              data-testid="input-register-email"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="register-password" className="text-[11px] font-bold uppercase tracking-widest text-white/80 ml-1">Password</Label>
              <Input
                id="register-password"
                type="password"
                className="h-11 bg-white/[0.05] border-white/20 focus:border-primary rounded-lg transition-all text-white placeholder:text-white/20 text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                data-testid="input-register-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="register-confirm" className="text-[11px] font-bold uppercase tracking-widest text-white/80 ml-1">Confirm</Label>
              <Input
                id="register-confirm"
                type="password"
                className="h-11 bg-white/[0.05] border-white/20 focus:border-primary rounded-lg transition-all text-white placeholder:text-white/20 text-sm"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                data-testid="input-register-confirm"
              />
            </div>
          </div>
          {error && (
            <p className="text-[11px] font-bold text-rose-500 uppercase tracking-tight animate-shake" data-testid="text-register-error">{error}</p>
          )}
          <Button
            type="submit"
            className="w-full h-11 rounded-xl bg-white/[0.1] hover:bg-white/[0.15] text-white font-bold uppercase tracking-widest text-xs border border-white/20 transition-all mt-2"
            disabled={registerMutation.isPending}
            data-testid="button-register"
          >
            {registerMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Create Account"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
