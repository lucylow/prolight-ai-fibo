import React, { useRef } from "react";
import ReCAPTCHA from "react-google-recaptcha";

interface RecaptchaWrapperProps {
  siteKey: string;
  onVerify: (token: string) => void;
}

export default function RecaptchaWrapper({ siteKey, onVerify }: RecaptchaWrapperProps) {
  const ref = useRef<ReCAPTCHA | null>(null);
  
  return (
    <div>
      <ReCAPTCHA
        sitekey={siteKey}
        ref={ref}
        onChange={(token) => {
          if (token) onVerify(token);
        }}
      />
    </div>
  );
}
