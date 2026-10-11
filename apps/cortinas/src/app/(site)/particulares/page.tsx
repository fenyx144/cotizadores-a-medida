import { redirect } from "next/navigation";
import { getClientSession } from "@/lib/client-session";

/** La cotización para particulares vive ahora dentro del área de cliente. */
export default async function ParticularPage() {
  redirect((await getClientSession()) ? "/cliente" : "/cliente/registro?tipo=particular");
}
