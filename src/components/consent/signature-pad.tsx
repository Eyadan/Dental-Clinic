"use client";

import { useRef, useImperativeHandle, forwardRef } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Eraser } from "lucide-react";

export interface SignaturePadHandle {
  isEmpty: () => boolean;
  toDataURL: () => string;
  clear: () => void;
}

interface SignaturePadProps {
  label?: string;
}

export const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(
  function SignaturePad({ label = "Sign here" }, ref) {
    const canvasRef = useRef<SignatureCanvas>(null);

    useImperativeHandle(ref, () => ({
      isEmpty: () => canvasRef.current?.isEmpty() ?? true,
      toDataURL: () => canvasRef.current?.toDataURL("image/png") ?? "",
      clear: () => canvasRef.current?.clear(),
    }));

    return (
      <div className="space-y-2">
        <div className="rounded-lg border-2 border-dashed border-muted-foreground/30 p-1 bg-white">
          <SignatureCanvas
            ref={canvasRef}
            canvasProps={{
              className: "w-full h-48 rounded-md",
              style: { touchAction: "none" },
            }}
            backgroundColor="transparent"
            penColor="black"
            minWidth={1}
            maxWidth={3}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{label}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => canvasRef.current?.clear()}
          >
            <Eraser className="mr-2 h-3 w-3" />
            Clear
          </Button>
        </div>
      </div>
    );
  },
);
