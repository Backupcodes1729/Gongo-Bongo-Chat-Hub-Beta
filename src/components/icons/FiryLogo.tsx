
import type { SVGProps } from "react";

// A simple, abstract flame-like logo
export function FiryLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor" // Changed to allow color via Tailwind text color
      stroke="currentColor" // Can be used for outline if needed
      strokeWidth="0.5" // Thin stroke for definition
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12.004 2.02c-1.22.611-2.783 2.243-3.516 3.776C7.015 9.07 8.185 12.018 12.003 17.17c3.82-5.153 4.99-8.1 3.516-11.373C14.787 4.264 13.224 2.63 12.004 2.021Z" />
      <path d="M12.004 14.018c-1.66-.07-2.882-1.38-3.296-2.933-.327-1.228.233-2.866 1.72-4.82.526-.683.955-1.272 1.576-1.765 1.575 1.118 2.751 3.01 3.13 4.58.538 2.179-1.097 4.048-3.13 4.94Z" opacity=".5"/>
    </svg>
  );
}
