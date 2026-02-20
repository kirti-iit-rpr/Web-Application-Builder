import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { activateVehicleSchema, type VehicleProfile, type ActivateVehicle } from "@shared/schema";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Car,
  Phone,
  MessageCircle,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  QrCode,
  CheckCircle2,
  Loader2,
} from "lucide-react";

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

  const form = useForm<ActivateVehicle>({
    resolver: zodResolver(activateVehicleSchema),
    defaultValues: {
      vehicleLabel: "",
      ownerPhone: "",
      whatsappPhone: "",
      emergencyPhone: "",
      profileMessage: "",
    },
  });

  const activateMutation = useMutation({
    mutationFn: async (data: ActivateVehicle) => {
      const res = await apiRequest("POST", `/api/activate/${qrId}`, data);
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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center space-y-2 pb-2">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <QrCode className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-xl font-semibold text-foreground" data-testid="text-activate-title">
            Activate Your QR Code
          </h1>
          <p className="text-muted-foreground text-sm">
            Set up your vehicle profile so anyone who scans this code can contact you.
          </p>
          <div className="inline-flex items-center gap-1.5 rounded-md bg-muted px-3 py-1">
            <span className="text-xs text-muted-foreground font-medium">QR ID:</span>
            <span className="text-xs font-mono font-semibold text-foreground" data-testid="text-qr-id">{qrId}</span>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => activateMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={form.control}
                  name="vehicleLabel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <Car className="h-3.5 w-3.5 text-muted-foreground" />
                        Vehicle Label
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Silver Honda Civic"
                          data-testid="input-vehicle-label"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ownerPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                        Owner Phone <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="+1234567890"
                          type="tel"
                          data-testid="input-owner-phone"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="whatsappPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <MessageCircle className="h-3.5 w-3.5 text-muted-foreground" />
                        WhatsApp Number
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="+1234567890"
                          type="tel"
                          data-testid="input-whatsapp-phone"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="emergencyPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />
                        Emergency Phone
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="+1234567890"
                          type="tel"
                          data-testid="input-emergency-phone"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="profileMessage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Profile Message</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="e.g. Please contact me if my vehicle is causing any inconvenience."
                          className="resize-none"
                          rows={3}
                          data-testid="input-profile-message"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={activateMutation.isPending}
                  data-testid="button-activate"
                >
                  {activateMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Activating...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Activate Profile
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
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
