import { queryOptions } from '@tanstack/react-query'
import { incidentesKeys } from '../incidentes/queries'
import { bitacoraApi } from './api'

/**
 * Cuelga de la clave del detalle del incidente: todo lo que lo invalida (el botón Actualizar, enviar una unidad,
 * decidir una derivación) vuelve a pedir también la bitácora.
 */
export const bitacoraKeys = {
  delIncidente: (incidenteId: number) => [...incidentesKeys.detalle(incidenteId), 'bitacora'] as const,
}

export const bitacoraDelIncidenteQuery = (incidenteId: number) =>
  queryOptions({
    queryKey: bitacoraKeys.delIncidente(incidenteId),
    queryFn: ({ signal }) => bitacoraApi.deIncidente(incidenteId, signal),
  })
