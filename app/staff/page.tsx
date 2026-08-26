import { redirect } from "next/navigation";

/**
 * `/staff` is the address people will be given, and the registration flow lives
 * one level down — so this hands off to it rather than duplicating the welcome
 * screen. It is also where the review screen sends anyone whose draft has
 * expired, which lands them back at the start of the flow.
 */
export default function StaffPage() {
  redirect("/staff/registration");
}
