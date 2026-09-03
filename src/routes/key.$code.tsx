import { createFileRoute } from "@tanstack/react-router";
import { KeyholderPanel } from "@/components/lock/keyholder-panel";

export const Route = createFileRoute("/key/$code")({
  component: KeyholderPage,
});

function KeyholderPage() {
  const { code } = Route.useParams();
  return <KeyholderPanel code={code} />;
}
