import Link from "next/link";
import { ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "text";

interface ButtonProps {
  children: ReactNode;
  href?: string;
  className?: string;
  variant?: ButtonVariant;
  type?: "button" | "submit" | "reset";
}

export default function Button({
  children,
  href,
  className = "",
  variant = "primary",
  type = "button",
}: ButtonProps) {
  const classes = `button button--${variant} ${className}`.trim();

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={classes}>
      {children}
    </button>
  );
}