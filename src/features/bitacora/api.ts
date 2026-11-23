import { api } from '../../shared/api/cliente'

export type TipoDeEvento =
  | 'ALERTA_RECIBIDA'
  | 'DETALLES_COMPLETADOS'
  | 'ALERTA_CANCELADA'
  | 'EVIDENCIA_ANALIZADA'
  | 'TIPO_DE_SUCESO_DECLARADO'
  | 'RESPUESTA_DEL_TESTIGO'
  | 'UNIDAD_ASIGNADA'
  | 'ASIGNACION_CONFIRMADA'
  | 'ASIGNACION_RECHAZADA'
  | 'ASIGNACION_VENCIDA'
  | 'ASIGNACION_RETIRADA'
  | 'SIN_UNIDAD_PARA_ASIGNAR'
  | 'CONDICIONES_EVALUADAS'
  | 'PLAN_DE_RESPUESTA_ACTUALIZADO'
  | 'PREGUNTA_AL_TESTIGO'
  | 'DERIVADO_A_PERSONA'
  | 'DERIVACION_RESUELTA'
  | 'DERIVACION_VENCIDA'
  | 'DERIVACION_RETIRADA'
  | 'CONDICION_DECIDIDA'
  | 'RAZONAMIENTO_DEL_AGENTE'

export type OrigenDelEvento = 'CIUDADANO' | 'ANALISIS' | 'TRIPULACION' | 'SISTEMA' | 'CENTRAL' | 'AGENTE'

/**
 * `EventoDelCasoResponse` del backend: algo que llegó al incidente o que el sistema hizo con él. `datos` cambia con
 * el tipo de evento, por eso llega abierto.
 */
export type EventoDelCaso = {
  id: number
  tipo: TipoDeEvento
  origen: OrigenDelEvento
  alertaId: number | null
  ocurridoEn: string
  registradoEn: string
  datos: Record<string, unknown> | null
}

export const bitacoraApi = {
  /** En el orden en que se anotó. */
  deIncidente: (incidenteId: number, signal?: AbortSignal) =>
    api.get<EventoDelCaso[]>(`/incidentes/${incidenteId}/bitacora`, signal),
}
