import type { SVGProps } from "react";

export function LogoIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
      {...props}
    >
      <path d="M17 10V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h2" />
      <path d="m21 14-3-3h-3a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h3l3-3Z" />
      <path d="M7.5 13.5h.01" />
      <path d="M10.5 13.5h.01" />
    </svg>
  );
}
