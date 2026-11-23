import type { Derivacion, EstadoDerivacion, MotivoDeDerivacion, OpcionDeDerivacion } from './api'

/** Qué le pide el sistema a la persona, en una frase. */
export const TITULO_DEL_MOTIVO: Record<MotivoDeDerivacion, string> = {
  CONDICION_SIN_RESOLVER: 'Hay que decidir una condición',
  CONDICION_QUE_DERIVA: 'El protocolo pide que lo vea una persona',
  SIN_UNIDAD: 'No hay unidad propia para el incidente',
  PROPUESTA_DEL_AGENTE: 'El agente propone algo',
}

export const TEXTO_DE_LA_OPCION: Record<OpcionDeDerivacion, string> = {
  SE_CUMPLE: 'Sí, se cumple',
  NO_SE_CUMPLE: 'No se cumple',
  ENTERADO: 'Lo tomo yo',
  PEDIR_APOYO_EXTERNO: 'Pido apoyo externo',
  SEGUIR_ESPERANDO: 'Seguir esperando una unidad propia',
  ACEPTAR_PROPUESTA: 'Aceptar la propuesta',
  RECHAZAR_PROPUESTA: 'Rechazar la propuesta',
}

export const TEXTO_DEL_ESTADO: Record<EstadoDerivacion, string> = {
  ABIERTA: 'Espera respuesta',
  RESUELTA: 'Resuelta',
  VENCIDA: 'Venció sin respuesta',
  RETIRADA: 'Ya no hizo falta',
}

/** Por qué el sistema no pudo resolverlo solo. */
const POR_QUE: Record<string, string> = {
  EL_PROTOCOLO_LO_PIDE: 'El protocolo marca esta condición para que la vea una persona.',
  EL_TESTIGO_NO_CONTESTO: 'Se le preguntó al testigo y no contestó a tiempo.',
  EL_TESTIGO_NO_SABE: 'El testigo contestó que no sabe.',
  SIN_PREGUNTA_PARA_EL_TESTIGO: 'El protocolo no tiene una pregunta para hacerle al testigo.',
}

const RESPUESTA_DEL_TESTIGO: Record<string, string> = { SI: 'sí', NO: 'no', NO_SE: 'no sabe' }

/** Las líneas que explican una derivación, en el orden en que conviene leerlas. */
export function explicacionDe({ motivo, detalle }: Derivacion): string[] {
  const lineas: string[] = []
  if (motivo === 'SIN_UNIDAD') {
    if (detalle.tipoQueFalta) {
      lineas.push(`Hace falta una unidad de tipo ${detalle.tipoQueFalta} y no hay ninguna libre.`)
    }
    if (detalle.unidadesQueFaltan) {
      lineas.push(
        detalle.unidadesQueFaltan === 1 ? 'Falta 1 unidad.' : `Faltan ${detalle.unidadesQueFaltan} unidades.`,
      )
    }
    lineas.push('El incidente ya se abrió a todas las unidades de turno.')
    return lineas
  }
  if (motivo === 'PROPUESTA_DEL_AGENTE') {
    if (detalle.justificacion) {
      lineas.push(detalle.justificacion)
    }
    lineas.push('Si aceptas, lo haces tú desde el panel: el sistema no quita ni cambia unidades por su cuenta.')
    return lineas
  }
  if (detalle.porQue && POR_QUE[detalle.porQue]) {
    lineas.push(POR_QUE[detalle.porQue])
  }
  const veredicto = detalle.veredicto
  if (veredicto?.probabilidad != null) {
    lineas.push(`El modelo le da ${Math.round(veredicto.probabilidad * 100)} % de probabilidad.`)
  }
  if (veredicto?.respuestaDelTestigo) {
    lineas.push(`El testigo contestó: ${RESPUESTA_DEL_TESTIGO[veredicto.respuestaDelTestigo] ?? veredicto.respuestaDelTestigo}.`)
  }
  if (detalle.razonamiento?.justificacion) {
    lineas.push(`El agente razonó: ${detalle.razonamiento.justificacion}`)
  } else if (detalle.razonamiento?.error) {
    lineas.push('El agente no respondió.')
  }
  return lineas
}

/** Qué pasa si la condición se da por cumplida, según el protocolo. */
export function efectoSiSeCumple({ detalle }: Derivacion): string | null {
  const condicion = detalle.condicion
  if (!condicion) {
    return null
  }
  const partes: string[] = []
  if (condicion.unidadesAdicionales) {
    partes.push(condicion.unidadesAdicionales === 1 ? 'se suma 1 unidad' : `se suman ${condicion.unidadesAdicionales} unidades`)
  }
  if (condicion.tipoMinimo) {
    partes.push(`tiene que ir una de tipo ${condicion.tipoMinimo}`)
  }
  return partes.length > 0 ? `Si se cumple, ${partes.join(' y ')}.` : null
}
