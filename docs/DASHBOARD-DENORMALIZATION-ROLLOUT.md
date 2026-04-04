# Rollout - Dashboard Denormalizado

## Objetivo
Migrar el dashboard a lectura por snapshot (`dashboard-snapshots`) minimizando lecturas y manteniendo continuidad con fallback temporal.

## Fase 1 - Backend escritor
1. Desplegar Functions con:
   - Triggers incrementales de conteos (`trips`, `report-runs`, `settlements`, `clients`).
   - Re-composición de snapshot por cambios en `usage-months`, `subscriptions`, `plans`.
   - Reconciliador diario extendido.
2. Validar en Firestore que se crean:
   - `tenant-stats/{accountId}`
   - `dashboard-snapshots/{accountId}_{yyyy-mm}`

## Fase 2 - Lectura web con fallback
1. Desplegar web con lectura primaria de `dashboard-snapshots`.
2. Mantener `ENABLE_LEGACY_DASHBOARD_FALLBACK = true` en:
   - `app/features/system/dashboard/dashboard.service.ts`
3. Verificar que, si falta snapshot, el dashboard sigue cargando por ruta legacy.

## Fase 3 - Monitoreo y consistencia
1. Revisar logs de `reconcileUsageMetrics` diariamente.
2. Comparar valores:
   - `dashboard-snapshots.*.counts` vs conteos reales.
   - `dashboard-snapshots.*.usage` vs `usage-months`.
3. Corregir desvíos con ejecución del reconciliador (si aplica).

## Fase 4 - Retiro de fallback
1. Cuando snapshots estén estables, cambiar:
   - `ENABLE_LEGACY_DASHBOARD_FALLBACK = false`
2. Desplegar web.
3. Eliminar código legacy de conteo en vivo en una siguiente iteración.
