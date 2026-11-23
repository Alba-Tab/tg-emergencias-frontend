import { api, ErrorApi } from '../../shared/api/cliente'

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
}
