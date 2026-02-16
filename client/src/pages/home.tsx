import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { QrCode, ShieldCheck, Phone, Settings } from "lucide-react";
import { Link } from "wouter";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="space-y-3">
          <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <QrCode className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-app-title">
            Vehicle QR Identity
          </h1>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto">
            Scan a vehicle QR code to instantly contact the owner. No app required.
          </p>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-start gap-3 text-left">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <QrCode className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Scan QR Code</p>
                  <p className="text-xs text-muted-foreground">Point your camera at the vehicle QR code</p>
                </div>
              </div>
              <div className="flex items-start gap-3 text-left">
                <div className="w-8 h-8 rounded-full bg-chart-2/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <ShieldCheck className="h-4 w-4 text-chart-2" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">View Profile</p>
                  <p className="text-xs text-muted-foreground">See the vehicle details securely</p>
                </div>
              </div>
              <div className="flex items-start gap-3 text-left">
                <div className="w-8 h-8 rounded-full bg-chart-4/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Phone className="h-4 w-4 text-chart-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Contact Owner</p>
                  <p className="text-xs text-muted-foreground">Call or WhatsApp with one tap</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Link href="/admin">
          <Button variant="outline" className="w-full" data-testid="link-admin">
            <Settings className="h-4 w-4" />
            Admin Panel
          </Button>
        </Link>

        <div className="flex flex-wrap gap-2 justify-center">
          <Link href="/v/TEST001">
            <Button variant="ghost" size="sm" data-testid="link-test001">
              TEST001
            </Button>
          </Link>
          <Link href="/v/TEST002">
            <Button variant="ghost" size="sm" data-testid="link-test002">
              TEST002
            </Button>
          </Link>
          <Link href="/v/TEST003">
            <Button variant="ghost" size="sm" data-testid="link-test003">
              TEST003
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
