import { api } from '../../shared/api/cliente'

export type OrigenDeLosCasos = 'GENERADO' | 'REAL'

/** Cuántos casos hay en el banco de cada origen. Los generados son simulados. */
export type ResumenDelBanco = Record<OrigenDeLosCasos, number>

/** Lo que pasa con un par de umbrales sobre los casos medidos. */
export type ConUmbrales = {
  umbralActuar: number
  umbralPreguntar: number
  /** En cuántos casos el modelo llega al umbral de actuar, y en cuántos de esos la condición era cierta. */
  actuan: number
  aciertosAlActuar: number
  precisionAlActuar: number | null
  enDuda: number
  descartadas: number
  /** Casos ciertos que quedan por debajo del umbral de preguntar: los que el sistema dejaría pasar. */
  positivosDescartados: number
  cobertura: number | null
}

/** Un tramo de la curva de calibración. Bien calibrado, la probabilidad media y la frecuencia real se parecen. */
export type Tramo = {
  desde: number
  hasta: number
  casos: number
  probabilidadMedia: number | null
  frecuenciaReal: number | null
}

export type Medido = {
  casos: number
  positivos: number
  /** Error cuadrático medio entre la probabilidad y la verdad: 0 es perfecto; 0,25 es contestar siempre 0,5. */
  brier: number | null
  actuales: ConUmbrales | null
  curva: Tramo[]
  actuarSugerido: number | null
  preguntarSugerido: number | null
  conLosSugeridos: ConUmbrales | null
  /** Por qué lo medido no alcanza para fiarse, si no alcanza. */
  advertencia: string | null
}

export type ResultadoDeCondicion = {
  tipoDeSuceso: string
  condicion: string
  enunciado: string
  medido: Medido
}

export type EstadoDeMedicion = 'PENDIENTE' | 'EN_CURSO' | 'HECHA' | 'FALLIDA'

/** `MedicionResponse` del backend. Corre en segundo plano: `resultados` llega cuando termina. */
export type Medicion = {
  id: number
  estado: EstadoDeMedicion
  /** Nulo si se midió con todos los casos del banco. */
  origenDeLosCasos: OrigenDeLosCasos | null
  objetivoDePrecision: number
  objetivoDeCobertura: number
  casos: number
  casosMedidos: number
  casosConError: number
  proveedor: string | null
  modelo: string | null
  tokensDeEntrada: number | null
  costo: number | null
  error: string | null
  creadaEn: string
  terminadaEn: string | null
  resultados: ResultadoDeCondicion[] | null
}

export type PedirMedicion = {
  origen: OrigenDeLosCasos | null
  objetivoDePrecision: number
  objetivoDeCobertura: number
}

export const medicionApi = {
  resumenDelBanco: (signal?: AbortSignal) => api.get<ResumenDelBanco>('/banco-de-casos/resumen', signal),
  /** 409 si no hay un protocolo publicado con condiciones. */
  generarCasos: (cantidad: number) =>
    api.post<{ generados: number; semilla: number }>('/banco-de-casos/generacion', { cantidad }),
  /** Borra los generados que ninguna medición usó. */
  borrarGenerados: () => api.borrar<{ borrados: number }>('/banco-de-casos/generados'),
  mediciones: (signal?: AbortSignal) => api.get<Medicion[]>('/mediciones', signal),
  /** 409 `SIN_CASOS_DE_PRUEBA` si el banco está vacío. */
  medir: (datos: PedirMedicion) => api.post<Medicion>('/mediciones', datos),
}
