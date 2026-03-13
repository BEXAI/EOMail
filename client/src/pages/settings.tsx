import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Save, Loader2, LogOut, Shield, User, Sparkles, Calendar } from "lucide-react";

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Kolkata",
  "Australia/Sydney",
  "Pacific/Auckland",
];

const TONES = [
  { value: "professional", label: "Professional" },
  { value: "casual", label: "Casual" },
  { value: "formal", label: "Formal" },
  { value: "assertive", label: "Assertive" },
];

const FORMALITY_LEVELS = [
  { value: 1, label: "Very Casual" },
  { value: 2, label: "Casual" },
  { value: 3, label: "Balanced" },
  { value: 4, label: "Formal" },
  { value: 5, label: "Very Formal" },
];

interface UserPrefs {
  preferred_signature?: string;
  default_tone?: string;
  formality_level?: number;
  industry_jargon_toggle?: boolean;
}

export default function SettingsPage() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Profile state
  const [displayName, setDisplayName] = useState("");
  const [timezone, setTimezone] = useState("America/New_York");
  const [workingHoursStart, setWorkingHoursStart] = useState("09:00");
  const [workingHoursEnd, setWorkingHoursEnd] = useState("17:00");

  // Security state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  // AI & Writing state
  const [signature, setSignature] = useState("");
  const [defaultTone, setDefaultTone] = useState("professional");
  const [formalityLevel, setFormalityLevel] = useState(3);
  const [industryJargon, setIndustryJargon] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || "");
      setTimezone(user.timezone || "America/New_York");
      setWorkingHoursStart(user.workingHoursStart || "09:00");
      setWorkingHoursEnd(user.workingHoursEnd || "17:00");
    }
  }, [user]);

  const { data: prefs } = useQuery<UserPrefs>({
    queryKey: ["/api/user/preferences"],
    enabled: !!user,
  });

  useEffect(() => {
    if (prefs) {
      setSignature(prefs.preferred_signature || "");
      setDefaultTone(prefs.default_tone || "professional");
      setFormalityLevel(prefs.formality_level ?? 3);
      setIndustryJargon(prefs.industry_jargon_toggle ?? false);
    }
  }, [prefs]);

  const profileMutation = useMutation({
    mutationFn: async (data: { displayName?: string; timezone?: string; workingHoursStart?: string; workingHoursEnd?: string }) => {
      const res = await apiRequest("PATCH", "/api/auth/user", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Profile updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to update profile", description: err.message, variant: "destructive" });
    },
  });

  const passwordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const res = await apiRequest("POST", "/api/auth/change-password", data);
      return res.json();
    },
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setConfirmDialogOpen(false);
      toast({ title: "Password changed" });
    },
    onError: (err: Error) => {
      setConfirmDialogOpen(false);
      toast({ title: "Failed to change password", description: err.message, variant: "destructive" });
    },
  });

  const signatureMutation = useMutation({
    mutationFn: async (data: { preferred_signature: string }) => {
      const res = await apiRequest("POST", "/api/user/preferences", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/preferences"] });
      toast({ title: "Signature saved" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to save signature", description: err.message, variant: "destructive" });
    },
  });

  const aiPrefsMutation = useMutation({
    mutationFn: async (data: { default_tone: string; formality_level: number; industry_jargon_toggle: boolean }) => {
      const res = await apiRequest("POST", "/api/user/preferences", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/preferences"] });
      toast({ title: "AI preferences saved" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to save AI preferences", description: err.message, variant: "destructive" });
    },
  });

  const handleSaveProfile = () => {
    profileMutation.mutate({
      displayName: displayName.trim(),
      timezone,
      workingHoursStart,
      workingHoursEnd,
    });
  };

  const handleChangePassword = () => {
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    if (newPassword.length < 12) {
      toast({ title: "Password must be at least 12 characters", variant: "destructive" });
      return;
    }
    setConfirmDialogOpen(true);
  };

  const handleConfirmPasswordChange = () => {
    passwordMutation.mutate({ currentPassword, newPassword });
  };

  const handleSaveSignature = () => {
    signatureMutation.mutate({ preferred_signature: signature });
  };

  const handleSaveAiPrefs = () => {
    aiPrefsMutation.mutate({
      default_tone: defaultTone,
      formality_level: formalityLevel,
      industry_jargon_toggle: industryJargon,
    });
  };

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => setLocation("/auth"),
    });
  };

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : null;

  const sidebarStyle = {
    "--sidebar-width": "15rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex w-full bg-background overflow-hidden h-screen">
        <AppSidebar
          onCompose={() => {}}
          counts={{}}
          activeFolder=""
          onFolderChange={() => setLocation("/")}
          activeLabel={null}
          onLabelFilter={() => {}}
          userName={user?.displayName}
          userEmail={user?.email}
          userInitials={user?.avatarInitials}
          mailboxAddress={user?.mailboxAddress}
          isDemo={false}
        />

        <SidebarInset className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <header className="flex items-center gap-3 px-4 py-2 border-b border-border shrink-0 bg-background sticky top-0 z-10">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <Separator orientation="vertical" className="h-5" />
            <h1 className="text-lg font-semibold text-foreground">Settings</h1>
          </header>

          <div className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto px-4 py-6">
              <Tabs defaultValue="account" className="space-y-6">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="account" className="gap-2" data-testid="tab-account">
                    <User className="w-4 h-4" />
                    Account
                  </TabsTrigger>
                  <TabsTrigger value="availability" className="gap-2" data-testid="tab-availability">
                    <Calendar className="w-4 h-4" />
                    Availability
                  </TabsTrigger>
                  <TabsTrigger value="ai-writing" className="gap-2" data-testid="tab-ai-writing">
                    <Sparkles className="w-4 h-4" />
                    AI & Writing
                  </TabsTrigger>
                  <TabsTrigger value="security" className="gap-2" data-testid="tab-security">
                    <Shield className="w-4 h-4" />
                    Security
                  </TabsTrigger>
                </TabsList>

                {/* ─── Account Tab ──────────────────────────────────── */}
                <TabsContent value="account" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Account Info</CardTitle>
                      <CardDescription>Your account details</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold shrink-0">
                          {user?.avatarInitials || "ME"}
                        </div>
                        <div className="space-y-1.5 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{user?.email}</p>
                          {user?.mailboxAddress && user.mailboxAddress !== user.email && (
                            <p className="text-xs text-muted-foreground truncate">{user.mailboxAddress}</p>
                          )}
                          <div className="flex items-center gap-2 flex-wrap">
                            {user?.emailVerified ? (
                              <Badge variant="default" className="bg-green-600 hover:bg-green-600 text-xs">Verified</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">Unverified</Badge>
                            )}
                            {memberSince && (
                              <span className="text-xs text-muted-foreground">Member since {memberSince}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Profile</CardTitle>
                      <CardDescription>Update your display name, timezone, and working hours</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="settings-name">Display Name</Label>
                        <Input
                          id="settings-name"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="Your name"
                          className="mt-1.5"
                          data-testid="input-settings-name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="settings-timezone">Timezone</Label>
                        <select
                          id="settings-timezone"
                          value={timezone}
                          onChange={(e) => setTimezone(e.target.value)}
                          className="mt-1.5 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          data-testid="select-settings-timezone"
                        >
                          {TIMEZONES.map((tz) => (
                            <option key={tz} value={tz}>{tz}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label>Working Hours</Label>
                        <div className="grid grid-cols-2 gap-3 mt-1.5">
                          <div>
                            <Label htmlFor="settings-hours-start" className="text-xs text-muted-foreground">Start</Label>
                            <Input
                              id="settings-hours-start"
                              type="time"
                              value={workingHoursStart}
                              onChange={(e) => setWorkingHoursStart(e.target.value)}
                              className="mt-1"
                              data-testid="input-settings-hours-start"
                            />
                          </div>
                          <div>
                            <Label htmlFor="settings-hours-end" className="text-xs text-muted-foreground">End</Label>
                            <Input
                              id="settings-hours-end"
                              type="time"
                              value={workingHoursEnd}
                              onChange={(e) => setWorkingHoursEnd(e.target.value)}
                              className="mt-1"
                              data-testid="input-settings-hours-end"
                            />
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={handleSaveProfile}
                        disabled={profileMutation.isPending}
                        className="gap-2"
                        data-testid="button-save-profile"
                      >
                        {profileMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Profile
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Logout</CardTitle>
                      <CardDescription>Sign out of your account</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button
                        variant="destructive"
                        onClick={handleLogout}
                        disabled={logoutMutation.isPending}
                        className="gap-2"
                        data-testid="button-logout"
                      >
                        {logoutMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                        Logout
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* ─── Availability Tab ─────────────────────────────── */}
                <TabsContent value="availability" className="space-y-6">
                  <AvailabilityEditor />
                </TabsContent>

                {/* ─── AI & Writing Tab ─────────────────────────────── */}
                <TabsContent value="ai-writing" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Email Signature</CardTitle>
                      <CardDescription>Your default email signature</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="relative">
                        <Textarea
                          value={signature}
                          onChange={(e) => {
                            if (e.target.value.length <= 500) setSignature(e.target.value);
                          }}
                          placeholder="Enter your email signature..."
                          className="min-h-[100px]"
                          data-testid="textarea-settings-signature"
                        />
                        <span className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                          {signature.length}/500
                        </span>
                      </div>
                      <Button
                        onClick={handleSaveSignature}
                        disabled={signatureMutation.isPending}
                        className="gap-2"
                        data-testid="button-save-signature"
                      >
                        {signatureMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Signature
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">AI Preferences</CardTitle>
                      <CardDescription>Configure how AI assists with your emails</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="settings-tone">Default Tone</Label>
                        <select
                          id="settings-tone"
                          value={defaultTone}
                          onChange={(e) => setDefaultTone(e.target.value)}
                          className="mt-1.5 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          data-testid="select-settings-tone"
                        >
                          {TONES.map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="settings-formality">Formality Level</Label>
                        <select
                          id="settings-formality"
                          value={formalityLevel}
                          onChange={(e) => setFormalityLevel(Number(e.target.value))}
                          className="mt-1.5 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          data-testid="select-settings-formality"
                        >
                          {FORMALITY_LEVELS.map((f) => (
                            <option key={f.value} value={f.value}>{f.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="settings-jargon"
                          checked={industryJargon}
                          onCheckedChange={(checked) => setIndustryJargon(checked === true)}
                          data-testid="checkbox-settings-jargon"
                        />
                        <Label htmlFor="settings-jargon" className="text-sm font-normal cursor-pointer">
                          Use industry-specific terminology in AI responses
                        </Label>
                      </div>
                      <Button
                        onClick={handleSaveAiPrefs}
                        disabled={aiPrefsMutation.isPending}
                        className="gap-2"
                        data-testid="button-save-ai-prefs"
                      >
                        {aiPrefsMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save AI Preferences
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* ─── Security Tab ─────────────────────────────────── */}
                <TabsContent value="security" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Change Password</CardTitle>
                      <CardDescription>Update your account password</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="settings-current-pw">Current Password</Label>
                        <Input
                          id="settings-current-pw"
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Enter current password"
                          className="mt-1.5"
                          data-testid="input-settings-current-pw"
                        />
                      </div>
                      <div>
                        <Label htmlFor="settings-new-pw">New Password</Label>
                        <Input
                          id="settings-new-pw"
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="At least 12 characters"
                          className="mt-1.5"
                          data-testid="input-settings-new-pw"
                        />
                      </div>
                      <div>
                        <Label htmlFor="settings-confirm-pw">Confirm New Password</Label>
                        <Input
                          id="settings-confirm-pw"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm new password"
                          className="mt-1.5"
                          data-testid="input-settings-confirm-pw"
                        />
                      </div>

                      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
                        <Button
                          onClick={handleChangePassword}
                          disabled={passwordMutation.isPending || !currentPassword || !newPassword || !confirmPassword}
                          className="gap-2"
                          data-testid="button-change-password"
                        >
                          {passwordMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                          Change Password
                        </Button>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Confirm Password Change</DialogTitle>
                            <DialogDescription>
                              Are you sure you want to change your password? You will need to use the new password on your next login.
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button
                              onClick={handleConfirmPasswordChange}
                              disabled={passwordMutation.isPending}
                              data-testid="button-confirm-password-change"
                            >
                              {passwordMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                              Confirm
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface SlotForm {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

function AvailabilityEditor() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: savedSlots = [], isLoading } = useQuery<{ dayOfWeek: number; startTime: string; endTime: string; isAvailable: boolean }[]>({
    queryKey: ["/api/calendar/availability"],
  });

  const [slots, setSlots] = useState<SlotForm[]>([]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!isLoading && !initialized) {
      if (savedSlots.length > 0) {
        setSlots(savedSlots.map(s => ({ dayOfWeek: s.dayOfWeek, startTime: s.startTime, endTime: s.endTime, isAvailable: s.isAvailable ?? true })));
      } else {
        // Default: Mon-Fri 09:00-17:00
        setSlots([1, 2, 3, 4, 5].map(d => ({ dayOfWeek: d, startTime: "09:00", endTime: "17:00", isAvailable: true })));
      }
      setInitialized(true);
    }
  }, [isLoading, savedSlots, initialized]);

  const saveMutation = useMutation({
    mutationFn: async (data: SlotForm[]) => {
      const res = await apiRequest("PUT", "/api/calendar/availability", { slots: data });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/availability"] });
      toast({ title: "Availability saved" });
    },
    onError: () => {
      toast({ title: "Failed to save availability", variant: "destructive" });
    },
  });

  const updateSlot = (index: number, field: keyof SlotForm, value: string | number | boolean) => {
    setSlots(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  if (isLoading) {
    return <Card><CardContent className="p-6"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Weekly Availability</CardTitle>
        <CardDescription>Set your available hours for each day. AI uses this for scheduling suggestions.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {slots.map((slot, i) => (
          <div key={i} className="flex items-center gap-3">
            <Checkbox
              checked={slot.isAvailable}
              onCheckedChange={(checked) => updateSlot(i, "isAvailable", checked === true)}
            />
            <span className="text-sm w-24 shrink-0 font-medium">{DAY_NAMES[slot.dayOfWeek]}</span>
            <Input type="time" value={slot.startTime} onChange={(e) => updateSlot(i, "startTime", e.target.value)} className="w-28" disabled={!slot.isAvailable} />
            <span className="text-xs text-muted-foreground">to</span>
            <Input type="time" value={slot.endTime} onChange={(e) => updateSlot(i, "endTime", e.target.value)} className="w-28" disabled={!slot.isAvailable} />
          </div>
        ))}
        <Button
          onClick={() => saveMutation.mutate(slots.filter(s => s.isAvailable))}
          disabled={saveMutation.isPending}
          className="gap-2 mt-2"
        >
          {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Availability
        </Button>
      </CardContent>
    </Card>
  );
}
