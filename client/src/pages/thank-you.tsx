import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { type VehicleProfile } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, QrCode, ArrowRight } from "lucide-react";

export default function ThankYouPage() {
  const params = useParams<{ qrId: string }>();
  const qrId = params.qrId || "";

  const { data: profile } = useQuery<VehicleProfile>({
    queryKey: ["/api/vehicle", qrId],
    enabled: !!qrId,
  });

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center space-y-3 pb-2">
          <div className="mx-auto w-20 h-20 rounded-full bg-chart-2/15 flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-chart-2" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground" data-testid="text-thank-you-title">
            Registration Complete!
          </h1>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto">
            Your vehicle QR profile has been activated successfully. Anyone who scans your QR code can now contact you.
          </p>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <QrCode className="h-5 w-5 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">QR Code ID</p>
                <p className="text-sm font-mono font-semibold text-foreground" data-testid="text-thankyou-qr-id">{qrId}</p>
              </div>
            </div>

            {profile?.vehicleLabel && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Vehicle</p>
                  <p className="text-sm font-semibold text-foreground" data-testid="text-thankyou-vehicle">{profile.vehicleLabel}</p>
                </div>
              </div>
            )}

            <a href={`/v/${qrId}`} className="block" data-testid="link-view-profile">
              <Button className="w-full" size="lg">
                <ArrowRight className="h-4 w-4" />
                View Your Profile
              </Button>
            </a>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground pt-2">
          Your phone numbers are hidden and will never be displayed publicly.
        </p>
      </div>
    </div>
  );
}
