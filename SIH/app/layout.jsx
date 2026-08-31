import "./globals.css";

export const metadata = {
  title: "Legal Metrology Label Verifier",
  description: "Prototype scanner for checking packaged-label compliance with Gemini and a built-in rule engine."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
