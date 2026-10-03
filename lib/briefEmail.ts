import { buildBrief } from "./briefTemplate";
import type { BriefInput } from "./briefSchema";

const oneLine = (v: string) => v.replace(/[\r\n]+/g, " ").trim();
export const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const firstName = (name: string) => oneLine(name).split(/\s+/)[0] || "there";

export type BriefMail = { subject: string; text: string; html: string };

export function internalEmail(input: BriefInput, when = new Date()): BriefMail {
  const b = buildBrief(input.needs, input.stage, input.goal);
  const type = b.needs.join(", ");
  const subject = `New StackEndBox Project Brief: ${type} from ${oneLine(input.name)}`.slice(0, 200);
  const rows: [string, string][] = [
    ["Name", oneLine(input.name)],
    ["Email", input.email],
    ...(input.company ? ([["Company", oneLine(input.company)]] as [string, string][]) : []),
    ["Project type", type],
    ["Current stage", b.stage],
    ["Primary goal", b.goal],
    ...(input.timeline ? ([["Timeline", input.timeline]] as [string, string][]) : []),
    ...(input.url ? ([["Website, product or repository", input.url]] as [string, string][]) : []),
    ["Selected service", type],
    ...(input.source ? ([["Page source", input.source]] as [string, string][]) : []),
    ...(input.referrer ? ([["Referrer", input.referrer]] as [string, string][]) : []),
    ["Submitted", when.toISOString()],
  ];
  const text = [
    "NEW PROJECT BRIEF",
    "",
    "Builder selections",
    `Need: ${type}`,
    `Stage: ${b.stage}`,
    `Goal: ${b.goal}`,
    "",
    "Contact and details",
    ...rows.map(([k, v]) => `${k}: ${v}`),
    "",
    "Context",
    input.context || "(none provided)",
    "",
    "Reply to this email to answer the visitor directly.",
  ].join("\n");
  const tr = (k: string, v: string) => `<tr><td style="padding:6px 16px 6px 0;color:#667085;vertical-align:top;white-space:nowrap">${esc(k)}</td><td style="padding:6px 0;color:#101828">${esc(v)}</td></tr>`;
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;color:#101828;line-height:1.5">
<h2 style="margin:0 0 4px">New project brief</h2>
<p style="margin:0 0 20px;color:#667085">${esc(type)} for ${esc(oneLine(input.name))}</p>
<table style="border-collapse:collapse;margin-bottom:20px"><tr><td colspan="2" style="padding:0 0 6px;font-weight:bold">Builder selections</td></tr>
${tr("Need", type)}${tr("Stage", b.stage)}${tr("Goal", b.goal)}</table>
<table style="border-collapse:collapse;margin-bottom:20px"><tr><td colspan="2" style="padding:0 0 6px;font-weight:bold">Contact and details</td></tr>
${rows.map(([k, v]) => tr(k, v)).join("")}</table>
<p style="margin:0 0 4px;font-weight:bold">Context</p>
<p style="margin:0 0 20px;white-space:pre-wrap">${esc(input.context || "(none provided)")}</p>
<p style="margin:0;color:#667085">Reply to this email to answer the visitor directly.</p></div>`;
  return { subject, text, html };
}

export function confirmationEmail(input: BriefInput, calUrl: string | undefined, siteUrl: string, companyEmail: string): BriefMail {
  const hi = `Hi ${firstName(input.name)},`;
  const subject = "We received your project brief";
  const lines = [
    hi,
    "",
    "Thanks for reaching out to StackEndBox.",
    "",
    "We received your project brief and will review the details you sent.",
    ...(calUrl ? ["", "If you would like to speak with us directly, you can schedule a meeting here:", calUrl] : []),
    "",
    "StackEndBox",
    companyEmail,
    siteUrl,
  ];
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;color:#101828;line-height:1.6">
<p>${esc(hi)}</p>
<p>Thanks for reaching out to StackEndBox.</p>
<p>We received your project brief and will review the details you sent.</p>
${calUrl ? `<p>If you would like to speak with us directly, you can schedule a meeting here:<br><a href="${esc(calUrl)}">${esc(calUrl)}</a></p>` : ""}
<p style="margin-top:28px">StackEndBox<br><a href="mailto:${esc(companyEmail)}">${esc(companyEmail)}</a><br><a href="${esc(siteUrl)}">${esc(siteUrl.replace(/^https?:\/\//, ""))}</a></p></div>`;
  return { subject, text: lines.join("\n"), html };
}
