/**
 * Qué tan urgente es un incidente, con las prioridades del triaje telefónico de la Norma Nacional de Caracterización
 * del Sistema Nacional de Emergencias en Salud. El código negro (P4, no se movilizan recursos) no se usa: no mandar a
 * nadie lo decide siempre una persona.
 */
export type Prioridad = 'ROJA' | 'AMARILLA' | 'VERDE'

/** De la más urgente a la menos urgente. */
export const PRIORIDADES: Prioridad[] = ['ROJA', 'AMARILLA', 'VERDE']

export const CODIGO_DE_PRIORIDAD: Record<Prioridad, string> = {
  ROJA: 'P1',
  AMARILLA: 'P2',
  VERDE: 'P3',
}

export const NOMBRE_DE_PRIORIDAD: Record<Prioridad, string> = {
  ROJA: 'Roja',
  AMARILLA: 'Amarilla',
  VERDE: 'Verde',
}
