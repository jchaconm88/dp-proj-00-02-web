import { webFetch } from "~/lib/backend-client";
import { requireActiveCompanyId } from "~/lib/tenant";
import { parseStatus, CALCULATION_TYPE, SERVICE_TYPE_CATEGORY } from "~/constants/status-options";
import type {
    TransportServiceRecord,
    TransportServiceAddInput,
    TransportServiceEditInput,
    ServiceTypeCategory,
    CalculationType,
} from "./transport-services.types";

function toRecord(data: Record<string, unknown> & { id?: string }): TransportServiceRecord {
    return {
        id: String(data.id ?? ""),
        code: String(data.code ?? ""),
        name: String(data.name ?? ""),
        description: String(data.description ?? ""),
        category: parseStatus(data.category, SERVICE_TYPE_CATEGORY) as ServiceTypeCategory,
        defaultServiceTimeMin: Number(data.defaultServiceTimeMin) || 0,
        calculationType: parseStatus(data.calculationType, CALCULATION_TYPE) as CalculationType,
        requiresAppointment: !!data.requiresAppointment,
        allowConsolidation: data.allowConsolidation !== false,
        active: data.active !== false,
    };
}

export async function getTransportService(id: string): Promise<TransportServiceRecord | null> {
    const companyId = requireActiveCompanyId();
    const data = await webFetch<Record<string, unknown> | null>(
        `/transport/transport-services/${encodeURIComponent(id)}?companyId=${encodeURIComponent(companyId)}`
    );
    return data ? toRecord(data) : null;
}

export async function getTransportServices(): Promise<{ items: TransportServiceRecord[]; total: number }> {
    const companyId = requireActiveCompanyId();
    const res = await webFetch<{ items: TransportServiceRecord[]; total: number }>(
        `/transport/transport-services?companyId=${encodeURIComponent(companyId)}`
    );
    return { items: res.items ?? [], total: res.total ?? 0 };
}

export async function addTransportService(data: TransportServiceAddInput): Promise<string> {
    const companyId = requireActiveCompanyId();
    const res = await webFetch<{ id: string }>("/transport/transport-services", {
        method: "POST",
        body: JSON.stringify({
            companyId,
            code: data.code.trim(),
            name: data.name.trim(),
            description: (data.description ?? "").trim(),
            category: data.category,
            defaultServiceTimeMin: Number(data.defaultServiceTimeMin) || 0,
            calculationType: data.calculationType,
            requiresAppointment: !!data.requiresAppointment,
            allowConsolidation: data.allowConsolidation !== false,
            active: data.active !== false,
        }),
    });
    return res.id;
}

export async function updateTransportService(id: string, data: TransportServiceEditInput): Promise<void> {
    const companyId = requireActiveCompanyId();
    const payload: Record<string, unknown> = {};
    if (data.code !== undefined) payload.code = String(data.code).trim();
    if (data.name !== undefined) payload.name = String(data.name).trim();
    if (data.description !== undefined) payload.description = String(data.description).trim();
    if (data.category !== undefined) payload.category = data.category;
    if (data.defaultServiceTimeMin !== undefined) payload.defaultServiceTimeMin = Number(data.defaultServiceTimeMin) || 0;
    if (data.calculationType !== undefined) payload.calculationType = data.calculationType;
    if (data.requiresAppointment !== undefined) payload.requiresAppointment = !!data.requiresAppointment;
    if (data.allowConsolidation !== undefined) payload.allowConsolidation = !!data.allowConsolidation;
    if (data.active !== undefined) payload.active = !!data.active;
    await webFetch(`/transport/transport-services/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify({ companyId, ...payload }),
    });
}

export async function deleteTransportService(id: string): Promise<void> {
    const companyId = requireActiveCompanyId();
    await webFetch(`/transport/transport-services/${encodeURIComponent(id)}?companyId=${encodeURIComponent(companyId)}`, {
        method: "DELETE",
    });
}