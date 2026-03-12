import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import logoPath from "@assets/912AF931-1EA4-4CC4-8976-8C6D0557A5A5_1_105_c_1772859976130.jpeg";

export default function ForgotPasswordPage() {
  const [username, setUsername] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsPending(true);
    try {
      await apiRequest("POST", "/api/auth/forgot-password", { username });
      setSent(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <img src={logoPath} alt="EOMail logo" className="w-12 h-12 rounded-xl object-cover" />
            <div className="text-left">
              <h1 className="text-3xl font-bold text-foreground tracking-tight">EOMail</h1>
              <p className="text-xs text-muted-foreground">.co</p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{sent ? "Check your email" : "Reset your password"}</CardTitle>
            <CardDescription>
              {sent
                ? "If an account with that username exists, we've sent a reset link to your @eomail.co address."
                : "Enter your username and we'll send a reset link to your @eomail.co address."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center py-4">
                  <CheckCircle className="w-12 h-12 text-green-500" />
                </div>
                <Link href="/auth">
                  <Button variant="outline" className="w-full" data-testid="button-back-to-login">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Sign In
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="forgot-username">Username</Label>
                  <Input
                    id="forgot-username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    required
                    autoFocus
                    data-testid="input-forgot-username"
                  />
                </div>
                {error && (
                  <p className="text-sm text-destructive" data-testid="text-forgot-error">{error}</p>
                )}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isPending}
                  data-testid="button-forgot-submit"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>
                <Link href="/auth">
                  <Button variant="ghost" className="w-full" data-testid="button-back-to-login">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Sign In
                  </Button>
                </Link>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
