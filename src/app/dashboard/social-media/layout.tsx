import { HCDShell } from "@/components/harmfulContentDetector/HCDShell";

export default function SocialMediaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <HCDShell>{children}</HCDShell>;
}
