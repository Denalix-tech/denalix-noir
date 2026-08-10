import { redirect } from "next/navigation";

/** /admin is just an entry point; the post list is the real home. */
export default function AdminIndexPage() {
  redirect("/admin/posts");
}
