import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, H2, Paragraph, Spinner, Text, XStack, YStack, useToastController } from 'tamagui'
import { mensajeDeError } from '../../shared/api/cliente'
import { fechaHoraCorta } from '../../shared/formato/fechas'
import { Insignia, type TonoInsignia } from '../../shared/ui/Insignia'
import type { PropuestaDelAnalista, Protocolo, RevisionDelProtocolo, TipoDePropuesta } from './api'
import { pedirRevisionMutation, revisionesDelProtocoloQuery, revisionSigueCorriendo } from './queries'

const TIPO_DE_PROPUESTA: Record<TipoDePropuesta, string> = {
  AJUSTAR_UMBRAL: 'Ajustar la certeza',
  CAMBIAR_PREGUNTA: 'Cambiar la pregunta',
  CAMBIAR_RESPUESTA: 'Cambiar lo que se manda',
  AGREGAR_CONDICION: 'Agregar una condición',
  QUITAR_CONDICION: 'Quitar una condición',
  OTRA: 'Otra mejora',
}

const ESTADO: Record<RevisionDelProtocolo['estado'], { texto: string; tono: TonoInsignia }> = {
  PENDIENTE: { texto: 'En cola', tono: 'ambar' },
  EN_CURSO: { texto: 'Revisando', tono: 'ambar' },
  HECHA: { texto: 'Terminada', tono: 'verde' },
  FALLIDA: { texto: 'Falló', tono: 'rojo' },
}

/**
 * PB-45: lo que propone el analista después de mirar cómo funcionó el protocolo vigente. Son sugerencias: ninguna
 * cambia el protocolo. Para aplicar una, la central edita un borrador y lo publica, como siempre.
 */
export function RevisionDelAnalista({ protocolo }: { protocolo: Protocolo }) {
  const queryClient = useQueryClient()
  const toast = useToastController()
  const revisiones = useQuery(revisionesDelProtocoloQuery())
  const pedir = useMutation(pedirRevisionMutation(queryClient))
  const ultima = revisiones.data?.[0]
  const corriendo = ultima ? revisionSigueCorriendo(ultima) : false

  return (
    <YStack render="section" gap={12}>
      <XStack items="center" justify="space-between" gap={12} flexWrap="wrap">
        <YStack gap={2} flex={1} minW={260}>
          <H2 color="$texto" fontSize={16} lineHeight={22} fontWeight="600">
            Revisión del analista
          </H2>
          <Paragraph color="$textoSecundario" fontSize={13} lineHeight={18}>
            Mira cómo funcionó este protocolo y propone mejoras. No cambia nada: para aplicar una propuesta, edítala en
            un borrador.
          </Paragraph>
        </YStack>
        <Button
          size="$3"
          disabled={pedir.isPending || corriendo}
          icon={pedir.isPending || corriendo ? <Spinner size="small" /> : undefined}
          onPress={() =>
            pedir.mutate(undefined, {
              onError: (error) => toast.show('No se pudo pedir la revisión', { message: mensajeDeError(error) }),
            })
          }
        >
          <Button.Text color="$texto">{corriendo ? 'Revisando…' : 'Pedir una revisión'}</Button.Text>
        </Button>
      </XStack>

      {revisiones.isError ? (
        <Paragraph color="$primarioPresionado" fontSize={13} lineHeight={18}>
          {`No se pudieron cargar las revisiones. ${mensajeDeError(revisiones.error)}`}
        </Paragraph>
      ) : ultima ? (
        <UltimaRevision revision={ultima} protocolo={protocolo} />
      ) : revisiones.isPending ? null : (
        <Paragraph color="$textoSecundario" fontSize={14} lineHeight={20}>
          Todavía no se pidió ninguna revisión.
        </Paragraph>
      )}
    </YStack>
  )
}

function UltimaRevision({ revision, protocolo }: { revision: RevisionDelProtocolo; protocolo: Protocolo }) {
  const estado = ESTADO[revision.estado]
  const propuestas = revision.propuestas ?? []
  return (
    <YStack gap={12} p={16} rounded={12} borderWidth={1} borderColor="$borde" bg="$superficie">
      <XStack items="center" gap={10} flexWrap="wrap">
        <Insignia tono={estado.tono}>{estado.texto}</Insignia>
        <Text fontSize={12} color="$textoSecundario">
          {`Revisión #${revision.id} · ${fechaHoraCorta(revision.creadaEn)} · sobre la versión ${revision.versionDelProtocolo}`}
        </Text>
        {revision.versionDelProtocolo !== protocolo.version ? (
          <Insignia tono="contorno">De una versión anterior</Insignia>
        ) : null}
      </XStack>

      {revision.nota ? (
        <Paragraph color="$texto" fontSize={14} lineHeight={20}>
          {revision.nota}
        </Paragraph>
      ) : null}

      {propuestas.map((propuesta, indice) => (
        <Propuesta key={indice} propuesta={propuesta} protocolo={protocolo} />
      ))}

      {revision.estado === 'HECHA' ? (
        <Text fontSize={12} lineHeight={17} color="$textoTenue">
          {[
            `Se apoyó en ${(revision.hechos ?? []).length} hechos contados del uso del protocolo.`,
            revision.descartadas > 0
              ? `${revision.descartadas === 1 ? 'Se descartó 1 propuesta' : `Se descartaron ${revision.descartadas} propuestas`} por no tener respaldo suficiente.`
              : null,
          ]
            .filter(Boolean)
            .join(' ')}
        </Text>
      ) : null}
    </YStack>
  )
}

/** Sobre qué trata la propuesta, con los nombres del protocolo en vez de sus códigos. */
function asuntoDe(propuesta: PropuestaDelAnalista, protocolo: Protocolo) {
  const tipo = protocolo.tipos.find((uno) => uno.codigo === propuesta.tipoDeSuceso)
  const condicion = tipo?.condiciones.find((una) => una.codigo === propuesta.condicion)
  return [tipo?.nombre ?? propuesta.tipoDeSuceso, condicion?.enunciado ?? propuesta.condicion]
    .filter(Boolean)
    .join(' · ')
}

function Propuesta({ propuesta, protocolo }: { propuesta: PropuestaDelAnalista; protocolo: Protocolo }) {
  return (
    <YStack gap={6} pt={12} borderTopWidth={1} borderColor="$borde">
      <XStack items="center" gap={8} flexWrap="wrap">
        <Insignia tono="contorno">{TIPO_DE_PROPUESTA[propuesta.tipo] ?? propuesta.tipo}</Insignia>
        <Text fontSize={12} color="$textoSecundario">
          {asuntoDe(propuesta, protocolo)}
        </Text>
      </XStack>
      <Text fontSize={15} lineHeight={21} fontWeight="600" color="$texto">
        {propuesta.propuesta}
      </Text>
      <Text fontSize={14} lineHeight={20} color="$texto">
        {propuesta.porQue}
      </Text>
      <YStack gap={2}>
        <Text fontSize={12} lineHeight={17} fontWeight="500" color="$textoSecundario">
          En qué se apoya
        </Text>
        {propuesta.hechos.map((hecho) => (
          <Text key={hecho} fontSize={12} lineHeight={17} color="$textoSecundario">
            {`· ${hecho}`}
          </Text>
        ))}
        {propuesta.norma.map((cita) => (
          <Text key={cita} fontSize={12} lineHeight={17} color="$textoSecundario">
            {`· Norma: ${cita}`}
          </Text>
        ))}
      </YStack>
    </YStack>
  )
}
