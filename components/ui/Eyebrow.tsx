import { ReactNode } from "react";

interface EyebrowProps {
  children: ReactNode;
  className?: string;
}

export default function Eyebrow({
  children,
  className = "",
}: EyebrowProps) {
  return (
    <span className={`eyebrow ${className}`}>
      {children}
    </span>
  );
}