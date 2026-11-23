import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Button, H2, Input, Label, Paragraph, Spinner, Text, XStack, YStack, useToastController } from 'tamagui'
import { codigoDeError, mensajeDeError } from '../../shared/api/cliente'
import { fechaHoraCorta } from '../../shared/formato/fechas'
import { useAhora } from '../../shared/reloj/useAhora'
import { BotonPrimario } from '../../shared/ui/botones'
import { EncabezadoPagina } from '../../shared/ui/EncabezadoPagina'
import { Cargando, ErrorAlCargar } from '../../shared/ui/EstadosDeCarga'
import { Insignia } from '../../shared/ui/Insignia'
import { OpcionElegible } from '../../shared/ui/OpcionElegible'
import { FilaTabla, Tabla, TablaVacia, type ColumnaTabla } from '../../shared/ui/Tabla'
import type { AjusteDeDespacho, Derivacion, ModoDeDespacho, OpcionDeDerivacion } from './api'
import {
  ajusteDeDespachoQuery,
  cambiarAjusteDeDespachoMutation,
  decidirDerivacionMutation,
  derivacionesPorAtenderQuery,
  historialDeDerivacionesQuery,
  marcarDerivacionVistaMutation,
} from './queries'
import { efectoSiSeCumple, explicacionDe, TEXTO_DE_LA_OPCION, TEXTO_DEL_ESTADO, TITULO_DEL_MOTIVO } from './textos'

const MODOS: Record<ModoDeDespacho, { titulo: string; detalle: string }> = {
  DIFUSION: {
    titulo: 'Difusión',
    detalle: 'El incidente se avisa a todas las unidades de turno y lo toma la que quiera.',
  },
  ASIGNACION: {
    titulo: 'Asignación con confirmación',
    detalle: 'El sistema se lo asigna a la unidad libre que llega antes y espera que su tripulación confirme.',
  },
}

const COLUMNAS_DEL_HISTORIAL: ColumnaTabla[] = [
  { titulo: 'Incidente', ancho: 100 },
  { titulo: 'Asunto' },
  { titulo: 'Cómo terminó', ancho: 190 },
  { titulo: 'Respuesta' },
  { titulo: 'Cuándo', ancho: 130 },
]

/**
 * PB-33 y PB-38: cómo despacha la central y lo que el sistema le pasa a una persona porque no puede o no debe
 * decidirlo solo. Cada derivación tiene un tiempo límite: si nadie contesta, se aplica la opción marcada.
 */
export function CoordinacionPage() {
  const porAtender = useQuery(derivacionesPorAtenderQuery())
  const historial = useQuery(historialDeDerivacionesQuery())
  const ahora = useAhora()

  return (
    <>
      <EncabezadoPagina
        titulo="Coordinación"
        descripcion="Cómo despacha la central y lo que el sistema necesita que decida una persona."
      />

      <YStack gap={12}>
        <H2 color="$texto" fontSize={16} lineHeight={22} fontWeight="600">
          Por decidir
        </H2>
        {porAtender.isPending ? (
          <Cargando texto="Cargando lo que hay por decidir…" />
        ) : porAtender.isError ? (
          <ErrorAlCargar error={porAtender.error} onReintentar={() => porAtender.refetch()} />
        ) : porAtender.data.length === 0 ? (
          <Paragraph color="$textoSecundario" fontSize={14} lineHeight={20}>
            No hay nada esperando una decisión.
          </Paragraph>
        ) : (
          porAtender.data.map((derivacion) => <TarjetaDeDerivacion key={derivacion.id} derivacion={derivacion} ahora={ahora} />)
        )}
      </YStack>

      <DespachoDeLaCentral />

      <YStack gap={12}>
        <H2 color="$texto" fontSize={16} lineHeight={22} fontWeight="600">
          Últimas derivaciones
        </H2>
        {historial.isPending ? (
          <Cargando texto="Cargando el historial…" />
        ) : historial.isError ? (
          <ErrorAlCargar error={historial.error} onReintentar={() => historial.refetch()} />
        ) : (
          <Tabla columnas={COLUMNAS_DEL_HISTORIAL}>
            {historial.data.length === 0 ? (
              <TablaVacia>Todavía no se le pasó nada a una persona.</TablaVacia>
            ) : (
              historial.data.map((derivacion) => (
                <FilaTabla key={derivacion.id} columnas={COLUMNAS_DEL_HISTORIAL}>
                  <EnlaceAlIncidente incidenteId={derivacion.incidenteId} />
                  <Text fontSize={14} color="$texto" numberOfLines={1}>
                    {asuntoDe(derivacion)}
                  </Text>
                  <Text fontSize={14} color="$textoSecundario">
                    {TEXTO_DEL_ESTADO[derivacion.estado]}
                  </Text>
                  <Text fontSize={14} color="$texto" numberOfLines={1}>
                    {derivacion.opcionElegida ? TEXTO_DE_LA_OPCION[derivacion.opcionElegida] : '—'}
                    {derivacion.resueltaPor ? ` · ${derivacion.resueltaPor}` : ''}
                  </Text>
                  <Text fontSize={13} color="$textoSecundario">
                    {fechaHoraCorta(derivacion.creadaEn)}
                  </Text>
                </FilaTabla>
              ))
            )}
          </Tabla>
        )}
      </YStack>
    </>
  )
}

function asuntoDe(derivacion: Derivacion) {
  return (
    derivacion.detalle.condicion?.enunciado ?? derivacion.detalle.propuesta ?? TITULO_DEL_MOTIVO[derivacion.motivo]
  )
}

function EnlaceAlIncidente({ incidenteId }: { incidenteId: number }) {
  return (
    <Link to="/incidentes/$incidenteId" params={{ incidenteId }} style={{ textDecoration: 'none' }}>
      <Text fontSize={14} fontWeight="500" color="$primarioPresionado">
        {`#${incidenteId}`}
      </Text>
    </Link>
  )
}

/** Una derivación que espera respuesta, o que venció y nadie vio. */
function TarjetaDeDerivacion({ derivacion, ahora }: { derivacion: Derivacion; ahora: number }) {
  const queryClient = useQueryClient()
  const toast = useToastController()
  const decidir = useMutation(decidirDerivacionMutation(queryClient))
  const marcarVista = useMutation(marcarDerivacionVistaMutation(queryClient))
  const [nota, setNota] = useState('')
  const vencida = derivacion.estado === 'VENCIDA'
  const segundos = Math.max(0, Math.ceil((new Date(derivacion.venceEn).getTime() - ahora) / 1000))
  const efecto = derivacion.motivo === 'CONDICION_SIN_RESOLVER' ? efectoSiSeCumple(derivacion) : null

  function contestar(opcion: OpcionDeDerivacion) {
    decidir.mutate(
      { id: derivacion.id, opcion, nota: nota.trim() || null },
      {
        onSuccess: () => toast.show('Respuesta registrada', { message: TEXTO_DE_LA_OPCION[opcion] }),
        onError: (error) =>
          toast.show(
            codigoDeError(error) === 'DERIVACION_CERRADA' ? 'Ya no esperaba respuesta' : 'No se pudo registrar',
            { message: mensajeDeError(error) },
          ),
      },
    )
  }

  return (
    <YStack gap={12} p={16} rounded={12} borderWidth={1} borderColor={vencida ? '$bordeFuerte' : '$primario'} bg="$superficie">
      <XStack items="center" justify="space-between" gap={12} flexWrap="wrap">
        <XStack items="center" gap={10} flexWrap="wrap">
          <Text fontSize={15} fontWeight="600" color="$texto">
            {TITULO_DEL_MOTIVO[derivacion.motivo]}
          </Text>
          <EnlaceAlIncidente incidenteId={derivacion.incidenteId} />
        </XStack>
        {vencida ? (
          <Insignia tono="gris">Venció sin respuesta</Insignia>
        ) : (
          <Insignia tono={segundos <= 15 ? 'rojo' : 'ambar'} conPunto>
            {segundos > 0 ? `${segundos} s para contestar` : 'Venciendo…'}
          </Insignia>
        )}
      </XStack>

      <YStack gap={4}>
        <Text fontSize={16} lineHeight={22} fontWeight="600" color="$texto">
          {asuntoDe(derivacion)}
        </Text>
        {explicacionDe(derivacion).map((linea) => (
          <Paragraph key={linea} fontSize={14} lineHeight={20} color="$textoSecundario">
            {linea}
          </Paragraph>
        ))}
        {efecto ? (
          <Paragraph fontSize={14} lineHeight={20} color="$texto">
            {efecto}
          </Paragraph>
        ) : null}
        {derivacion.detalle.condicion?.cita ? (
          <Paragraph fontSize={12} lineHeight={17} color="$textoTenue">
            {derivacion.detalle.condicion.cita}
          </Paragraph>
        ) : null}
      </YStack>

      {vencida ? (
        <XStack items="center" justify="space-between" gap={12} flexWrap="wrap">
          <Paragraph fontSize={14} lineHeight={20} color="$texto">
            {`Nadie contestó a tiempo y se aplicó: ${derivacion.opcionElegida ? TEXTO_DE_LA_OPCION[derivacion.opcionElegida] : '—'}.`}
          </Paragraph>
          <Button size="$3" disabled={marcarVista.isPending} onPress={() => marcarVista.mutate(derivacion.id)}>
            <Button.Text color="$texto">Marcar como vista</Button.Text>
          </Button>
        </XStack>
      ) : (
        <YStack gap={10}>
          <Input
            size="$3"
            placeholder="Nota (opcional): qué se verificó o a quién se llamó"
            aria-label="Nota de la decisión"
            value={nota}
            maxLength={1000}
            onChange={(evento) => setNota(evento.currentTarget.value)}
            borderColor="$bordeFuerte"
          />
          <XStack gap={8} flexWrap="wrap" items="center">
            {derivacion.opciones.map((opcion, indice) =>
              indice === 0 ? (
                <BotonPrimario
                  key={opcion.codigo}
                  size="$3"
                  disabled={decidir.isPending}
                  icon={decidir.isPending ? <Spinner color="$primarioTexto" /> : undefined}
                  onPress={() => contestar(opcion.codigo)}
                >
                  <Button.Text color="$primarioTexto">{opcion.texto}</Button.Text>
                </BotonPrimario>
              ) : (
                <Button key={opcion.codigo} size="$3" disabled={decidir.isPending} onPress={() => contestar(opcion.codigo)}>
                  <Button.Text color="$texto">{opcion.texto}</Button.Text>
                </Button>
              ),
            )}
            <Text fontSize={12} color="$textoSecundario">
              {`Si nadie contesta: ${TEXTO_DE_LA_OPCION[derivacion.opcionSegura]}.`}
            </Text>
          </XStack>
        </YStack>
      )}
    </YStack>
  )
}

/** PB-33: el interruptor del modo de despacho y cuánto se espera la confirmación de una tripulación. */
function DespachoDeLaCentral() {
  const ajuste = useQuery(ajusteDeDespachoQuery())

  return (
    <YStack gap={12}>
      <H2 color="$texto" fontSize={16} lineHeight={22} fontWeight="600">
        Modo de despacho
      </H2>
      {ajuste.isPending ? (
        <Cargando texto="Cargando el modo de despacho…" />
      ) : ajuste.isError ? (
        <ErrorAlCargar error={ajuste.error} onReintentar={() => ajuste.refetch()} />
      ) : (
        // La clave rearma el formulario con lo guardado cada vez que cambia en el servidor.
        <FormularioDeDespacho
          key={`${ajuste.data.modo}-${ajuste.data.segundosConfirmacion}`}
          ajuste={ajuste.data}
        />
      )}
    </YStack>
  )
}

function FormularioDeDespacho({ ajuste }: { ajuste: AjusteDeDespacho }) {
  const queryClient = useQueryClient()
  const toast = useToastController()
  const cambiar = useMutation(cambiarAjusteDeDespachoMutation(queryClient))
  const [modo, setModo] = useState<ModoDeDespacho>(ajuste.modo)
  const [segundos, setSegundos] = useState(String(ajuste.segundosConfirmacion))

  const espera = Number(segundos)
  const esperaValida = Number.isInteger(espera) && espera >= 10 && espera <= 300
  const sinCambios = ajuste.modo === modo && ajuste.segundosConfirmacion === espera

  return (
    <YStack gap={14} p={16} rounded={12} borderWidth={1} borderColor="$borde" bg="$superficie" maxW={640}>
      <YStack gap={8} role="radiogroup" aria-label="Modo de despacho">
        {(Object.keys(MODOS) as ModoDeDespacho[]).map((opcion) => (
          <OpcionElegible
            key={opcion}
            titulo={MODOS[opcion].titulo}
            detalle={MODOS[opcion].detalle}
            elegida={modo === opcion}
            onElegir={() => setModo(opcion)}
          />
        ))}
      </YStack>
      <YStack gap={6} maxW={280}>
        <Label htmlFor="segundos-confirmacion" color="$texto" fontSize={13} fontWeight="500">
          Segundos para que la tripulación confirme
        </Label>
        <Input
          id="segundos-confirmacion"
          size="$4"
          inputMode="numeric"
          value={segundos}
          disabled={modo !== 'ASIGNACION'}
          onChange={(evento) => setSegundos(evento.currentTarget.value)}
          borderColor={esperaValida ? '$bordeFuerte' : '$primario'}
        />
        <Paragraph fontSize={12} lineHeight={17} color={esperaValida ? '$textoSecundario' : '$primarioPresionado'}>
          Entre 10 y 300. Si no contesta a tiempo, el incidente pasa a la unidad siguiente.
        </Paragraph>
      </YStack>
      <XStack items="center" gap={12} flexWrap="wrap">
        <BotonPrimario
          size="$4"
          disabled={!esperaValida || sinCambios || cambiar.isPending}
          opacity={!esperaValida || sinCambios ? 0.5 : 1}
          icon={cambiar.isPending ? <Spinner color="$primarioTexto" /> : undefined}
          onPress={() =>
            cambiar.mutate(
              { modo, segundosConfirmacion: espera },
              {
                onSuccess: () => toast.show('Modo de despacho guardado', { message: MODOS[modo].titulo }),
                onError: (error) => toast.show('No se pudo guardar', { message: mensajeDeError(error) }),
              },
            )
          }
        >
          <Button.Text color="$primarioTexto">Guardar</Button.Text>
        </BotonPrimario>
        {ajuste.actualizadoEn ? (
          <Text fontSize={12} color="$textoSecundario">
            {`Último cambio: ${fechaHoraCorta(ajuste.actualizadoEn)}${ajuste.actualizadoPor ? ` · ${ajuste.actualizadoPor}` : ''}`}
          </Text>
        ) : null}
      </XStack>
    </YStack>
  )
}
