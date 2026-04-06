import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { getProvisioningContextByMac, getResolvedProvisioningRules } from "@/lib/provisioning/rules";
import {
  isValidMac,
  prismaVendorToSupportedVendor,
  renderGrandstreamXml,
  renderProvisioningConfig,
} from "@/lib/provisioning/vendors";

// Tente de forcer le re-provisioning à distance via HTTP (uniquement si le téléphone est accessible)
async function triggerRemoteResync(vendor: string, ip: string | null, adminPassword: string | null): Promise<{ triggered: boolean; message: string }> {
  if (!ip) return { triggered: false, message: "Adresse IP inconnue — le téléphone re-provisionnera au prochain redémarrage ou selon son intervalle." };

  const pass = adminPassword || "admin";
  const basicAuth = "Basic " + Buffer.from(`admin:${pass}`).toString("base64");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);

  try {
    let url = "";
    if (vendor === "GRANDSTREAM") {
      url = `http://${ip}/sys?action=provision`;
    } else if (vendor === "YEALINK") {
      url = `http://${ip}/cgi-bin/ConfigManApp.com?key=AutoP`;
    } else if (vendor === "SNOM") {
      url = `http://${ip}/command.htm?autoprovisioning=autoprovisioning`;
    } else {
      return { triggered: false, message: `Vendor ${vendor} non supporté pour le resync à distance.` };
    }

    const res = await fetch(url, {
      headers: { Authorization: basicAuth },
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (res.ok || res.status === 200) {
      return { triggered: true, message: `Commande resync envoyée au téléphone (${res.status}).` };
    }
    return { triggered: false, message: `Le téléphone a répondu ${res.status} — vérifier IP et mot de passe admin.` };
  } catch (e: unknown) {
    clearTimeout(timer);
    const err = e as { name?: string; message?: string };
    if (err.name === "AbortError") {
      return { triggered: false, message: "Timeout — téléphone inaccessible depuis le serveur (normal si NAT/firewall). Il re-provisionnera selon son intervalle." };
    }
    return { triggered: false, message: `Erreur réseau: ${err.message ?? "inconnue"}.` };
  }
}

export async function POST(
  _request: NextRequest,
  context: RouteContext<"/api/admin/phones/[id]/resync">
) {
  await requireAdmin();
  const { id } = await context.params;

  const phoneRecord = await db.phone.findUnique({
    where: { id },
    select: { macAddress: true, ipAddress: true, adminPassword: true },
  });
  if (!phoneRecord || !isValidMac(phoneRecord.macAddress)) {
    return NextResponse.json({ ok: false, error: "Téléphone introuvable." }, { status: 404 });
  }

  const phone = await getProvisioningContextByMac(phoneRecord.macAddress);
  if (!phone) return NextResponse.json({ ok: false, error: "Contexte introuvable." }, { status: 404 });

  const resolved = await getResolvedProvisioningRules(phone);
  const vendor = prismaVendorToSupportedVendor(phone.phoneModel.vendor);
  const config =
    vendor === "grandstream"
      ? renderGrandstreamXml(phone, resolved.resolvedEntries)
      : renderProvisioningConfig(vendor, phone, resolved.resolvedEntries);

  // Tenter un resync à distance (best-effort — ne bloque pas en cas d'échec)
  const remoteResult = await triggerRemoteResync(
    phone.phoneModel.vendor,
    phoneRecord.ipAddress,
    phoneRecord.adminPassword,
  );

  await db.phone.update({ where: { id }, data: { lastProvisionedAt: new Date() } });

  await db.provisionLog.create({
    data: {
      phoneId: id,
      vendor: phone.phoneModel.vendor,
      macAddress: phone.macAddress,
      requestPath: `/api/admin/phones/${id}/resync`,
      success: true,
      statusCode: 200,
      message: `Resync manuel — ${resolved.resolvedEntries.length} règles — ${remoteResult.message}`,
    },
  });

  return NextResponse.json({
    ok: true,
    linesGenerated: config.split("\n").length,
    remoteTriggered: remoteResult.triggered,
    remoteMessage: remoteResult.message,
  });
}
