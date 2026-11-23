import { api, ErrorApi } from '../../shared/api/cliente'
import type { Prioridad } from '../../shared/prioridad/prioridad'

export type TipoUnidad = 'IA' | 'II' | 'III'

/**
 * Una condición del protocolo: algo que puede ser cierto o no en un suceso y que cambia lo que hay que mandar. Desde
 * `umbralActuar` se aplica su respuesta; desde `umbralPreguntar` no alcanza para actuar pero vale la pena preguntar.
 */
export type Condicion = {
  codigo: string
  enunciado: string
  /** Cómo se le pregunta al testigo. Sin pregunta, la condición solo se deduce de la evidencia. */
  pregunta: string | null
  umbralActuar: number
  umbralPreguntar: number
  unidadesAdicionales: number
  tipoMinimo: TipoUnidad | null
  derivaAPersona: boolean
  cita: string | null
  /** Si tiene valor, la condición se cumple cuando los afectados declarados llegan a esa cantidad. */
  afectadosDesde: number | null
  /** La prioridad que como mínimo toma el caso cuando la condición se cumple. Null si no la cambia. */
  prioridad: Prioridad | null
}

export type TipoDeSuceso = {
  codigo: string
  nombre: string
  condiciones: Condicion[]
}

/** `ProtocoloResponse` del backend: una versión del protocolo con todo su contenido. */
export type Protocolo = {
  id: number
  version: number
  estado: 'BORRADOR' | 'VIGENTE' | 'RETIRADO'
  nota: string | null
  creadoEn: string
  publicadoEn: string | null
  tipos: TipoDeSuceso[]
}

/** `GuardarProtocoloRequest` del backend: el contenido completo del borrador. Reemplaza lo que había. */
export type GuardarProtocolo = {
  nota: string | null
  tipos: TipoDeSuceso[]
}

export type TipoDePropuesta =
  | 'AJUSTAR_UMBRAL'
  | 'CAMBIAR_PREGUNTA'
  | 'CAMBIAR_RESPUESTA'
  | 'AGREGAR_CONDICION'
  | 'QUITAR_CONDICION'
  | 'OTRA'

/** Una mejora que propone el analista, con los hechos y las citas de la norma en que se apoya. */
export type PropuestaDelAnalista = {
  tipo: TipoDePropuesta
  tipoDeSuceso: string
  condicion: string | null
  propuesta: string
  porQue: string
  hechos: string[]
  norma: string[]
}

/**
 * `RevisionResponse` del backend: una revisión del protocolo hecha por el analista. Corre en segundo plano:
 * `propuestas` llega cuando termina. Ninguna propuesta cambia el protocolo.
 */
export type RevisionDelProtocolo = {
  id: number
  estado: 'PENDIENTE' | 'EN_CURSO' | 'HECHA' | 'FALLIDA'
  versionDelProtocolo: number
  creadaEn: string
  terminadaEn: string | null
  proveedor: string | null
  modelo: string | null
  /** Por qué no hay propuestas, cuando no las hay. */
  nota: string | null
  /** Cuántas propuestas se descartaron por no tener respaldo suficiente. */
  descartadas: number
  hechos: { id: string; tipoDeSuceso: string; condicion: string | null; texto: string; casos: number }[] | null
  propuestas: PropuestaDelAnalista[] | null
}

/** El backend responde 404 cuando no hay ninguno: acá eso es `null`, no un error. */
async function oNada<T>(pedido: Promise<T>): Promise<T | null> {
  try {
    return await pedido
  } catch (error) {
    if (error instanceof ErrorApi && error.status === 404) {
      return null
    }
    throw error
  }
}

export const protocoloApi = {
  vigente: (signal?: AbortSignal) => oNada(api.get<Protocolo>('/protocolos/vigente', signal)),
  borrador: (signal?: AbortSignal) => oNada(api.get<Protocolo>('/protocolos/borrador', signal)),
  /** Abre un borrador con una copia del vigente. 409 `PROTOCOLO_BORRADOR_EXISTENTE` si ya hay uno. */
  abrirBorrador: () => api.post<Protocolo>('/protocolos/borrador'),
  guardarBorrador: (datos: GuardarProtocolo) => api.put<Protocolo>('/protocolos/borrador', datos),
  /** El borrador pasa a ser el vigente y el anterior queda retirado. */
  publicarBorrador: () => api.post<Protocolo>('/protocolos/borrador/publicacion'),
  descartarBorrador: () => api.borrar<void>('/protocolos/borrador'),
  /** Las últimas revisiones del analista, de la más nueva a la más vieja. */
  revisiones: (signal?: AbortSignal) => api.get<RevisionDelProtocolo[]>('/protocolos/revisiones', signal),
  /** 409 `ANALISTA_NO_DISPONIBLE` si el analista está apagado. */
  pedirRevision: () => api.post<RevisionDelProtocolo>('/protocolos/revisiones'),
}
