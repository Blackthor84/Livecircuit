"use client";

import QRCode from "react-qr-code";

type Props = {
  code: string;
  label?: string;
};

export function TicketQrDisplay({ code, label }: Props) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-white/10 bg-white p-3">
      <QRCode value={code} size={128} bgColor="#ffffff" fgColor="#0a0a0a" />
      {label ? <p className="text-xs text-muted-foreground">{label}</p> : null}
    </div>
  );
}
