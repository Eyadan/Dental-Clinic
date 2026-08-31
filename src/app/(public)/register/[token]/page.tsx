import { validateTokenAction, getMedicalConditionsAction } from "./actions";
import { RegistrationWizard } from "./registration-wizard";
import { AlertTriangle } from "lucide-react";

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const [result, conditionsResult] = await Promise.all([
    validateTokenAction(token),
    getMedicalConditionsAction(),
  ]);

  if (!result.success || !result.data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-destructive/5 to-background p-4">
        <div className="max-w-md w-full text-center space-y-4">
          <AlertTriangle className="h-16 w-16 text-destructive mx-auto" />
          <h1 className="text-xl font-bold">Invalid QR Code</h1>
          <p className="text-muted-foreground">
            This QR code is invalid, expired, or has already been used.
            Please ask the reception desk for a new QR code.
          </p>
        </div>
      </div>
    );
  }

  return (
    <RegistrationWizard
      token={token}
      appointmentId={result.data.appointmentId}
      patientName={result.data.patientName}
      conditions={conditionsResult.success && conditionsResult.data ? conditionsResult.data : []}
    />
  );
}
