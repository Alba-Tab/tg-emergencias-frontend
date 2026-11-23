import { Text, XStack } from 'tamagui'
import { CODIGO_DE_PRIORIDAD, NOMBRE_DE_PRIORIDAD, type Prioridad } from './prioridad'

const COLOR = {
  ROJA: '$primario',
  AMARILLA: '$enAtencion',
  VERDE: '$disponible',
} as const

/**
 * La prioridad de un incidente. Va con borde y esquinas rectas para que no se confunda con la insignia de estado, que
 * usa los mismos colores para decir otra cosa. El color nunca va solo: lo acompañan el código y el nombre.
 */
export function InsigniaPrioridad({ prioridad }: { prioridad: Prioridad }) {
  return (
    <XStack
      self="flex-start"
      items="center"
      gap={6}
      height={24}
      px={8}
      rounded={6}
      borderWidth={1}
      borderColor="$bordeFuerte"
      bg="$superficie"
      aria-label={`Prioridad ${NOMBRE_DE_PRIORIDAD[prioridad].toLowerCase()}`}
    >
      <XStack width={8} height={8} rounded={2} bg={COLOR[prioridad]} />
      <Text fontSize={12} lineHeight={16} fontWeight="600" color="$texto">
        {`${CODIGO_DE_PRIORIDAD[prioridad]} · ${NOMBRE_DE_PRIORIDAD[prioridad]}`}
      </Text>
    </XStack>
  )
}
