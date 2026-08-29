"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, CheckCircle2, ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";
import { submitRegistrationAction } from "./actions";

interface RegistrationWizardProps {
  token: string;
  appointmentId: string;
  patientName: string | null;
}

const STEPS = ["Personal", "Contact", "Medical", "Review"] as const;

export function RegistrationWizard({ token, patientName }: RegistrationWizardProps) {
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    contact_no: "",
    email: "",
    birth_date: "",
    medical_history: "",
    allergies: "",
  });

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateStep = (): string | null => {
    switch (step) {
      case 0:
        if (!formData.first_name.trim()) return "First name is required";
        if (!formData.last_name.trim()) return "Last name is required";
        return null;
      case 1:
        if (!formData.contact_no.trim()) return "Contact number is required";
        const phoneRegex = /^(\+63|0)[0-9]{10}$/;
        if (!phoneRegex.test(formData.contact_no)) return "Invalid Philippine phone number (e.g., 09171234567)";
        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return "Invalid email address";
        return null;
      case 2:
        return null;
      default:
        return null;
    }
  };

  const handleNext = () => {
    setError(null);
    const validationError = validateStep();
    if (validationError) {
      setError(validationError);
      return;
    }
    setStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  };

  const handleBack = () => {
    setError(null);
    setStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSubmit = async () => {
    setError(null);
    setIsSubmitting(true);

    const fd = new FormData();
    Object.entries(formData).forEach(([key, value]) => fd.append(key, value));

    try {
      const result = await submitRegistrationAction(token, fd);
      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.error ?? "Registration failed");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
            <h1 className="text-xl font-bold">Registration Complete!</h1>
            <p className="text-muted-foreground">
              Thank you, {formData.first_name}! Your information has been saved.
              Please proceed to the reception desk.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-background p-4">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <h1 className="text-xl font-bold">Patient Registration</h1>
          {patientName && (
            <p className="text-sm text-muted-foreground mt-1">Welcome, {patientName}</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Step {step + 1} of {STEPS.length}: {STEPS[step]}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardContent className="p-6 space-y-4">
            {step === 0 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => updateField("first_name", e.target.value)}
                    placeholder="Juan"
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name *</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => updateField("last_name", e.target.value)}
                    placeholder="Dela Cruz"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birth_date">Date of Birth</Label>
                  <Input
                    id="birth_date"
                    type="date"
                    value={formData.birth_date}
                    onChange={(e) => updateField("birth_date", e.target.value)}
                  />
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="contact_no">Contact Number *</Label>
                  <Input
                    id="contact_no"
                    value={formData.contact_no}
                    onChange={(e) => updateField("contact_no", e.target.value)}
                    placeholder="09171234567"
                    type="tel"
                  />
                  <p className="text-xs text-muted-foreground">Philippine mobile number format</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    placeholder="juan@example.com"
                  />
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="medical_history">Medical History</Label>
                  <Textarea
                    id="medical_history"
                    value={formData.medical_history}
                    onChange={(e) => updateField("medical_history", e.target.value)}
                    placeholder="Any relevant medical conditions (e.g., diabetes, hypertension)..."
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="allergies">Allergies</Label>
                  <Textarea
                    id="allergies"
                    value={formData.allergies}
                    onChange={(e) => updateField("allergies", e.target.value)}
                    placeholder="Any known allergies (e.g., penicillin, latex)..."
                    rows={3}
                  />
                </div>
              </>
            )}

            {step === 3 && (
              <div className="space-y-3">
                <h3 className="font-medium">Please review your information:</h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Name:</dt>
                    <dd>{formData.first_name} {formData.last_name}</dd>
                  </div>
                  {formData.birth_date && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Date of Birth:</dt>
                      <dd>{formData.birth_date}</dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Contact:</dt>
                    <dd>{formData.contact_no}</dd>
                  </div>
                  {formData.email && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Email:</dt>
                      <dd>{formData.email}</dd>
                    </div>
                  )}
                  {formData.medical_history && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Medical History:</dt>
                      <dd className="text-right max-w-[200px]">{formData.medical_history}</dd>
                    </div>
                  )}
                  {formData.allergies && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Allergies:</dt>
                      <dd className="text-right max-w-[200px]">{formData.allergies}</dd>
                    </div>
                  )}
                </dl>
                <div className="flex items-start gap-2 pt-2 text-xs text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
                  <p>
                    Your information is protected under the Data Privacy Act of 2012 (RA 10173)
                    and will only be used for your dental care.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-3">
          {step > 0 && (
            <Button variant="outline" onClick={handleBack} disabled={isSubmitting} className="flex-1">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button onClick={handleNext} className="flex-1">
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting} className="flex-1">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Registration
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
