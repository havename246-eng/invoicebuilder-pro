import { useId } from "react";

/** Telegram's official mark: white paper plane on the blue gradient circle. */
export function TelegramLogo({ className }: { className?: string }) {
  // Gradient ids are document-global, so each instance needs its own.
  // useId() contains characters like ":" that are unsafe inside url(#…).
  const gradientId = `tg-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <svg viewBox="0 0 5000 5000" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={gradientId} x1="2500" x2="2500" y1="0" y2="4960.1" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2AABEE" offset="0" />
          <stop stopColor="#229ED9" offset="1" />
        </linearGradient>
      </defs>
      <circle cx="2500" cy="2500" r="2500" fill={`url(#${gradientId})`} />
      <path
        fill="#FFFFFF"
        d="m1173.2 2473.8c705.8-306.5 1175.6-510.2 1411.5-609 671.5-280.3 812.6-328.7 903.4-330.7 20.2 0 64.5 4 94.8 28.2 24.2 20.2 30.2 46.4 34.3 66.5 4 20.2 8.1 62.5 4 94.8-36.3 383.1-193.6 1312.7-274.2 1740.2-34.3 181.5-100.8 242-165.3 248-141.2 12.1-248-92.8-383.1-181.5-213.7-139.1-332.7-225.8-540.4-363-240-157.3-84.7-244 52.4-385.1 36.3-36.3 655.3-600.9 667.4-651.3 2-6 2-30.2-12.1-42.3s-34.3-8.1-50.4-4c-22.2 4-360.9 229.9-1020.3 675.5-96.8 66.5-183.5 98.8-262.1 96.8-86.7-2-252.1-48.4-377.1-88.7-151.2-48.4-272.2-74.6-262.1-159.3 5.9-44.4 66.4-88.7 179.3-135.1z"
      />
    </svg>
  );
}
