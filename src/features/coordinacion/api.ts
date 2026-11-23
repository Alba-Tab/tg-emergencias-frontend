import { api } from '../../shared/api/cliente'

export type ModoDeDespacho = 'DIFUSION' | 'ASIGNACION'

/** `AjusteDeDespachoResponse` del backend. `actualizadoEn` viene nulo mientras rija el valor de la configuración. */
export type AjusteDeDespacho = {
  modo: ModoDeDespacho
  segundosConfirmacion: number
  actualizadoEn: string | null
  actualizadoPor: string | null
}

export type EstadoDerivacion = 'ABIERTA' | 'RESUELTA' | 'VENCIDA' | 'RETIRADA'

export type MotivoDeDerivacion = 'CONDICION_SIN_RESOLVER' | 'CONDICION_QUE_DERIVA' | 'SIN_UNIDAD' | 'PROPUESTA_DEL_AGENTE'

export type OpcionDeDerivacion =
  | 'SE_CUMPLE'
  | 'NO_SE_CUMPLE'
  | 'ENTERADO'
  | 'PEDIR_APOYO_EXTERNO'
  | 'SEGUIR_ESPERANDO'
  | 'ACEPTAR_PROPUESTA'
  | 'RECHAZAR_PROPUESTA'

/**
 * El paquete de una derivación. Sus campos dependen del motivo: una condición trae `condicion` y `veredicto`, y si
 * pasó por el agente también `razonamiento`; la falta de unidad, cuántas faltan; una propuesta del agente, qué
 * propone y por qué.
 */
export type DetalleDeDerivacion = {
  porQue?: string
  condicion?: {
    codigo: string
    enunciado: string
    pregunta?: string
    cita?: string
    unidadesAdicionales?: number
    tipoMinimo?: string
  }
  veredicto?: {
    resultado: string
    fuente?: string
    probabilidad?: number
    respuestaDelTestigo?: string
    umbralActuar?: number
    umbralPreguntar?: number
  }
  razonamiento?: { justificacion?: string; herramientas?: string[]; error?: string }
  unidadesQueFaltan?: number
  tipoQueFalta?: string
  unidadesRequeridas?: number
  tipoMinimoRequerido?: string
  propuesta?: string
  justificacion?: string
}

/** `DerivacionResponse` del backend: un asunto que el sistema le pasó a la central para que lo decida una persona. */
export type Derivacion = {
  id: number
  incidenteId: number
  estado: EstadoDerivacion
  motivo: MotivoDeDerivacion
  condicion: string | null
  detalle: DetalleDeDerivacion
  opciones: { codigo: OpcionDeDerivacion; texto: string }[]
  /** La que se aplica sola si nadie contesta antes de `venceEn`. */
  opcionSegura: OpcionDeDerivacion
  creadaEn: string
  venceEn: string
  resueltaEn: string | null
  opcionElegida: OpcionDeDerivacion | null
  resueltaPor: string | null
  nota: string | null
  vistaEn: string | null
  vistaPor: string | null
  evaluacionId: number | null
  /** Espera respuesta, o venció y nadie la marcó como vista. */
  necesitaAtencion: boolean
}

export const coordinacionApi = {
  ajusteDeDespacho: (signal?: AbortSignal) => api.get<AjusteDeDespacho>('/despacho/ajustes', signal),
  cambiarAjusteDeDespacho: (datos: { modo: ModoDeDespacho; segundosConfirmacion: number }) =>
    api.put<AjusteDeDespacho>('/despacho/ajustes', datos),

  /** Las que hay que atender, la que vence antes primero. */
  derivacionesPorAtender: (signal?: AbortSignal) => api.get<Derivacion[]>('/derivaciones', signal),
  /** Las últimas cien, con cualquier estado. */
  historialDeDerivaciones: (signal?: AbortSignal) => api.get<Derivacion[]>('/derivaciones?todas=true', signal),
  derivacionesDeIncidente: (incidenteId: number, signal?: AbortSignal) =>
    api.get<Derivacion[]>(`/incidentes/${incidenteId}/derivaciones`, signal),
  /** 409 `DERIVACION_CERRADA` si ya no esperaba respuesta. */
  decidir: (id: number, opcion: OpcionDeDerivacion, nota: string | null) =>
    api.post<Derivacion>(`/derivaciones/${id}/decision`, { opcion, nota }),
  marcarVista: (id: number) => api.post<Derivacion>(`/derivaciones/${id}/visto`),
}
