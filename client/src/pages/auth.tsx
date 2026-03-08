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
    <div className="min-h-screen flex items-center justify-center bg-[#050508] relative overflow-hidden px-4">
      {/* Immersive Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/20 blur-[130px] rounded-full animate-pulse opacity-40" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/20 blur-[130px] rounded-full opacity-40" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-[0.05] pointer-events-none" />

      <div className="w-full max-w-[440px] relative z-10 animate-stagger-fade-in py-12">
        <div className="text-center mb-12">
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
                <p className="text-[10px] font-black text-primary tracking-[0.3em] uppercase">Chief of Staff</p>
                <span className="h-px w-8 bg-gradient-to-l from-transparent to-primary/50"></span>
              </div>
            </div>
          </div>
          <p className="text-sm text-white/40 max-w-[320px] mx-auto leading-relaxed font-medium">
            Next-generation autonomous inbox command for high-performance leaders.
          </p>
        </div>

        <div className="eomail-glass p-1.5 shadow-2xl shadow-indigo-500/5 rounded-[2rem] border-white/10">
          <Tabs defaultValue="login" className="w-full">
            <div className="px-6 pt-6 pb-2">
              <TabsList className="grid w-full grid-cols-2 bg-white/[0.03] p-1.5 rounded-2xl h-12 border border-white/5" data-testid="auth-tabs">
                <TabsTrigger value="login" className="rounded-xl text-xs font-bold uppercase tracking-widest data-[state=active]:bg-white/[0.08] data-[state=active]:text-white data-[state=active]:shadow-xl transition-all" data-testid="tab-login">Login</TabsTrigger>
                <TabsTrigger value="register" className="rounded-xl text-xs font-bold uppercase tracking-widest data-[state=active]:bg-white/[0.08] data-[state=active]:text-white data-[state=active]:shadow-xl transition-all" data-testid="tab-register">Initialize</TabsTrigger>
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
          <div className="flex items-center gap-6 opacity-30 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            <Zap className="w-5 h-5 text-amber-500" />
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <p className="text-[9px] font-black text-white/20 tracking-[0.4em] uppercase">
            Quantized Security Architecture Active
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
        <CardTitle className="text-xl font-black tracking-tight text-white uppercase italic">Access Verification</CardTitle>
        <CardDescription className="text-white/30 font-bold text-[10px] uppercase tracking-wider">Verify credentials for command center entry</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="login-username" className="text-[10px] font-black uppercase tracking-widest text-primary/80 ml-1">Terminal ID</Label>
            <Input
              id="login-username"
              className="h-12 bg-white/[0.03] border-white/10 focus:border-primary/40 focus:bg-white/[0.05] rounded-xl transition-all text-white placeholder:text-white/10 font-medium"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="operator_identifier"
              required
              autoFocus
              data-testid="input-login-username"
            />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center ml-1">
              <Label htmlFor="login-password" className="text-[10px] font-black uppercase tracking-widest text-primary/80">Security Token</Label>
              <Link href="/forgot-password">
                <span className="text-[9px] font-bold text-white/30 hover:text-primary transition-colors cursor-pointer uppercase tracking-tighter" data-testid="link-forgot-password">
                  Lost Token?
                </span>
              </Link>
            </div>
            <Input
              id="login-password"
              type="password"
              className="h-12 bg-white/[0.03] border-white/10 focus:border-primary/40 focus:bg-white/[0.05] rounded-xl transition-all text-white placeholder:text-white/10 font-medium"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              data-testid="input-login-password"
            />
          </div>
          <Button
            type="submit"
            className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-indigo-600 hover:from-primary hover:to-indigo-500 text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            disabled={loginMutation.isPending}
            data-testid="button-login"
          >
            {loginMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "Authorize Access"
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
      setError("Token mismatch detected");
      return;
    }
    if (password.length < 8) {
      setError("Token must be 8+ characters");
      return;
    }

    registerMutation.mutate({ username, email, password, displayName });
  };

  return (
    <Card className="border-0 bg-transparent shadow-none px-6 pb-6 pt-2">
      <CardHeader className="text-center pb-6">
        <CardTitle className="text-xl font-black tracking-tight text-white uppercase italic">Identity Creation</CardTitle>
        <CardDescription className="text-white/30 font-bold text-[10px] uppercase tracking-wider">Initialize new operator profile</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="register-displayname" className="text-[9px] font-black uppercase tracking-widest text-primary/80 ml-1">Callsign</Label>
            <Input
              id="register-displayname"
              className="h-11 bg-white/[0.03] border-white/5 focus:border-primary/40 rounded-lg transition-all text-white placeholder:text-white/10 text-xs"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Director Smith"
              required
              data-testid="input-register-displayname"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="register-username" className="text-[9px] font-black uppercase tracking-widest text-primary/80 ml-1">Handle</Label>
            <Input
              id="register-username"
              className="h-11 bg-white/[0.03] border-white/5 focus:border-primary/40 rounded-lg transition-all text-white placeholder:text-white/10 text-xs"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="unique_handle"
              required
              data-testid="input-register-username"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="register-email" className="text-[9px] font-black uppercase tracking-widest text-primary/80 ml-1">Uplink Address</Label>
            <Input
              id="register-email"
              type="email"
              className="h-11 bg-white/[0.03] border-white/5 focus:border-primary/40 rounded-lg transition-all text-white placeholder:text-white/10 text-xs"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="operator@domain.com"
              required
              data-testid="input-register-email"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="register-password" className="text-[9px] font-black uppercase tracking-widest text-primary/80 ml-1">New Token</Label>
              <Input
                id="register-password"
                type="password"
                className="h-11 bg-white/[0.03] border-white/5 focus:border-primary/40 rounded-lg transition-all text-white placeholder:text-white/10 text-xs"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                data-testid="input-register-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="register-confirm" className="text-[9px] font-black uppercase tracking-widest text-primary/80 ml-1">Confirm</Label>
              <Input
                id="register-confirm"
                type="password"
                className="h-11 bg-white/[0.03] border-white/5 focus:border-primary/40 rounded-lg transition-all text-white placeholder:text-white/10 text-xs"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                data-testid="input-register-confirm"
              />
            </div>
          </div>
          {error && (
            <p className="text-[10px] font-bold text-rose-500 uppercase tracking-tight animate-shake" data-testid="text-register-error">{error}</p>
          )}
          <Button
            type="submit"
            className="w-full h-11 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-white font-bold uppercase tracking-widest text-[10px] border border-white/10 transition-all mt-2"
            disabled={registerMutation.isPending}
            data-testid="button-register"
          >
            {registerMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Initialize Profile"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
