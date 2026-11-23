import { Button } from 'tamagui'

type Props = {
  texto: string
  elegida: boolean
  onElegir: () => void
}

/**
 * Una opción de pocas palabras entre varias que van en una misma línea. Para opciones que necesitan una explicación
 * está `OpcionElegible`. Va dentro de un contenedor con `role="radiogroup"`.
 */
export function ElegibleCompacto({ texto, elegida, onElegir }: Props) {
  return (
    <Button
      size="$2"
      role="radio"
      aria-checked={elegida}
      bg={elegida ? '$primarioTinte' : 'transparent'}
      borderColor={elegida ? '$primario' : '$bordeFuerte'}
      onPress={onElegir}
    >
      <Button.Text color={elegida ? '$primarioTinteTexto' : '$texto'} fontSize={13} fontWeight={elegida ? '600' : '500'}>
        {texto}
      </Button.Text>
    </Button>
  )
}
