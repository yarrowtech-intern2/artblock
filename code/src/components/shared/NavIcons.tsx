import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const baseProps = {
  fill: "none",
  viewBox: "0 0 24 24",
  xmlns: "http://www.w3.org/2000/svg"
} satisfies Partial<SVGProps<SVGSVGElement>>;

export const HomeNavIcon = (props: IconProps) => (
  <svg {...baseProps} {...props}>
    <path d="M9 16C9.85 16.63 10.88 17 12 17C13.12 17 14.15 16.63 15 16" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" />
    <path
      d="M22 12.2V13.73C22 17.63 22 19.58 20.83 20.79C19.66 22 17.77 22 14 22H10C6.23 22 4.34 22 3.17 20.79C2 19.58 2 17.63 2 13.73V12.2C2 9.92 2 8.77 2.52 7.82C3.04 6.87 3.99 6.29 5.88 5.11L7.88 3.87C9.89 2.62 10.89 2 12 2C13.11 2 14.11 2.62 16.12 3.87L18.12 5.11C20.01 6.29 20.96 6.87 21.48 7.82"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.2"
    />
  </svg>
);

export const ReelsNavIcon = (props: IconProps) => (
  <svg {...baseProps} {...props}>
    <path d="M19.56 7C19.79 5.7 18.79 4.5 17.46 4.5H6.54C5.21 4.5 4.21 5.7 4.44 7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
    <path d="M17.5 4.5C17.53 4.24 17.54 4.11 17.54 4C17.55 2.98 16.77 2.12 15.76 2.01C15.65 2 15.52 2 15.26 2H8.74C8.48 2 8.35 2 8.24 2.01C7.23 2.12 6.45 2.98 6.46 4C6.46 4.11 6.47 4.24 6.5 4.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
    <path d="M21.19 16.79C20.84 19.27 20.67 20.51 19.77 21.26C18.87 22 17.55 22 14.9 22H9.1C6.45 22 5.13 22 4.23 21.26C3.33 20.51 3.16 19.27 2.81 16.79L2.38 13.79C1.94 10.63 1.71 9.05 2.66 8.02C3.61 7 5.3 7 8.67 7H15.33C18.7 7 20.39 7 21.34 8.02C22.09 8.83 22.1 9.99 21.86 12" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
    <path d="M14.58 13.62C15.14 13.96 15.14 14.86 14.58 15.2L11.21 17.29C10.67 17.63 10 17.19 10 16.5V12.32C10 11.63 10.67 11.19 11.21 11.53L14.58 13.62Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
  </svg>
);

export const MessageNavIcon = (props: IconProps) => (
  <svg {...baseProps} {...props}>
    <path d="M8 18L10.29 20.29C10.51 20.52 10.78 20.69 11.07 20.82C11.37 20.94 11.68 21 12 21C12.32 21 12.63 20.94 12.93 20.82C13.22 20.69 13.49 20.52 13.71 20.29L16 18H18C19.06 18 20.08 17.58 20.83 16.83C21.58 16.08 22 15.06 22 14V7C22 5.94 21.58 4.92 20.83 4.17C20.08 3.42 19.06 3 18 3H6C4.94 3 3.92 3.42 3.17 4.17C2.42 4.92 2 5.94 2 7V14C2 15.06 2.42 16.08 3.17 16.83C3.92 17.58 4.94 18 6 18H8Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
    <path d="M17 9H7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
    <path d="M13 12H7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
  </svg>
);

export const BellNavIcon = (props: IconProps) => (
  <svg {...baseProps} {...props}>
    <path d="M12.02 2.91C8.71 2.91 6.02 5.6 6.02 8.91V11.8C6.02 12.41 5.76 13.34 5.45 13.86L4.3 15.77C3.59 16.95 4.08 18.26 5.38 18.7C9.69 20.14 14.34 20.14 18.65 18.7C19.86 18.3 20.39 16.87 19.73 15.77L18.58 13.86C18.28 13.34 18.02 12.41 18.02 11.8V8.91C18.02 5.61 15.32 2.91 12.02 2.91Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
    <path d="M13.87 3.2C13.56 3.11 13.24 3.04 12.91 3C11.95 2.88 11.03 2.95 10.17 3.2C10.46 2.46 11.18 1.94 12.02 1.94C12.86 1.94 13.58 2.46 13.87 3.2Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
    <path d="M15.02 19.06C15.02 20.71 13.67 22.06 12.02 22.06C11.2 22.06 10.44 21.72 9.9 21.18C9.36 20.64 9.02 19.88 9.02 19.06" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
  </svg>
);

export const ThemeToggleIcon = (props: IconProps) => (
  <svg {...baseProps} {...props}>
    <rect x="3" y="7" width="18" height="10" rx="5" stroke="currentColor" strokeWidth="2.2" />
    <circle cx="9" cy="12" r="2.8" fill="currentColor" />
  </svg>
);

export const BellNavIconSolid = (props: IconProps) => (
  <svg {...baseProps} fill="currentColor" viewBox="0 0 24 24" {...props}>
    <path d="M12 2A5.91 5.91 0 0 0 6 8v3.5c0 .77-.38 1.95-.84 2.62l-1.37 2.01C3.12 17.18 3.52 19 5.25 19h13.5c1.73 0 2.13-1.82 1.46-2.87l-1.37-2.01c-.46-.67-.84-1.85-.84-2.62V8a5.91 5.91 0 0 0-6-6Zm2.5 18a2.5 2.5 0 0 1-5 0" />
  </svg>
);

export const LightbulbNavIcon = (props: IconProps) => (
  <svg {...baseProps} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" {...props}>
    {/* Closed glass outline — no open-path roughness, no stray rays */}
    <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1.3.5 2.6 1.5 3.5.8.8 1.3 1.5 1.5 2.5z" />
    {/* Socket cap */}
    <line x1="9" y1="17" x2="15" y2="17" />
    <line x1="10" y1="20" x2="14" y2="20" />
  </svg>
);

