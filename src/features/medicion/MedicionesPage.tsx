import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Button, Input, Label, Paragraph, Spinner, Text, XStack, YStack, useToastController } from 'tamagui'
import { mensajeDeError } from '../../shared/api/cliente'
import { fechaHoraCorta } from '../../shared/formato/fechas'
import { BotonPrimario } from '../../shared/ui/botones'
import { ElegibleCompacto } from '../../shared/ui/ElegibleCompacto'
import { EncabezadoPagina } from '../../shared/ui/EncabezadoPagina'
import { Cargando, ErrorAlCargar } from '../../shared/ui/EstadosDeCarga'
import { Insignia, type TonoInsignia } from '../../shared/ui/Insignia'
import { FilaTabla, Tabla, type ColumnaTabla } from '../../shared/ui/Tabla'
import { Dato, Nota, Seccion, Tarjeta, Valor } from '../incidentes/PiezasDelDetalle'
import type { ConUmbrales, EstadoDeMedicion, Medicion, OrigenDeLosCasos, ResultadoDeCondicion } from './api'
import {
  borrarGeneradosMutation,
  generarCasosMutation,
  medicionesQuery,
  medirMutation,
  resumenDelBancoQuery,
  sigueCorriendo,
} from './queries'

const ESTADOS: Record<EstadoDeMedicion, { texto: string; tono: TonoInsignia }> = {
  PENDIENTE: { texto: 'En cola', tono: 'ambar' },
  EN_CURSO: { texto: 'Midiendo', tono: 'ambar' },
  HECHA: { texto: 'Terminada', tono: 'verde' },
  FALLIDA: { texto: 'Falló', tono: 'rojo' },
}

const ORIGENES: { valor: OrigenDeLosCasos | null; texto: string }[] = [
  { valor: null, texto: 'Todos' },
  { valor: 'GENERADO', texto: 'Solo simulados' },
  { valor: 'REAL', texto: 'Solo reales' },
]

function textoDelOrigen(origen: OrigenDeLosCasos | null) {
  return origen === 'GENERADO' ? 'casos simulados' : origen === 'REAL' ? 'casos reales' : 'todos los casos'
}

function porcentaje(valor: number | null) {
  return valor === null ? '—' : `${Math.round(valor * 100)} %`
}

function numero(valor: number | null, decimales = 2) {
  return valor === null ? '—' : valor.toFixed(decimales)
}

/**
 * PB-41: cuánto acierta el modelo de decisión con casos de respuesta conocida, y qué umbrales conviene poner en el
 * protocolo. Los casos generados son simulados: prueban el mecanismo, no dicen cómo se comporta el modelo en la calle.
 */
export function MedicionesPage() {
  const mediciones = useQuery(medicionesQuery())
  const [elegidaId, setElegidaId] = useState<number | null>(null)
  const elegida = mediciones.data?.find((medicion) => medicion.id === elegidaId) ?? mediciones.data?.[0]

  return (
    <>
      <EncabezadoPagina
        titulo="Mediciones"
        descripcion="Cuánto acierta el modelo de decisión con casos de respuesta conocida, y qué umbrales conviene poner."
      />
      <BancoDeCasos />
      <PedirMedicion onPedida={setElegidaId} />
      <Seccion titulo="Mediciones hechas">
        {mediciones.isPending ? (
          <Cargando texto="Cargando las mediciones…" />
        ) : mediciones.isError ? (
          <ErrorAlCargar error={mediciones.error} onReintentar={() => mediciones.refetch()} />
        ) : mediciones.data.length === 0 ? (
          <Tarjeta>
            <Paragraph color="$textoSecundario" fontSize={14} lineHeight={20}>
              Todavía no se midió nada. Con casos en el banco, pide la primera medición.
            </Paragraph>
          </Tarjeta>
        ) : (
          <YStack gap={12}>
            <XStack gap={8} flexWrap="wrap" role="radiogroup" aria-label="Medición que se muestra">
              {mediciones.data.slice(0, 12).map((medicion) => (
                <ElegibleCompacto
                  key={medicion.id}
                  texto={`#${medicion.id} · ${fechaHoraCorta(medicion.creadaEn)}`}
                  elegida={medicion.id === elegida?.id}
                  onElegir={() => setElegidaId(medicion.id)}
                />
              ))}
            </XStack>
            {elegida ? <DetalleDeMedicion medicion={elegida} /> : null}
          </YStack>
        )}
      </Seccion>
    </>
  )
}

function BancoDeCasos() {
  const queryClient = useQueryClient()
  const toast = useToastController()
  const resumen = useQuery(resumenDelBancoQuery())
  const generar = useMutation(generarCasosMutation(queryClient))
  const borrar = useMutation(borrarGeneradosMutation(queryClient))
  const [cantidad, setCantidad] = useState('50')
  const cuantos = Number(cantidad)
  const cantidadValida = Number.isInteger(cuantos) && cuantos >= 1 && cuantos <= 500

  return (
    <Seccion titulo="Banco de casos">
      <Tarjeta>
        <YStack gap={16}>
          <XStack gap={32} flexWrap="wrap">
            <Dato etiqueta="Simulados">
              <Valor>{resumen.data ? resumen.data.GENERADO : '—'}</Valor>
            </Dato>
            <Dato etiqueta="Reales">
              <Valor>{resumen.data ? resumen.data.REAL : '—'}</Valor>
            </Dato>
          </XStack>
          <Nota>
            Los simulados los inventa el sistema a partir del protocolo vigente: sirven para probar el mecanismo, no para
            afirmar cómo acierta el modelo en la calle. Los reales salen de incidentes cuya verdad confirmó la central.
          </Nota>
          <XStack gap={12} items="flex-end" flexWrap="wrap">
            <YStack gap={4} width={160}>
              <Label htmlFor="cantidad-de-casos" color="$texto" fontSize={12} fontWeight="500" lineHeight={16}>
                Casos a generar (1 a 500)
              </Label>
              <Input
                id="cantidad-de-casos"
                size="$3"
                inputMode="numeric"
                value={cantidad}
                onChange={(evento) => setCantidad(evento.currentTarget.value)}
                borderColor={cantidadValida ? '$bordeFuerte' : '$primario'}
              />
            </YStack>
            <Button
              size="$3"
              disabled={!cantidadValida || generar.isPending}
              icon={generar.isPending ? <Spinner size="small" /> : undefined}
              onPress={() =>
                generar.mutate(cuantos, {
                  onSuccess: (hecho) => toast.show('Casos simulados generados', { message: `Se sumaron ${hecho.generados}.` }),
                  onError: (error) => toast.show('No se pudieron generar', { message: mensajeDeError(error) }),
                })
              }
            >
              <Button.Text color="$texto">Generar simulados</Button.Text>
            </Button>
            <Button
              size="$3"
              disabled={borrar.isPending}
              onPress={() =>
                borrar.mutate(undefined, {
                  onSuccess: (hecho) => toast.show('Simulados borrados', { message: `Se borraron ${hecho.borrados} que ninguna medición usó.` }),
                  onError: (error) => toast.show('No se pudieron borrar', { message: mensajeDeError(error) }),
                })
              }
            >
              <Button.Text color="$texto">Borrar los simulados sin medir</Button.Text>
            </Button>
          </XStack>
        </YStack>
      </Tarjeta>
    </Seccion>
  )
}

function PedirMedicion({ onPedida }: { onPedida: (id: number) => void }) {
  const queryClient = useQueryClient()
  const toast = useToastController()
  const medir = useMutation(medirMutation(queryClient))
  const [origen, setOrigen] = useState<OrigenDeLosCasos | null>(null)
  const [precision, setPrecision] = useState('0.9')
  const [cobertura, setCobertura] = useState('0.95')
  const objetivoDePrecision = Number(precision)
  const objetivoDeCobertura = Number(cobertura)
  const valido = [objetivoDePrecision, objetivoDeCobertura].every((valor) => valor >= 0.5 && valor <= 1)

  return (
    <Seccion titulo="Medir al modelo">
      <Tarjeta>
        <YStack gap={14}>
          <XStack gap={8} items="center" flexWrap="wrap" role="radiogroup" aria-label="Casos con los que se mide">
            <Text fontSize={13} fontWeight="500" color="$texto">
              Con qué casos
            </Text>
            {ORIGENES.map((opcion) => (
              <ElegibleCompacto
                key={opcion.valor ?? 'todos'}
                texto={opcion.texto}
                elegida={origen === opcion.valor}
                onElegir={() => setOrigen(opcion.valor)}
              />
            ))}
          </XStack>
          <XStack gap={12} items="flex-end" flexWrap="wrap">
            <CampoDeObjetivo
              id="objetivo-de-precision"
              etiqueta="Al actuar, acertar al menos"
              valor={precision}
              onCambiar={setPrecision}
            />
            <CampoDeObjetivo
              id="objetivo-de-cobertura"
              etiqueta="De los casos ciertos, conservar al menos"
              valor={cobertura}
              onCambiar={setCobertura}
            />
            <BotonPrimario
              size="$3"
              disabled={!valido || medir.isPending}
              opacity={valido ? 1 : 0.5}
              icon={medir.isPending ? <Spinner color="$primarioTexto" /> : undefined}
              onPress={() =>
                medir.mutate(
                  { origen, objetivoDePrecision, objetivoDeCobertura },
                  {
                    onSuccess: (medicion) => {
                      onPedida(medicion.id)
                      toast.show('Medición pedida', { message: `Corre en segundo plano con ${medicion.casos} casos.` })
                    },
                    onError: (error) => toast.show('No se pudo medir', { message: mensajeDeError(error) }),
                  },
                )
              }
            >
              <Button.Text color="$primarioTexto">Medir ahora</Button.Text>
            </BotonPrimario>
          </XStack>
          <Nota>
            Los dos objetivos van de 0,5 a 1. Con ellos se calculan los umbrales sugeridos: medir no cambia el protocolo.
          </Nota>
        </YStack>
      </Tarjeta>
    </Seccion>
  )
}

type PropsCampoDeObjetivo = { id: string; etiqueta: string; valor: string; onCambiar: (valor: string) => void }

function CampoDeObjetivo({ id, etiqueta, valor, onCambiar }: PropsCampoDeObjetivo) {
  return (
    <YStack gap={4} width={300}>
      <Label htmlFor={id} color="$texto" fontSize={12} fontWeight="500" lineHeight={16}>
        {etiqueta}
      </Label>
      <Input
        id={id}
        size="$3"
        inputMode="decimal"
        value={valor}
        onChange={(evento) => onCambiar(evento.currentTarget.value)}
        borderColor="$bordeFuerte"
      />
    </YStack>
  )
}

function DetalleDeMedicion({ medicion }: { medicion: Medicion }) {
  const estado = ESTADOS[medicion.estado]
  return (
    <YStack gap={12}>
      <Tarjeta>
        <YStack gap={14}>
          <XStack items="center" gap={10} flexWrap="wrap">
            <Text fontSize={15} fontWeight="600" color="$texto">{`Medición #${medicion.id}`}</Text>
            <Insignia tono={estado.tono}>{estado.texto}</Insignia>
            {sigueCorriendo(medicion) ? <Spinner size="small" color="$textoSecundario" /> : null}
          </XStack>
          <XStack gap={32} flexWrap="wrap">
            <Dato etiqueta="Casos">
              <Valor>{`${medicion.casosMedidos} de ${medicion.casos}`}</Valor>
              <Nota>{textoDelOrigen(medicion.origenDeLosCasos)}</Nota>
            </Dato>
            <Dato etiqueta="Con error">
              <Valor>{medicion.casosConError}</Valor>
            </Dato>
            <Dato etiqueta="Modelo">
              <Valor mono>{medicion.modelo ?? '—'}</Valor>
              {medicion.proveedor ? <Nota>{medicion.proveedor}</Nota> : null}
            </Dato>
            <Dato etiqueta="Costo">
              <Valor>{medicion.costo === null ? '—' : `US$ ${medicion.costo.toFixed(4)}`}</Valor>
              {medicion.tokensDeEntrada !== null ? <Nota>{`${medicion.tokensDeEntrada} tokens de entrada`}</Nota> : null}
            </Dato>
            <Dato etiqueta="Objetivos">
              <Valor>{`${porcentaje(medicion.objetivoDePrecision)} de acierto al actuar`}</Valor>
              <Nota>{`${porcentaje(medicion.objetivoDeCobertura)} de los casos ciertos sin descartar`}</Nota>
            </Dato>
          </XStack>
          {medicion.error ? (
            <Paragraph fontSize={13} lineHeight={18} color="$primarioPresionado">
              {medicion.error}
            </Paragraph>
          ) : null}
        </YStack>
      </Tarjeta>
      {(medicion.resultados ?? []).map((resultado) => (
        <ResultadoDeLaCondicion key={`${resultado.tipoDeSuceso}-${resultado.condicion}`} resultado={resultado} />
      ))}
    </YStack>
  )
}

const COLUMNAS_UMBRALES: ColumnaTabla[] = [
  { titulo: 'Umbrales', anchoMinimo: 200 },
  { titulo: 'Actúa en', ancho: 100, alinearDerecha: true },
  { titulo: 'Acierta al actuar', ancho: 150, alinearDerecha: true },
  { titulo: 'En duda', ancho: 90, alinearDerecha: true },
  { titulo: 'Descarta', ancho: 90, alinearDerecha: true },
  { titulo: 'Ciertos descartados', ancho: 160, alinearDerecha: true },
  { titulo: 'Cobertura', ancho: 110, alinearDerecha: true },
]

const COLUMNAS_CURVA: ColumnaTabla[] = [
  { titulo: 'Probabilidad que dio el modelo', anchoMinimo: 220 },
  { titulo: 'Casos', ancho: 90, alinearDerecha: true },
  { titulo: 'Probabilidad media', ancho: 160, alinearDerecha: true },
  { titulo: 'Eran ciertos', ancho: 130, alinearDerecha: true },
]

function ResultadoDeLaCondicion({ resultado }: { resultado: ResultadoDeCondicion }) {
  const { medido } = resultado
  const filas: { nombre: string; umbrales: ConUmbrales }[] = []
  if (medido.actuales) {
    filas.push({ nombre: 'Los del protocolo', umbrales: medido.actuales })
  }
  if (medido.conLosSugeridos) {
    filas.push({ nombre: 'Los sugeridos', umbrales: medido.conLosSugeridos })
  }

  return (
    <Tarjeta>
      <YStack gap={14}>
        <YStack gap={2}>
          <Text fontSize={15} fontWeight="600" color="$texto">
            {resultado.enunciado}
          </Text>
          <Text fontFamily="$mono" fontSize={12} color="$textoSecundario">
            {`${resultado.tipoDeSuceso} · ${resultado.condicion}`}
          </Text>
        </YStack>
        <XStack gap={32} flexWrap="wrap">
          <Dato etiqueta="Casos medidos">
            <Valor>{medido.casos}</Valor>
            <Nota>{`${medido.positivos} en que era cierta`}</Nota>
          </Dato>
          <Dato etiqueta="Error de Brier">
            <Valor>{numero(medido.brier, 3)}</Valor>
            <Nota>0 es perfecto; 0,25 es contestar siempre 0,5</Nota>
          </Dato>
          <Dato etiqueta="Actuar desde (sugerido)">
            <Valor>{numero(medido.actuarSugerido)}</Valor>
            {medido.actuarSugerido === null ? <Nota>Ningún umbral llega al objetivo</Nota> : null}
          </Dato>
          <Dato etiqueta="Preguntar desde (sugerido)">
            <Valor>{numero(medido.preguntarSugerido)}</Valor>
          </Dato>
        </XStack>
        {medido.advertencia ? (
          <XStack p={12} rounded={8} bg="$enAtencionTinte">
            <Text fontSize={13} lineHeight={18} color="$enAtencionTexto">
              {medido.advertencia}
            </Text>
          </XStack>
        ) : null}
        {filas.length > 0 ? (
          <Tabla columnas={COLUMNAS_UMBRALES}>
            {filas.map(({ nombre, umbrales }) => (
              <FilaTabla key={nombre} columnas={COLUMNAS_UMBRALES} alto={52}>
                <YStack flex={1} minW={0}>
                  <Valor>{nombre}</Valor>
                  <Nota>{`Actuar desde ${numero(umbrales.umbralActuar)} · preguntar desde ${numero(umbrales.umbralPreguntar)}`}</Nota>
                </YStack>
                <Valor>{umbrales.actuan}</Valor>
                <Valor>{`${umbrales.aciertosAlActuar} (${porcentaje(umbrales.precisionAlActuar)})`}</Valor>
                <Valor>{umbrales.enDuda}</Valor>
                <Valor>{umbrales.descartadas}</Valor>
                <Valor>{umbrales.positivosDescartados}</Valor>
                <Valor>{porcentaje(umbrales.cobertura)}</Valor>
              </FilaTabla>
            ))}
          </Tabla>
        ) : null}
        {medido.curva.length > 0 ? (
          <YStack gap={6}>
            <Text fontSize={13} fontWeight="500" color="$texto">
              Calibración
            </Text>
            <Tabla columnas={COLUMNAS_CURVA}>
              {medido.curva.map((tramo) => (
                <FilaTabla key={tramo.desde} columnas={COLUMNAS_CURVA} alto={40}>
                  <Valor>{`De ${numero(tramo.desde, 1)} a ${numero(tramo.hasta, 1)}`}</Valor>
                  <Valor>{tramo.casos}</Valor>
                  <Valor>{numero(tramo.probabilidadMedia)}</Valor>
                  <Valor>{porcentaje(tramo.frecuenciaReal)}</Valor>
                </FilaTabla>
              ))}
            </Tabla>
            <Nota>Bien calibrado, la probabilidad media de cada tramo se parece a la proporción que era cierta.</Nota>
          </YStack>
        ) : null}
      </YStack>
    </Tarjeta>
  )
}
