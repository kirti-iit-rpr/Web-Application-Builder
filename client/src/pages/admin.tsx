import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { VehicleProfile } from "@shared/schema";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  QrCode,
  Car,
  Phone,
  MessageCircle,
  AlertTriangle,
  ExternalLink,
  Pencil,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  ShieldAlert,
  X,
} from "lucide-react";

const createQrSchema = z.object({
  qrId: z.string().min(1, "QR ID is required").max(50, "QR ID is too long"),
});

const editProfileSchema = z.object({
  vehicleLabel: z.string().optional().nullable(),
  ownerPhone: z.string().optional().nullable(),
  whatsappPhone: z.string().optional().nullable(),
  emergencyPhone: z.string().optional().nullable(),
  profileMessage: z.string().optional().nullable(),
});

type CreateQr = z.infer<typeof createQrSchema>;
type EditProfile = z.infer<typeof editProfileSchema>;

function AdminHeader() {
  return (
    <div className="border-b bg-card">
      <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3 flex-wrap">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <QrCode className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-foreground" data-testid="text-admin-title">
            Vehicle QR Admin
          </h1>
          <p className="text-xs text-muted-foreground">Manage QR codes and vehicle profiles</p>
        </div>
      </div>
    </div>
  );
}

function CreateQrForm() {
  const { toast } = useToast();

  const form = useForm<CreateQr>({
    resolver: zodResolver(createQrSchema),
    defaultValues: { qrId: "" },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateQr) => {
      const res = await apiRequest("POST", "/api/vehicle", { qrId: data.qrId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      form.reset();
      toast({
        title: "QR Code Created",
        description: "New QR code has been registered successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Creation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 pb-3">
        <Plus className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">Create New QR Code</h2>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((d) => createMutation.mutate(d))} className="flex gap-2 items-start">
            <FormField
              control={form.control}
              name="qrId"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormControl>
                    <Input
                      placeholder="Enter unique QR ID"
                      data-testid="input-new-qr-id"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              disabled={createMutation.isPending}
              data-testid="button-create-qr"
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Create
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function EditDialog({
  profile,
  open,
  onClose,
}: {
  profile: VehicleProfile;
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();

  const form = useForm<EditProfile>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      vehicleLabel: profile.vehicleLabel || "",
      ownerPhone: profile.ownerPhone || "",
      whatsappPhone: profile.whatsappPhone || "",
      emergencyPhone: profile.emergencyPhone || "",
      profileMessage: profile.profileMessage || "",
    },
  });

  const editMutation = useMutation({
    mutationFn: async (data: EditProfile) => {
      const res = await apiRequest("PATCH", `/api/vehicle/${profile.qrId}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vehicle", profile.qrId] });
      toast({
        title: "Profile Updated",
        description: "Vehicle profile has been updated.",
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4" />
            Edit Profile: {profile.qrId}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((d) => editMutation.mutate(d))} className="space-y-4">
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
                      data-testid="input-edit-vehicle-label"
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
                    Owner Phone
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="+1234567890"
                      type="tel"
                      data-testid="input-edit-owner-phone"
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
                      data-testid="input-edit-whatsapp-phone"
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
                      data-testid="input-edit-emergency-phone"
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
                      placeholder="Profile message..."
                      className="resize-none"
                      rows={3}
                      data-testid="input-edit-profile-message"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={editMutation.isPending}
                data-testid="button-save-edit"
              >
                {editMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Save Changes
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function VehicleCard({ profile }: { profile: VehicleProfile }) {
  const [editing, setEditing] = useState(false);

  return (
    <>
      <Card className="hover-elevate">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-3">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
              profile.isActive ? "bg-chart-2/15" : "bg-muted"
            }`}>
              {profile.isActive ? (
                <ShieldCheck className="h-4 w-4 text-chart-2" />
              ) : (
                <ShieldAlert className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-sm font-semibold text-foreground" data-testid={`text-qrid-${profile.qrId}`}>
                  {profile.qrId}
                </span>
                <Badge
                  variant={profile.isActive ? "default" : "secondary"}
                  className="text-[10px]"
                  data-testid={`badge-status-${profile.qrId}`}
                >
                  {profile.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              {profile.vehicleLabel && (
                <p className="text-sm text-muted-foreground mt-0.5 truncate" data-testid={`text-label-${profile.qrId}`}>
                  {profile.vehicleLabel}
                </p>
              )}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <a
                  href={`/v/${profile.qrId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm" data-testid={`button-view-${profile.qrId}`}>
                    <ExternalLink className="h-3 w-3" />
                    View
                  </Button>
                </a>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing(true)}
                  data-testid={`button-edit-${profile.qrId}`}
                >
                  <Pencil className="h-3 w-3" />
                  Edit
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {editing && (
        <EditDialog
          profile={profile}
          open={editing}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  );
}

function VehicleList() {
  const { data: vehicles, isLoading } = useQuery<VehicleProfile[]>({
    queryKey: ["/api/vehicles"],
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!vehicles || vehicles.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <QrCode className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No QR codes registered yet</p>
          <p className="text-xs text-muted-foreground mt-1">Create one using the form above</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">All QR Codes</h2>
        <Badge variant="secondary" className="text-xs">{vehicles.length} total</Badge>
      </div>
      {vehicles.map((v) => (
        <VehicleCard key={v.qrId} profile={v} />
      ))}
    </div>
  );
}

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-background">
      <AdminHeader />
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <CreateQrForm />
        <VehicleList />
      </div>
    </div>
  );
}
