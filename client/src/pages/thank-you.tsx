import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { type VehicleProfile } from "@shared/schema";
import "@/styles/reho.css";

export default function ThankYouPage() {
  const params = useParams<{ qrId: string }>();
  const qrId = params.qrId || "";

  const { data: profile } = useQuery<VehicleProfile>({
    queryKey: ["/api/vehicle", qrId],
    enabled: !!qrId,
  });

  return (
    <div className="reho-screen">
      <div className="reho-thankyou">
        <div className="reho-ty-top">
          <div className="reho-brand">
            <span className="reho-brand-re">Re</span>
            <span className="reho-brand-ho">ho</span>
          </div>
        </div>

        <div className="reho-ty-hero">
          <div className="reho-ty-icon-wrap">🏷️</div>
          <div className="reho-ty-title" data-testid="text-thank-you-title">
            Your tag is<br /><span>live.</span>
          </div>
          <div className="reho-ty-sub">
            Anyone who scans it can now reach you — safely and privately.
          </div>

          <div className="reho-ty-summary">
            <div className="reho-ty-row">
              <div className="reho-ty-row-label">🏷️ Tag name</div>
              <div className="reho-ty-row-val" data-testid="text-thankyou-vehicle">
                {profile?.vehicleLabel || "—"}
              </div>
            </div>
            <div className="reho-ty-row">
              <div className="reho-ty-row-label">🔐 Verification</div>
              <div className={`reho-ty-row-val ${profile?.verificationEnabled ? "reho-ty-row-val-green" : ""}`}>
                {profile?.verificationEnabled ? "Active" : "Off"}
              </div>
            </div>
            <div className="reho-ty-row">
              <div className="reho-ty-row-label">📞 Your number</div>
              <div className="reho-ty-row-val reho-ty-row-val-orange">Hidden ✓</div>
            </div>
            <div className="reho-ty-row">
              <div className="reho-ty-row-label">🚨 Emergency</div>
              <div className="reho-ty-row-val">
                {profile?.emergencyPhone ? "Added" : "Not set"}
              </div>
            </div>
          </div>

          <a href={`/v/${qrId}`} className="reho-ty-done" data-testid="link-view-profile">
            Done
          </a>

          <div className="reho-ty-footer">
            Need to update anything later?<br />
            Scan your own tag to edit details.
          </div>
        </div>
      </div>
    </div>
  );
}
