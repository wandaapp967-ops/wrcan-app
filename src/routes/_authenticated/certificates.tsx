import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Award, Download } from "lucide-react";
import { Shell } from "@/components/Shell";
import { Plate, RoseButton } from "@/components/EmpireUI";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/certificates")({
  head: () => ({
    meta: [
      { title: "My Accredited Certificates — WRCAN App" },
      {
        name: "description",
        content:
          "Download your accredited WRCAN certificates for completed YES, SETA and UNICEF training modules.",
      },
      { property: "og:title", content: "My Accredited Certificates — WRCAN App" },
      {
        property: "og:description",
        content: "Every completed WRCAN module issues a numbered, downloadable certificate.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CertificatesPage,
});

type Certificate = Tables<"certificates">;

function certificateHtml(cert: Certificate) {
  const issued = new Date(cert.issued_at).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<title>${cert.certificate_number} — WRCAN Certificate</title>
<style>
  @page { size: A4 landscape; margin: 0 }
  body { margin:0; font-family: Georgia, serif; background:#fdf7f4; color:#3b2a26 }
  .sheet { width:1120px; height:780px; margin:0 auto; padding:60px; box-sizing:border-box; text-align:center;
    border:14px double #b76e79; background:linear-gradient(160deg,#fffdfc,#f7e6e2) }
  h1 { font-size:44px; letter-spacing:6px; text-transform:uppercase; margin:24px 0 6px; color:#8c4a52 }
  h2 { font-size:34px; margin:28px 0 6px }
  .name { font-size:40px; letter-spacing:2px; border-bottom:2px solid #b76e79; display:inline-block; padding:0 40px 8px }
  p { font-size:18px; line-height:1.7 }
  .meta { margin-top:40px; display:flex; justify-content:space-between; font-size:14px; letter-spacing:2px; text-transform:uppercase }
</style></head>
<body><div class="sheet">
  <p style="letter-spacing:8px;text-transform:uppercase">WRCAN Specialists</p>
  <h1>Certificate of Completion</h1>
  <p>This certifies that</p>
  <div class="name">${cert.learner_name}</div>
  <p>has successfully completed the accredited programme</p>
  <h2>${cert.module_title}</h2>
  <p>Presented by ${cert.provider}${cert.score !== null ? ` · Final assessment ${cert.score}%` : ""}</p>
  <div class="meta"><span>No. ${cert.certificate_number}</span><span>Issued ${issued}</span></div>
</div>
<script>window.print()</script>
</body></html>`;
}

function download(cert: Certificate) {
  const blob = new Blob([certificateHtml(cert)], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `WRCAN-${cert.certificate_number}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

function CertificatesPage() {
  const { user } = useAuth();

  const { data: certs = [], isLoading } = useQuery({
    queryKey: ["certificates", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("certificates")
        .select("*")
        .eq("user_id", user!.id)
        .order("issued_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <Shell title="Certificates" subtitle="Accredited & downloadable">
      <div className="space-y-3 pb-6">
        {isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading certificates…</p>
        ) : null}

        {!isLoading && certs.length === 0 ? (
          <Plate className="text-center">
            <Award className="mx-auto mb-2 h-8 w-8 text-primary" />
            <p className="text-sm text-muted-foreground">
              No certificates yet. Complete a module and yours is issued instantly.
            </p>
            <Link to="/training" className="mt-3 inline-block">
              <RoseButton>Browse training</RoseButton>
            </Link>
          </Plate>
        ) : null}

        {certs.map((c) => (
          <Plate key={c.id} className="space-y-2">
            <div className="flex items-start gap-3">
              <Award className="mt-1 h-6 w-6 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <h2 className="font-display truncate text-base font-semibold">{c.module_title}</h2>
                <p className="text-xs text-muted-foreground">
                  {c.provider} · No. {c.certificate_number}
                </p>
                <p className="text-[0.7rem] text-muted-foreground">
                  Issued {new Date(c.issued_at).toLocaleDateString("en-ZA")}
                  {c.score !== null ? ` · ${c.score}%` : ""}
                </p>
              </div>
            </div>
            <RoseButton className="w-full" onClick={() => download(c)}>
              <Download className="h-4 w-4" /> Download certificate
            </RoseButton>
          </Plate>
        ))}
      </div>
    </Shell>
  );
}
