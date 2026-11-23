import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Button, Paragraph, Text, XStack, YStack } from 'tamagui'
import { mensajeDeError } from '../../shared/api/cliente'
import { fechaHoraCorta } from '../../shared/formato/fechas'
import { Insignia, type TonoInsignia } from '../../shared/ui/Insignia'
import { Nota, Seccion, Tarjeta } from '../incidentes/PiezasDelDetalle'
import type { OrigenDelEvento } from './api'
import { bitacoraDelIncidenteQuery } from './queries'
import { detalleDelEvento, TEXTO_DEL_ORIGEN, TITULO_DEL_EVENTO } from './textos'

/** Cuántos eventos se ven sin pedir más: un incidente común tiene pocos; uno largo no debe tapar el resto del detalle. */
const VISIBLES = 12

const TONO_DEL_ORIGEN: Record<OrigenDelEvento, TonoInsignia> = {
  CIUDADANO: 'contorno',
  ANALISIS: 'gris',
  TRIPULACION: 'verde',
  SISTEMA: 'gris',
  CENTRAL: 'rojo',
  AGENTE: 'ambar',
}

/**
 * PB-32: la bitácora del caso. Todo lo que llegó al incidente y todo lo que el sistema decidió con él, en orden y
 * diciendo quién lo aportó. Es lo que permite revisar después por qué se mandó lo que se mandó.
 */
export function BitacoraDelIncidente({ incidenteId }: { incidenteId: number }) {
  const bitacora = useQuery(bitacoraDelIncidenteQuery(incidenteId))
  const [completa, setCompleta] = useState(false)

  if (bitacora.isPending) {
    return null
  }

  const titulo = bitacora.data ? `Bitácora (${bitacora.data.length})` : 'Bitácora'

  if (bitacora.isError) {
    return (
      <Seccion titulo={titulo}>
        <Tarjeta>
          <XStack items="center" justify="space-between" gap={12} flexWrap="wrap">
            <Paragraph color="$texto" fontSize={14} lineHeight={20}>
              {`No se pudo cargar la bitácora. ${mensajeDeError(bitacora.error)}`}
            </Paragraph>
            <Button size="$3" onPress={() => void bitacora.refetch()}>
              <Button.Text color="$texto">Reintentar</Button.Text>
            </Button>
          </XStack>
        </Tarjeta>
      </Seccion>
    )
  }

  if (bitacora.data.length === 0) {
    return null
  }

  // Lo último primero: lo que la central quiere ver al abrir un incidente en curso es qué acaba de pasar.
  const eventos = [...bitacora.data].reverse()
  const visibles = completa ? eventos : eventos.slice(0, VISIBLES)

  return (
    <Seccion titulo={titulo}>
      <Tarjeta>
        <YStack render="ol" gap={0} m={0} p={0}>
          {visibles.map((evento, indice) => {
            const detalle = detalleDelEvento(evento)
            return (
              <XStack
                key={evento.id}
                render="li"
                gap={16}
                py={10}
                items="flex-start"
                borderTopWidth={indice === 0 ? 0 : 1}
                borderColor="$borde"
              >
                <Text width={116} fontSize={13} lineHeight={20} color="$textoSecundario">
                  {fechaHoraCorta(evento.ocurridoEn)}
                </Text>
                <YStack flex={1} minW={0} gap={2}>
                  <Text fontSize={14} lineHeight={20} fontWeight="500" color="$texto">
                    {TITULO_DEL_EVENTO[evento.tipo] ?? evento.tipo}
                  </Text>
                  {detalle ? <Nota>{detalle}</Nota> : null}
                </YStack>
                <Insignia tono={TONO_DEL_ORIGEN[evento.origen] ?? 'gris'}>{TEXTO_DEL_ORIGEN[evento.origen] ?? evento.origen}</Insignia>
              </XStack>
            )
          })}
        </YStack>
        {eventos.length > VISIBLES ? (
          <Button size="$3" self="flex-start" mt={12} onPress={() => setCompleta(!completa)}>
            <Button.Text color="$texto">{completa ? 'Ver solo lo último' : `Ver los ${eventos.length} eventos`}</Button.Text>
          </Button>
        ) : null}
      </Tarjeta>
    </Seccion>
  )
}
