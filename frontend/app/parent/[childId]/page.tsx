import { redirect } from "next/navigation";

export default function ParentRedirect({ params }: { params: { childId: string } }) {
  redirect(`/dashboard/${params.childId}`);
}
