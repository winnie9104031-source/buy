import './globals.css';
export const metadata = { title: '團購小幫手', description: '公司團購收單' };
export default function RootLayout({ children }) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
