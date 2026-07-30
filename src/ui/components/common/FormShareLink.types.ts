import type { ReactNode } from "react";

export type FormShareLinkProps = {
  item: string;
  subject?: string;
  message?: string;
  preview?: { title: string; image: string };
  disabled?: boolean;
  children: ReactNode;
};
