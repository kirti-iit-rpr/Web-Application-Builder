import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { type VehicleProfile } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import "@/styles/reho.css";
import {
  Phone,
  MessageCircle,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Loader2,
} from "lucide-react";

const BAG_BRANDS = ["American Tourister", "Samsonite", "Safari", "VIP", "Skybags", "Other"];
const BAG_COLORS = ["Blue", "Black", "White", "Pink", "Red", "Green", "Grey"];

function LoadingState() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-center">
            <Skeleton className="h-16 w-16 rounded-full" />
          </div>
          <Skeleton className="h-6 w-3/4 mx-auto" />
          <Skeleton className="h-4 w-1/2 mx-auto" />
          <div className="space-y-3 pt-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function NotRegistered() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardContent className="pt-8 pb-8 space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldAlert className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-xl font-semibold text-foreground" data-testid="text-not-registered">
            QR Code Not Registered
          </h1>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto">
            This QR code is not registered in our system. Please contact your provider for a valid QR code.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function ActivationForm({ qrId }: { qrId: string }) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [tagName, setTagName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [verificationEnabled, setVerificationEnabled] = useState(false);
  const [bagBrand, setBagBrand] = useState<string | null>(null);
  const [bagColor, setBagColor] = useState<string | null>(null);

  const activateMutation = useMutation({
    mutationFn: async () => {
      const fullPhone = ownerPhone.startsWith("+") ? ownerPhone : `+91${ownerPhone.replace(/\s/g, "")}`;
      const fullEmergency = emergencyPhone
        ? (emergencyPhone.startsWith("+") ? emergencyPhone : `+91${emergencyPhone.replace(/\s/g, "")}`)
        : undefined;

      const res = await apiRequest("POST", `/api/activate/${qrId}`, {
        vehicleLabel: tagName,
        ownerPhone: fullPhone,
        whatsappPhone: fullPhone,
        emergencyPhone: fullEmergency || "",
        profileMessage: "",
        verificationEnabled,
        bagBrand: bagBrand || "",
        bagColor: bagColor || "",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicle", qrId] });
      setLocation(`/v/${qrId}/thank-you`);
    },
    onError: (error: Error) => {
      toast({
        title: "Activation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const verificationQuestion = bagColor ? `What colour is this bag?` : null;
  const verificationAnswer = bagColor ? bagColor.toLowerCase() : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerPhone.replace(/\s/g, "")) {
      toast({ title: "Phone number required", description: "Please enter your phone number.", variant: "destructive" });
      return;
    }
    activateMutation.mutate();
  };

  return (
    <div className="reho-screen">
      <form onSubmit={handleSubmit} className="reho-setup">
        <div style={{ padding: "16px 0 20px" }}>
          <div className="reho-brand">
            <span className="reho-brand-re">Re</span>
            <span className="reho-brand-ho">ho</span>
          </div>
          <div className="reho-title" data-testid="text-activate-title">Set up your tag</div>
          <div className="reho-sub">Takes 2 minutes. Your number stays private.</div>
        </div>

        <div className="reho-field-group">
          <div className="reho-sec-label">Tag name</div>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 15 }}>🏷️</span>
            <input
              type="text"
              className="reho-input-field"
              style={{ paddingLeft: 38 }}
              placeholder={"e.g. \"kirti's bag\" or \"blue trolley\""}
              value={tagName}
              onChange={(e) => setTagName(e.target.value)}
              data-testid="input-tag-name"
            />
          </div>
          <div className="reho-input-hint">Lowercase · e.g. "kirti's bag" or "blue trolley"</div>
        </div>

        <div className="reho-field-group">
          <div className="reho-sec-label">Your number</div>
          <div className="reho-contact-card">
            <div className="reho-contact-card-header">
              <div className="reho-cc-icon reho-cc-icon-orange">📞</div>
              <div style={{ flex: 1 }}>
                <div className="reho-cc-title">Primary contact</div>
                <div className="reho-cc-sub">Finder's first point of contact</div>
              </div>
            </div>
            <div className="reho-contact-card-body">
              <div className="reho-phone-row">
                <div className="reho-phone-cc">🇮🇳 +91</div>
                <input
                  type="tel"
                  className="reho-phone-input"
                  placeholder="98765 43210"
                  value={ownerPhone}
                  onChange={(e) => setOwnerPhone(e.target.value)}
                  data-testid="input-owner-phone"
                />
              </div>
              <button type="button" className="reho-verify-btn" data-testid="button-verify-otp">
                Send OTP to verify →
              </button>
            </div>
          </div>
        </div>

        <div className="reho-field-group">
          <div className="reho-sec-label">
            Emergency contact <span className="reho-sec-label-optional">optional</span>
          </div>
          <div className="reho-contact-card">
            <div className="reho-contact-card-header">
              <div className="reho-cc-icon reho-cc-icon-red">🚨</div>
              <div style={{ flex: 1 }}>
                <div className="reho-cc-title">Emergency contact</div>
                <div className="reho-cc-sub">Shown if you don't respond</div>
              </div>
            </div>
            <div className="reho-contact-card-body">
              <div className="reho-phone-row">
                <div className="reho-phone-cc">🇮🇳 +91</div>
                <input
                  type="tel"
                  className="reho-phone-input"
                  placeholder="Family or friend"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  data-testid="input-emergency-phone"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="reho-field-group">
          <div
            className="reho-toggle-row"
            onClick={() => setVerificationEnabled(!verificationEnabled)}
            data-testid="toggle-verification"
          >
            <div className="reho-toggle-icon">🔐</div>
            <div style={{ flex: 1 }}>
              <div className="reho-toggle-title">
                {verificationEnabled ? "Verification enabled" : "Enable verification"}
              </div>
              <div className="reho-toggle-sub">
                {verificationEnabled
                  ? "Finder must answer before reaching you"
                  : "Ask finder a question before showing contacts"}
              </div>
            </div>
            <div className={`reho-toggle ${verificationEnabled ? "reho-toggle-on" : "reho-toggle-off"}`}>
              <div className="reho-toggle-knob" />
            </div>
          </div>

          {verificationEnabled && (
            <div className="reho-panel">
              <div className="reho-panel-section">
                <div className="reho-panel-label">Bag brand</div>
                <div className="reho-chips">
                  {BAG_BRANDS.map((brand) => (
                    <div
                      key={brand}
                      className={`reho-chip ${bagBrand === brand ? "reho-chip-on" : ""}`}
                      onClick={() => setBagBrand(bagBrand === brand ? null : brand)}
                      data-testid={`chip-brand-${brand.toLowerCase().replace(/\s/g, "-")}`}
                    >
                      {brand}
                    </div>
                  ))}
                </div>
              </div>

              <div className="reho-panel-section">
                <div className="reho-panel-label">Bag colour</div>
                <div className="reho-chips">
                  {BAG_COLORS.map((color) => (
                    <div
                      key={color}
                      className={`reho-chip ${bagColor === color ? "reho-chip-on" : ""}`}
                      onClick={() => setBagColor(bagColor === color ? null : color)}
                      data-testid={`chip-color-${color.toLowerCase()}`}
                    >
                      {color}
                    </div>
                  ))}
                </div>
              </div>

              {verificationQuestion && verificationAnswer && (
                <div className="reho-panel-section">
                  <div className="reho-panel-label">Finder will be asked</div>
                  <div className="reho-qa-row">
                    <div className="reho-qa-label">Question</div>
                    <div className="reho-qa-val">{verificationQuestion}</div>
                  </div>
                  <div className="reho-qa-row">
                    <div className="reho-qa-label">Answer</div>
                    <div className="reho-qa-val reho-qa-val-orange">{verificationAnswer}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <button
          type="submit"
          className="reho-btn-save"
          disabled={activateMutation.isPending}
          data-testid="button-activate"
        >
          {activateMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Activating...
            </>
          ) : (
            "Save & Activate Tag ✓"
          )}
        </button>
      </form>
    </div>
  );
}

function ActiveProfile({ profile }: { profile: VehicleProfile }) {
  const whatsappNumber = profile.whatsappPhone?.replace(/[^0-9]/g, "");

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center space-y-2 pb-2">
          <div className="mx-auto w-16 h-16 rounded-full bg-chart-2/15 flex items-center justify-center">
            <ShieldCheck className="h-8 w-8 text-chart-2" />
          </div>
          <h1
            className="text-xl font-semibold text-foreground"
            data-testid="text-vehicle-label"
          >
            {profile.vehicleLabel || "Vehicle Profile"}
          </h1>
          {profile.profileMessage && (
            <p
              className="text-muted-foreground text-sm max-w-xs mx-auto"
              data-testid="text-profile-message"
            >
              {profile.profileMessage}
            </p>
          )}
        </div>

        <Card>
          <CardContent className="pt-6 space-y-3">
            <a
              href={`tel:${profile.ownerPhone}`}
              className="block"
              data-testid="link-call-owner"
            >
              <Button variant="default" className="w-full" size="lg">
                <Phone className="h-5 w-5" />
                Call Owner
              </Button>
            </a>

            {profile.whatsappPhone && whatsappNumber && (
              <a
                href={`https://wa.me/${whatsappNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
                data-testid="link-whatsapp"
              >
                <Button variant="outline" className="w-full bg-[#25D366]/10 border-[#25D366]/30 text-[#25D366] dark:bg-[#25D366]/15 dark:text-[#25D366]" size="lg">
                  <MessageCircle className="h-5 w-5" />
                  WhatsApp
                </Button>
              </a>
            )}

            {profile.emergencyPhone && (
              <a
                href={`tel:${profile.emergencyPhone}`}
                className="block"
                data-testid="link-emergency"
              >
                <Button variant="outline" className="w-full bg-destructive/10 border-destructive/30 text-destructive" size="lg">
                  <AlertTriangle className="h-5 w-5" />
                  Emergency Contact
                </Button>
              </a>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground pt-2">
          Phone numbers are hidden for privacy
        </p>
      </div>
    </div>
  );
}

export default function VehicleProfilePage() {
  const params = useParams<{ qrId: string }>();
  const qrId = params.qrId || "";

  const { data: profile, isLoading, error } = useQuery<VehicleProfile>({
    queryKey: ["/api/vehicle", qrId],
    enabled: !!qrId,
  });

  if (isLoading) return <LoadingState />;

  if (error || !profile) return <NotRegistered />;

  if (!profile.isActive) return <ActivationForm qrId={qrId} />;

  return <ActiveProfile profile={profile} />;
}
