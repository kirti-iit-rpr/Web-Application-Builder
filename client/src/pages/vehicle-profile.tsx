import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { type VehicleProfile } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import "@/styles/reho.css";
import {
  ShieldAlert,
  Loader2,
} from "lucide-react";

const BAG_BRANDS = ["American Tourister", "Samsonite", "Safari", "VIP", "Skybags", "Other"];
const BAG_COLORS = ["Blue", "Black", "White", "Pink", "Red", "Green", "Grey"];

function LoadingState() {
  return (
    <div className="reho-screen" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 420, padding: "0 22px" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <Skeleton className="h-16 w-16 rounded-full" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12, paddingTop: 16 }}>
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

function NotRegistered() {
  return (
    <div className="reho-screen" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 420, padding: "0 22px", textAlign: "center" }}>
        <div className="reho-blocked-icon" style={{ margin: "0 auto 20px", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.35)" }}>
          <ShieldAlert className="h-8 w-8" style={{ color: "#ef4444" }} />
        </div>
        <div className="reho-blocked-title" data-testid="text-not-registered">QR Code Not Registered</div>
        <div className="reho-blocked-sub" style={{ margin: "0 auto" }}>
          This QR code is not registered in our system. Please contact your provider for a valid QR code.
        </div>
      </div>
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

const COLOR_DOT_MAP: Record<string, { bg: string; border?: string }> = {
  Blue: { bg: "#3b5bdb" },
  Black: { bg: "#212529", border: "1px solid #555" },
  White: { bg: "#f8f9fa", border: "1px solid #aaa" },
  Pink: { bg: "#f06595" },
  Red: { bg: "#e03131" },
  Green: { bg: "#2f9e44" },
  Grey: { bg: "#868e96" },
};

const MAX_ATTEMPTS = 3;

function getStorageKey(qrId: string) {
  return `reho_verify_${qrId}`;
}

function getVerificationState(qrId: string): { verified: boolean; attempts: number } {
  try {
    const raw = localStorage.getItem(getStorageKey(qrId));
    if (raw) return JSON.parse(raw);
  } catch {}
  return { verified: false, attempts: 0 };
}

function setVerificationState(qrId: string, state: { verified: boolean; attempts: number }) {
  localStorage.setItem(getStorageKey(qrId), JSON.stringify(state));
}

function ActiveProfile({ profile }: { profile: VehicleProfile }) {
  const whatsappNumber = profile.whatsappPhone?.replace(/[^0-9]/g, "");
  const needsVerification = profile.verificationEnabled && profile.bagColor;

  const stored = getVerificationState(profile.qrId);
  const [verified, setVerified] = useState(stored.verified);
  const [attempts, setAttempts] = useState(stored.attempts);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const blocked = attempts >= MAX_ATTEMPTS;
  const attemptsRemaining = MAX_ATTEMPTS - attempts;

  const handleVerify = async () => {
    if (!selectedColor || verifying) return;
    setVerifying(true);
    try {
      const res = await apiRequest("POST", `/api/verify/${profile.qrId}`, { answer: selectedColor });
      const data = await res.json();
      if (data.verified) {
        setVerified(true);
        setVerificationState(profile.qrId, { verified: true, attempts });
        setShowError(false);
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        setVerificationState(profile.qrId, { verified: false, attempts: newAttempts });
        setShowError(true);
        setSelectedColor(null);
      }
    } catch {
      setShowError(true);
    } finally {
      setVerifying(false);
    }
  };

  if (needsVerification && blocked && !verified) {
    return (
      <div className="reho-screen">
        <div className="reho-blocked-page">
          <div className="reho-brand" style={{ marginBottom: 32 }}>
            <span className="reho-brand-re">Re</span>
            <span className="reho-brand-ho">ho</span>
          </div>
          <div className="reho-blocked-icon" data-testid="icon-blocked">🚫</div>
          <div className="reho-blocked-title" data-testid="text-blocked-title">Access blocked</div>
          <div className="reho-blocked-sub">You've used all 3 attempts. Access to this tag has been blocked from your device.</div>
          <div className="reho-blocked-detail">
            <div className="reho-blocked-detail-row">
              <div className="reho-bd-label">Attempts used</div>
              <div className="reho-bd-val" data-testid="text-blocked-attempts">3 / 3</div>
            </div>
            <div className="reho-blocked-detail-row">
              <div className="reho-bd-label">Status</div>
              <div className="reho-bd-val" data-testid="text-blocked-status">Blocked</div>
            </div>
            <div className="reho-blocked-detail-row">
              <div className="reho-bd-label">Tag</div>
              <div className="reho-bd-val reho-bd-val-soft">TAG · {profile.qrId}</div>
            </div>
          </div>
          <div className="reho-blocked-note">If you genuinely found this bag and need help, contact <span style={{ color: "var(--reho-orange)" }}>help@reho.in</span></div>
        </div>
      </div>
    );
  }

  if (needsVerification && !verified) {
    return (
      <div className="reho-screen">
        <div className="reho-page">
          <div className="reho-page-top">
            <div className="reho-brand">
              <span className="reho-brand-re">Re</span>
              <span className="reho-brand-ho">ho</span>
            </div>
            <div className="reho-tag-chip">TAG · {profile.qrId}</div>
          </div>

          {showError && (
            <>
              <div className="reho-error-banner" data-testid="banner-error">
                <div className="reho-error-icon">❌</div>
                <div className="reho-error-text">
                  <div className="reho-error-title">Incorrect answer</div>
                  <div className="reho-error-sub">That doesn't match. Try again — only genuine finders can pass.</div>
                </div>
              </div>
              <div className="reho-attempts-row" data-testid="row-attempts">
                {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
                  <div
                    key={i}
                    className={`reho-attempt-pip ${i < attempts ? "reho-attempt-pip-used" : "reho-attempt-pip-left"}`}
                  />
                ))}
                <div className="reho-attempts-label">{attemptsRemaining} attempt{attemptsRemaining !== 1 ? "s" : ""} remaining</div>
              </div>
            </>
          )}

          {!showError && (
            <div className="reho-verify-hero">
              <div className="reho-verify-icon">🔐</div>
              <div className="reho-verify-title" data-testid="text-verify-title">Quick verification</div>
              <div className="reho-verify-sub">Answer one question to reach the owner of this bag.</div>
            </div>
          )}

          <div className="reho-bag-card" data-testid="card-bag-info">
            <div className="reho-bag-icon">🧳</div>
            <div className="reho-bag-info">
              <div className="reho-bag-name">{profile.vehicleLabel}</div>
              <div className="reho-bag-detail">{profile.bagBrand}</div>
              <div className="reho-bag-tag">Reho · TAG {profile.qrId}</div>
            </div>
          </div>

          <div className="reho-question-card" data-testid="card-question">
            <div className="reho-question-label">{showError ? "Try again" : "Question"}</div>
            <div className="reho-question-text">What colour is this bag?</div>
            <div className="reho-answer-chips">
              {BAG_COLORS.map((color) => {
                const dot = COLOR_DOT_MAP[color];
                return (
                  <div
                    key={color}
                    className={`reho-achip ${selectedColor === color ? "reho-achip-selected" : ""}`}
                    onClick={() => setSelectedColor(color)}
                    data-testid={`achip-color-${color.toLowerCase()}`}
                  >
                    <div
                      className="reho-achip-dot"
                      style={{ background: dot?.bg, border: dot?.border }}
                    />
                    {color}
                  </div>
                );
              })}
            </div>
          </div>

          <button
            className="reho-btn-verify"
            onClick={handleVerify}
            disabled={!selectedColor || verifying}
            data-testid="button-verify"
          >
            {verifying ? "Checking..." : showError ? "Try Again →" : "Verify →"}
          </button>

          <div className="reho-spam-warning">
            <div className="reho-spam-icon">⚠️</div>
            <div className="reho-spam-text">
              {showError
                ? "Spamming or repeated wrong answers will result in permanent blocking of access from your device."
                : "3 attempts allowed. Repeated wrong answers will result in permanent blocking of access from your device."}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="reho-screen">
      <div className="reho-page">
        <div style={{ padding: "14px 0 20px" }}>
          <div className="reho-contact-top-row">
            <div className="reho-brand">
              <span className="reho-brand-re">Re</span>
              <span className="reho-brand-ho">ho</span>
            </div>
            {needsVerification && (
              <div className="reho-verified-pill" data-testid="pill-verified">
                <div className="reho-vp-dot" />
                Verified
              </div>
            )}
          </div>

          <div className="reho-owner-card" data-testid="card-owner">
            <div className="reho-owner-avatar">👤</div>
            <div className="reho-owner-info">
              <div className="reho-owner-name" data-testid="text-vehicle-label">{profile.vehicleLabel || "Tag Profile"}</div>
              {profile.profileMessage && (
                <div className="reho-owner-note" data-testid="text-profile-message">"{profile.profileMessage}"</div>
              )}
              <div className="reho-owner-tag">TAG · {profile.qrId} · Reho</div>
            </div>
          </div>
        </div>

        <div className="reho-sec-label">Reach the owner</div>

        <div className="reho-contact-btns">
          <a
            className="reho-cbtn reho-cbtn-primary"
            href={`tel:${profile.ownerPhone}`}
            data-testid="link-call-owner"
          >
            <div className="reho-cbtn-icon">📞</div>
            <div className="reho-cbtn-text">
              <span className="reho-cbtn-label">Call Owner</span>
              <span className="reho-cbtn-sub">Direct phone call</span>
            </div>
            <div className="reho-cbtn-arrow">›</div>
          </a>

          {profile.whatsappPhone && whatsappNumber && (
            <a
              className="reho-cbtn reho-cbtn-whatsapp"
              href={`https://wa.me/${whatsappNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="link-whatsapp"
            >
              <div className="reho-cbtn-icon">💬</div>
              <div className="reho-cbtn-text">
                <span className="reho-cbtn-label">WhatsApp</span>
                <span className="reho-cbtn-sub">Send a message instead</span>
              </div>
              <div className="reho-cbtn-arrow">›</div>
            </a>
          )}

          {profile.emergencyPhone && (
            <>
              <div className="reho-or-div">
                <div className="reho-or-line" />
                <div className="reho-or-text">urgent?</div>
                <div className="reho-or-line" />
              </div>

              <a
                className="reho-cbtn reho-cbtn-emergency"
                href={`tel:${profile.emergencyPhone}`}
                data-testid="link-emergency"
              >
                <div className="reho-cbtn-icon">🚨</div>
                <div className="reho-cbtn-text">
                  <span className="reho-cbtn-label">Emergency Contact</span>
                  <span className="reho-cbtn-sub">Family or alternate</span>
                </div>
                <div className="reho-cbtn-arrow">›</div>
              </a>
            </>
          )}
        </div>

        <div className="reho-privacy">
          <span>🔒</span>
          <div className="reho-privacy-text">Phone numbers are hidden for privacy</div>
        </div>

        <div className="reho-footer-brand">
          <div className="reho-footer-brand-text">
            <span className="reho-footer-brand-re">Re</span>
            <span className="reho-footer-brand-ho">ho</span>
          </div>
        </div>
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
