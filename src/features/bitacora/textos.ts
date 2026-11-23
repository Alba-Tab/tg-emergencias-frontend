import { TEXTO_DE_LA_OPCION, TITULO_DEL_MOTIVO } from '../coordinacion/textos'
import type { MotivoDeDerivacion, OpcionDeDerivacion } from '../coordinacion/api'
import type { EventoDelCaso, OrigenDelEvento, TipoDeEvento } from './api'

export const TITULO_DEL_EVENTO: Record<TipoDeEvento, string> = {
  ALERTA_RECIBIDA: 'Llegó una alerta',
  DETALLES_COMPLETADOS: 'El testigo completó los detalles',
  ALERTA_CANCELADA: 'El testigo retiró su alerta',
  EVIDENCIA_ANALIZADA: 'Se analizó una evidencia',
  TIPO_DE_SUCESO_DECLARADO: 'El testigo dijo qué pasó',
  RESPUESTA_DEL_TESTIGO: 'El testigo respondió una pregunta',
  UNIDAD_ASIGNADA: 'Se le asignó a una unidad',
  ASIGNACION_CONFIRMADA: 'La tripulación confirmó que va',
  ASIGNACION_RECHAZADA: 'La tripulación no puede ir',
  ASIGNACION_VENCIDA: 'La tripulación no contestó a tiempo',
  ASIGNACION_RETIRADA: 'Se retiró la asignación',
  SIN_UNIDAD_PARA_ASIGNAR: 'No quedó unidad para asignar',
  CONDICIONES_EVALUADAS: 'Se evaluaron las condiciones',
  PLAN_DE_RESPUESTA_ACTUALIZADO: 'Cambió lo que hay que mandar',
  PREGUNTA_AL_TESTIGO: 'Se le preguntó al testigo',
  DERIVADO_A_PERSONA: 'Pasó a la central para decidir',
  DERIVACION_RESUELTA: 'La central decidió',
  DERIVACION_VENCIDA: 'Nadie decidió a tiempo',
  DERIVACION_RETIRADA: 'Ya no hacía falta decidir',
  CONDICION_DECIDIDA: 'Quedó decidida una condición',
  RAZONAMIENTO_DEL_AGENTE: 'El agente razonó el caso',
}

export const TEXTO_DEL_ORIGEN: Record<OrigenDelEvento, string> = {
  CIUDADANO: 'Testigo',
  ANALISIS: 'Análisis de IA',
  TRIPULACION: 'Tripulación',
  SISTEMA: 'Sistema',
  CENTRAL: 'Central',
  AGENTE: 'Agente',
}

const RESPUESTA: Record<string, string> = { SI: 'sí', NO: 'no', NO_SE: 'no sabe' }

const QUIEN_DECIDE: Record<string, string> = {
  TESTIGO: 'el testigo',
  REGLA: 'una regla del protocolo',
  MODELO: 'el modelo',
  CENTRAL: 'la central',
  ANTE_LA_DUDA: 'el criterio ante la duda',
  AGENTE: 'el agente',
}

function texto(datos: Record<string, unknown>, clave: string): string | null {
  const valor = datos[clave]
  return typeof valor === 'string' && valor !== '' ? valor : typeof valor === 'number' ? String(valor) : null
}

function lista(datos: Record<string, unknown>, clave: string): unknown[] {
  const valor = datos[clave]
  return Array.isArray(valor) ? valor : []
}

function unidades(cantidad: string | null) {
  return cantidad === '1' ? '1 unidad' : `${cantidad} unidades`
}

/**
 * Lo que hay que saber de un evento además de su título, en una línea. Los datos de cada evento los arma el backend
 * sin un contrato fijo: si falta lo que se esperaba, no se muestra nada en vez de mostrar algo a medias.
 */
export function detalleDelEvento({ tipo, datos }: EventoDelCaso): string | null {
  if (!datos) {
    return null
  }
  const placa = texto(datos, 'placa')
  const condicion = texto(datos, 'condicion')
  switch (tipo) {
    case 'ALERTA_RECIBIDA': {
      const afectados = texto(datos, 'cantidadAfectados')
      return [datos.incidenteNuevo === true ? 'Abrió el incidente' : 'Se sumó al incidente', afectados ? `${afectados} afectados` : null]
        .filter(Boolean)
        .join(' · ')
    }
    case 'TIPO_DE_SUCESO_DECLARADO':
      return [texto(datos, 'codigo'), datos.aceptado === false ? 'no está en el protocolo' : null].filter(Boolean).join(' · ') || null
    case 'RESPUESTA_DEL_TESTIGO':
      return condicion ? `${condicion}: ${RESPUESTA[texto(datos, 'valor') ?? ''] ?? '—'}` : null
    case 'UNIDAD_ASIGNADA':
      return placa
        ? [`Unidad ${placa}`, texto(datos, 'tipoUnidad') ? `tipo ${texto(datos, 'tipoUnidad')}` : null, texto(datos, 'ronda') ? `ronda ${texto(datos, 'ronda')}` : null]
            .filter(Boolean)
            .join(' · ')
        : null
    case 'ASIGNACION_CONFIRMADA':
      return placa
        ? [`Unidad ${placa}`, texto(datos, 'segundosEnResponder') ? `contestó en ${texto(datos, 'segundosEnResponder')} s` : null]
            .filter(Boolean)
            .join(' · ')
        : null
    case 'ASIGNACION_RECHAZADA':
      return placa ? [`Unidad ${placa}`, texto(datos, 'motivo')].filter(Boolean).join(' · ') : null
    case 'ASIGNACION_VENCIDA':
    case 'ASIGNACION_RETIRADA':
      return placa ? `Unidad ${placa}` : null
    case 'SIN_UNIDAD_PARA_ASIGNAR': {
      const faltan = texto(datos, 'unidadesQueFaltan')
      const tipoQueFalta = texto(datos, 'tipoQueFalta')
      return [faltan && faltan !== '0' ? `Faltan ${unidades(faltan)}` : null, tipoQueFalta ? `falta una de tipo ${tipoQueFalta}` : null]
        .filter(Boolean)
        .join(' · ') || null
    }
    case 'CONDICIONES_EVALUADAS': {
      const cuantas = lista(datos, 'veredictos').length
      const modelo = texto(datos, 'modelo')
      return [
        cuantas === 1 ? '1 condición' : `${cuantas} condiciones`,
        texto(datos, 'metodo') === 'MODELO' ? `con el modelo${modelo ? ` ${modelo}` : ''}` : 'con las reglas',
        texto(datos, 'error') ? 'el modelo no respondió' : null,
      ]
        .filter(Boolean)
        .join(' · ')
    }
    case 'PLAN_DE_RESPUESTA_ACTUALIZADO': {
      const ahora = texto(datos, 'unidades')
      const antes = texto(datos, 'unidadesAntes')
      const tipoMinimo = texto(datos, 'tipoMinimo')
      return [
        ahora && antes && ahora !== antes ? `De ${unidades(antes)} a ${unidades(ahora)}` : ahora ? unidades(ahora) : null,
        tipoMinimo && tipoMinimo !== texto(datos, 'tipoMinimoAntes') ? `al menos una de tipo ${tipoMinimo}` : null,
      ]
        .filter(Boolean)
        .join(' · ') || null
    }
    case 'PREGUNTA_AL_TESTIGO':
      return lista(datos, 'condiciones').filter((codigo) => typeof codigo === 'string').join(', ') || null
    case 'DERIVADO_A_PERSONA':
      return [TITULO_DEL_MOTIVO[texto(datos, 'motivo') as MotivoDeDerivacion], condicion].filter(Boolean).join(' · ') || null
    case 'DERIVACION_RESUELTA':
      return [TEXTO_DE_LA_OPCION[texto(datos, 'opcion') as OpcionDeDerivacion], condicion].filter(Boolean).join(' · ') || null
    case 'DERIVACION_VENCIDA':
    case 'DERIVACION_RETIRADA':
      return condicion
    case 'CONDICION_DECIDIDA': {
      if (!condicion || typeof datos.cumple !== 'boolean') {
        return null
      }
      const por = QUIEN_DECIDE[texto(datos, 'por') ?? '']
      return `${condicion}: ${datos.cumple ? 'se cumple' : 'no se cumple'}${por ? `, según ${por}` : ''}`
    }
    case 'RAZONAMIENTO_DEL_AGENTE': {
      const herramientas = lista(datos, 'herramientas').filter((nombre) => typeof nombre === 'string')
      return [texto(datos, 'modelo'), herramientas.length > 0 ? `consultó ${herramientas.join(', ')}` : 'sin consultar herramientas']
        .filter(Boolean)
        .join(' · ')
    }
    default:
      return null
  }
}
