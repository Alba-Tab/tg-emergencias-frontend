import { mutationOptions, queryOptions, type QueryClient } from '@tanstack/react-query'
import { incidentesKeys } from '../incidentes/queries'
import { coordinacionApi, type ModoDeDespacho, type OpcionDeDerivacion } from './api'

/**
 * Cada cuánto se vuelve a pedir lo que hay por decidir. Una derivación vence en un minuto: la pantalla no puede
 * enterarse tarde.
 */
const REFRESCO_MS = 4_000

export const coordinacionKeys = {
  todo: ['coordinacion'] as const,
  ajusteDeDespacho: () => [...coordinacionKeys.todo, 'ajuste-de-despacho'] as const,
  porAtender: () => [...coordinacionKeys.todo, 'por-atender'] as const,
  historial: () => [...coordinacionKeys.todo, 'historial'] as const,
  deIncidente: (incidenteId: number) => [...coordinacionKeys.todo, 'incidente', incidenteId] as const,
}

export const ajusteDeDespachoQuery = () =>
  queryOptions({
    queryKey: coordinacionKeys.ajusteDeDespacho(),
    queryFn: ({ signal }) => coordinacionApi.ajusteDeDespacho(signal),
  })

export const derivacionesPorAtenderQuery = () =>
  queryOptions({
    queryKey: coordinacionKeys.porAtender(),
    queryFn: ({ signal }) => coordinacionApi.derivacionesPorAtender(signal),
    refetchInterval: REFRESCO_MS,
  })

export const historialDeDerivacionesQuery = () =>
  queryOptions({
    queryKey: coordinacionKeys.historial(),
    queryFn: ({ signal }) => coordinacionApi.historialDeDerivaciones(signal),
    refetchInterval: 30_000,
  })

export const derivacionesDeIncidenteQuery = (incidenteId: number) =>
  queryOptions({
    queryKey: coordinacionKeys.deIncidente(incidenteId),
    queryFn: ({ signal }) => coordinacionApi.derivacionesDeIncidente(incidenteId, signal),
  })

export const cambiarAjusteDeDespachoMutation = (queryClient: QueryClient) =>
  mutationOptions({
    mutationFn: (datos: { modo: ModoDeDespacho; segundosConfirmacion: number }) =>
      coordinacionApi.cambiarAjusteDeDespacho(datos),
    onSuccess: (ajuste) => queryClient.setQueryData(coordinacionKeys.ajusteDeDespacho(), ajuste),
  })

/**
 * Contestar una derivación puede cambiar el incidente: si la condición se da por cumplida, pasa a necesitar más
 * unidades. Por eso también se refrescan los incidentes. Si ya no esperaba respuesta (409), la lista quedó vieja y
 * se vuelve a pedir igual.
 */
function refrescar(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: coordinacionKeys.todo })
  void queryClient.invalidateQueries({ queryKey: incidentesKeys.todos })
}

export const decidirDerivacionMutation = (queryClient: QueryClient) =>
  mutationOptions({
    mutationFn: ({ id, opcion, nota }: { id: number; opcion: OpcionDeDerivacion; nota: string | null }) =>
      coordinacionApi.decidir(id, opcion, nota),
    onSettled: () => refrescar(queryClient),
  })

export const marcarDerivacionVistaMutation = (queryClient: QueryClient) =>
  mutationOptions({
    mutationFn: (id: number) => coordinacionApi.marcarVista(id),
    onSettled: () => refrescar(queryClient),
  })
