import { useState, useEffect } from "react";
import { Link, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import logoPath from "@assets/912AF931-1EA4-4CC4-8976-8C6D0557A5A5_1_105_c_1772859976130.jpeg";

export default function VerifyEmailPage() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const token = params.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMessage("No verification token provided.");
      return;
    }

    apiRequest("POST", "/api/auth/verify-email", { token })
      .then(() => setStatus("success"))
      .catch((err: any) => {
        setStatus("error");
        setErrorMessage(err.message || "Verification failed");
      });
  }, [token]);

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
            <CardTitle>
              {status === "loading" && "Verifying..."}
              {status === "success" && "Email Verified"}
              {status === "error" && "Verification Failed"}
            </CardTitle>
            <CardDescription>
              {status === "loading" && "Please wait while we verify your email address."}
              {status === "success" && "Your email address has been verified successfully."}
              {status === "error" && errorMessage}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {status === "loading" && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" data-testid="loader-verify" />
              </div>
            )}
            {status === "success" && (
              <div className="space-y-4">
                <div className="flex items-center justify-center py-4">
                  <CheckCircle className="w-12 h-12 text-green-500" data-testid="icon-verify-success" />
                </div>
                <Link href="/">
                  <Button className="w-full" data-testid="button-go-to-inbox">Go to Inbox</Button>
                </Link>
              </div>
            )}
            {status === "error" && (
              <div className="space-y-4">
                <div className="flex items-center justify-center py-4">
                  <XCircle className="w-12 h-12 text-destructive" data-testid="icon-verify-error" />
                </div>
                <Link href="/auth">
                  <Button className="w-full" data-testid="button-back-to-login">Back to Sign In</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
