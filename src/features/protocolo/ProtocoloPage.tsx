import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { Button, H2, Input, Label, Paragraph, Spinner, Text, XStack, YStack, useToastController } from 'tamagui'
import { mensajeDeError } from '../../shared/api/cliente'
import { fechaHoraCorta } from '../../shared/formato/fechas'
import { CODIGO_DE_PRIORIDAD, NOMBRE_DE_PRIORIDAD, type Prioridad } from '../../shared/prioridad/prioridad'
import { BotonPrimario } from '../../shared/ui/botones'
import { DialogoConfirmacion } from '../../shared/ui/DialogoConfirmacion'
import { ElegibleCompacto } from '../../shared/ui/ElegibleCompacto'
import { EncabezadoPagina } from '../../shared/ui/EncabezadoPagina'
import { Cargando, ErrorAlCargar } from '../../shared/ui/EstadosDeCarga'
import { IconoMas, IconoQuitar } from '../../shared/ui/iconos'
import { Insignia } from '../../shared/ui/Insignia'
import type { Condicion, GuardarProtocolo, Protocolo, TipoDeSuceso, TipoUnidad } from './api'
import { RevisionDelAnalista } from './RevisionDelAnalista'
import {
  abrirBorradorMutation,
  borradorDeProtocoloQuery,
  descartarBorradorMutation,
  guardarBorradorMutation,
  protocoloVigenteQuery,
  publicarBorradorMutation,
} from './queries'

const TIPOS_DE_UNIDAD: (TipoUnidad | null)[] = [null, 'IA', 'II', 'III']
const PRIORIDADES_ELEGIBLES: (Prioridad | null)[] = [null, 'VERDE', 'AMARILLA', 'ROJA']
const CODIGO = /^[A-Z][A-Z0-9_]{1,59}$/

/** Lo mismo que una condición, pero con los números como texto mientras se escriben. */
type CondicionEnEdicion = Omit<Condicion, 'umbralActuar' | 'umbralPreguntar' | 'unidadesAdicionales' | 'afectadosDesde'> & {
  umbralActuar: string
  umbralPreguntar: string
  unidadesAdicionales: string
  afectadosDesde: string
}

type TipoEnEdicion = Omit<TipoDeSuceso, 'condiciones'> & { condiciones: CondicionEnEdicion[] }

const CONDICION_NUEVA: CondicionEnEdicion = {
  codigo: '',
  enunciado: '',
  pregunta: '',
  umbralActuar: '0.8',
  umbralPreguntar: '0.4',
  unidadesAdicionales: '0',
  tipoMinimo: null,
  derivaAPersona: false,
  cita: '',
  afectadosDesde: '',
  prioridad: null,
}

function enEdicion(tipos: TipoDeSuceso[]): TipoEnEdicion[] {
  return tipos.map((tipo) => ({
    ...tipo,
    condiciones: tipo.condiciones.map((condicion) => ({
      ...condicion,
      pregunta: condicion.pregunta ?? '',
      cita: condicion.cita ?? '',
      umbralActuar: String(condicion.umbralActuar),
      umbralPreguntar: String(condicion.umbralPreguntar),
      unidadesAdicionales: String(condicion.unidadesAdicionales ?? 0),
      tipoMinimo: condicion.tipoMinimo ?? null,
      derivaAPersona: condicion.derivaAPersona ?? false,
      afectadosDesde: condicion.afectadosDesde == null ? '' : String(condicion.afectadosDesde),
      prioridad: condicion.prioridad ?? null,
    })),
  }))
}

/** Arma lo que se guarda, o dice qué hay que corregir antes. */
function paraGuardar(nota: string, tipos: TipoEnEdicion[]): { datos: GuardarProtocolo } | { error: string } {
  const resultado: TipoDeSuceso[] = []
  for (const tipo of tipos) {
    if (!CODIGO.test(tipo.codigo)) {
      return { error: `El código "${tipo.codigo}" va en mayúsculas, con letras, números y guion bajo.` }
    }
    if (!tipo.nombre.trim()) {
      return { error: `Falta el nombre del tipo de suceso ${tipo.codigo}.` }
    }
    const condiciones: Condicion[] = []
    for (const condicion of tipo.condiciones) {
      const actuar = Number(condicion.umbralActuar)
      const preguntar = Number(condicion.umbralPreguntar)
      const unidades = Number(condicion.unidadesAdicionales)
      const afectados = condicion.afectadosDesde.trim() === '' ? null : Number(condicion.afectadosDesde)
      if (!CODIGO.test(condicion.codigo)) {
        return { error: `El código "${condicion.codigo}" de ${tipo.codigo} va en mayúsculas, con letras, números y guion bajo.` }
      }
      if (!condicion.enunciado.trim()) {
        return { error: `Falta el enunciado de ${condicion.codigo}.` }
      }
      if (!(preguntar > 0 && actuar <= 1 && preguntar <= actuar)) {
        return { error: `Los umbrales de ${condicion.codigo} van entre 0 y 1, y el de preguntar no pasa al de actuar.` }
      }
      if (!Number.isInteger(unidades) || unidades < 0) {
        return { error: `Las unidades adicionales de ${condicion.codigo} son un número entero desde 0.` }
      }
      if (afectados !== null && (!Number.isInteger(afectados) || afectados < 1)) {
        return { error: `La cantidad de afectados de ${condicion.codigo} es un número entero desde 1.` }
      }
      condiciones.push({
        codigo: condicion.codigo,
        enunciado: condicion.enunciado.trim(),
        pregunta: condicion.pregunta?.trim() || null,
        umbralActuar: actuar,
        umbralPreguntar: preguntar,
        unidadesAdicionales: unidades,
        tipoMinimo: condicion.tipoMinimo,
        derivaAPersona: condicion.derivaAPersona,
        cita: condicion.cita?.trim() || null,
        afectadosDesde: afectados,
        prioridad: condicion.prioridad,
      })
    }
    resultado.push({ codigo: tipo.codigo, nombre: tipo.nombre.trim(), condiciones })
  }
  return { datos: { nota: nota.trim() || null, tipos: resultado } }
}

/**
 * PB-31: el protocolo de despacho de la central. Lo que se edita es un borrador; el protocolo vigente no cambia hasta
 * que el borrador se publica, y los incidentes que ya empezaron siguen con la versión con la que nacieron.
 */
export function ProtocoloPage() {
  const queryClient = useQueryClient()
  const toast = useToastController()
  const vigente = useQuery(protocoloVigenteQuery())
  const borrador = useQuery(borradorDeProtocoloQuery())
  const abrir = useMutation(abrirBorradorMutation(queryClient))

  return (
    <>
      <EncabezadoPagina
        titulo="Protocolo de despacho"
        descripcion="Qué puede pasar en cada tipo de suceso, cómo se le pregunta al testigo y qué se manda cuando se cumple."
        accion={
          borrador.data === null ? (
            <BotonPrimario
              size="$4"
              disabled={abrir.isPending}
              icon={abrir.isPending ? <Spinner color="$primarioTexto" /> : undefined}
              onPress={() =>
                abrir.mutate(undefined, {
                  onError: (error) => toast.show('No se pudo abrir el borrador', { message: mensajeDeError(error) }),
                })
              }
            >
              <Button.Text color="$primarioTexto">{vigente.data ? 'Editar en un borrador' : 'Crear el protocolo'}</Button.Text>
            </BotonPrimario>
          ) : undefined
        }
      />

      {borrador.isPending || vigente.isPending ? (
        <Cargando texto="Cargando el protocolo…" />
      ) : borrador.isError ? (
        <ErrorAlCargar error={borrador.error} onReintentar={() => borrador.refetch()} />
      ) : vigente.isError ? (
        <ErrorAlCargar error={vigente.error} onReintentar={() => vigente.refetch()} />
      ) : (
        <>
          {borrador.data ? <EditorDelBorrador key={borrador.data.id} borrador={borrador.data} /> : null}
          <YStack gap={12}>
            <XStack items="center" gap={10} flexWrap="wrap">
              <H2 color="$texto" fontSize={16} lineHeight={22} fontWeight="600">
                Protocolo vigente
              </H2>
              {vigente.data ? <Insignia tono="verde">{`Versión ${vigente.data.version}`}</Insignia> : null}
              {vigente.data?.publicadoEn ? (
                <Text fontSize={12} color="$textoSecundario">{`Publicado el ${fechaHoraCorta(vigente.data.publicadoEn)}`}</Text>
              ) : null}
            </XStack>
            {vigente.data ? (
              <VistaDelProtocolo protocolo={vigente.data} />
            ) : (
              <Paragraph color="$textoSecundario" fontSize={14} lineHeight={20}>
                Todavía no hay un protocolo publicado. Sin protocolo, la central despacha una unidad por incidente y no
                evalúa condiciones.
              </Paragraph>
            )}
          </YStack>
          {vigente.data ? <RevisionDelAnalista protocolo={vigente.data} /> : null}
        </>
      )}
    </>
  )
}

function VistaDelProtocolo({ protocolo }: { protocolo: Protocolo }) {
  return (
    <YStack gap={12}>
      {protocolo.nota ? (
        <Paragraph color="$textoSecundario" fontSize={14} lineHeight={20}>
          {protocolo.nota}
        </Paragraph>
      ) : null}
      {protocolo.tipos.map((tipo) => (
        <YStack key={tipo.codigo} gap={10} p={16} rounded={12} borderWidth={1} borderColor="$borde" bg="$superficie">
          <XStack items="baseline" gap={8} flexWrap="wrap">
            <Text fontSize={15} fontWeight="600" color="$texto">
              {tipo.nombre}
            </Text>
            <Text fontFamily="$mono" fontSize={12} color="$textoSecundario">
              {tipo.codigo}
            </Text>
          </XStack>
          {tipo.condiciones.length === 0 ? (
            <Text fontSize={13} color="$textoSecundario">
              Sin condiciones: siempre va una unidad.
            </Text>
          ) : (
            tipo.condiciones.map((condicion) => (
              <YStack key={condicion.codigo} gap={2} pt={8} borderTopWidth={1} borderColor="$borde">
                <Text fontSize={14} fontWeight="500" color="$texto">
                  {condicion.enunciado}
                </Text>
                <Text fontSize={13} color="$textoSecundario">
                  {respuestaDe(condicion)}
                </Text>
                <Text fontSize={12} color="$textoTenue">
                  {condicion.afectadosDesde != null
                    ? `Se resuelve por cantidad: desde ${condicion.afectadosDesde} afectados.`
                    : `Actúa desde ${condicion.umbralActuar} · pregunta desde ${condicion.umbralPreguntar}${condicion.pregunta ? ` · "${condicion.pregunta}"` : ' · sin pregunta al testigo'}`}
                </Text>
                {condicion.cita ? (
                  <Text fontSize={12} color="$textoTenue">
                    {condicion.cita}
                  </Text>
                ) : null}
              </YStack>
            ))
          )}
        </YStack>
      ))}
    </YStack>
  )
}

function respuestaDe(condicion: Condicion) {
  const partes: string[] = []
  if (condicion.unidadesAdicionales > 0) {
    partes.push(condicion.unidadesAdicionales === 1 ? 'suma 1 unidad' : `suma ${condicion.unidadesAdicionales} unidades`)
  }
  if (condicion.tipoMinimo) {
    partes.push(`pide una unidad de tipo ${condicion.tipoMinimo}`)
  }
  if (condicion.prioridad) {
    partes.push(
      `toma prioridad ${NOMBRE_DE_PRIORIDAD[condicion.prioridad].toLowerCase()} (${CODIGO_DE_PRIORIDAD[condicion.prioridad]})`,
    )
  }
  if (condicion.derivaAPersona) {
    partes.push('la ve una persona')
  }
  return partes.length > 0 ? `Si se cumple: ${partes.join(', ')}.` : 'Si se cumple, no cambia lo que se manda.'
}

function EditorDelBorrador({ borrador }: { borrador: Protocolo }) {
  const queryClient = useQueryClient()
  const toast = useToastController()
  const guardar = useMutation(guardarBorradorMutation(queryClient))
  const publicar = useMutation(publicarBorradorMutation(queryClient))
  const descartar = useMutation(descartarBorradorMutation(queryClient))
  const [nota, setNota] = useState(borrador.nota ?? '')
  const [tipos, setTipos] = useState(() => enEdicion(borrador.tipos))
  const [confirmando, setConfirmando] = useState<'publicar' | 'descartar' | null>(null)
  const ocupado = guardar.isPending || publicar.isPending || descartar.isPending
  const archivo = useRef<HTMLInputElement>(null)

  /** Pone en pantalla el protocolo de un archivo, con el mismo formato en que se guarda. No guarda nada. */
  async function cargarArchivo(elegido: File | undefined) {
    if (!elegido) {
      return
    }
    try {
      const datos = JSON.parse(await elegido.text()) as Partial<GuardarProtocolo>
      if (!Array.isArray(datos.tipos)) {
        throw new Error('sin tipos')
      }
      setNota(datos.nota ?? '')
      setTipos(enEdicion(datos.tipos.map((tipo) => ({ ...tipo, condiciones: tipo.condiciones ?? [] }))))
      toast.show('Protocolo cargado en el borrador', { message: 'Revísalo y guarda: todavía no se guardó nada.' })
    } catch {
      toast.show('No se pudo leer el archivo', { message: 'Tiene que ser un protocolo en formato JSON.' })
    }
  }

  function cambiarTipo(indice: number, cambios: Partial<TipoEnEdicion>) {
    setTipos((actuales) => actuales.map((tipo, i) => (i === indice ? { ...tipo, ...cambios } : tipo)))
  }

  function cambiarCondicion(indiceTipo: number, indice: number, cambios: Partial<CondicionEnEdicion>) {
    cambiarTipo(indiceTipo, {
      condiciones: tipos[indiceTipo].condiciones.map((condicion, i) => (i === indice ? { ...condicion, ...cambios } : condicion)),
    })
  }

  /** Guarda el borrador. Devuelve si salió bien, para poder publicar justo después. */
  async function guardarAhora(): Promise<boolean> {
    const armado = paraGuardar(nota, tipos)
    if ('error' in armado) {
      toast.show('Hay algo que corregir', { message: armado.error })
      return false
    }
    try {
      await guardar.mutateAsync(armado.datos)
      return true
    } catch (error) {
      toast.show('No se pudo guardar el borrador', { message: mensajeDeError(error) })
      return false
    }
  }

  async function confirmar() {
    const accion = confirmando
    setConfirmando(null)
    if (accion === 'descartar') {
      descartar.mutate(undefined, {
        onSuccess: () => toast.show('Borrador descartado'),
        onError: (error) => toast.show('No se pudo descartar', { message: mensajeDeError(error) }),
      })
      return
    }
    // Se publica lo que está en pantalla: primero se guarda.
    if (await guardarAhora()) {
      publicar.mutate(undefined, {
        onSuccess: (publicado) => toast.show('Protocolo publicado', { message: `Rige la versión ${publicado.version}.` }),
        onError: (error) => toast.show('No se pudo publicar', { message: mensajeDeError(error) }),
      })
    }
  }

  return (
    <YStack gap={14} p={16} rounded={12} borderWidth={1} borderColor="$primario" bg="$superficie">
      <XStack items="center" justify="space-between" gap={12} flexWrap="wrap">
        <XStack items="center" gap={10}>
          <H2 color="$texto" fontSize={16} lineHeight={22} fontWeight="600">
            Borrador
          </H2>
          <Insignia tono="ambar">{`Versión ${borrador.version}, sin publicar`}</Insignia>
        </XStack>
        <XStack gap={8} flexWrap="wrap">
          <input
            ref={archivo}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(evento) => {
              void cargarArchivo(evento.currentTarget.files?.[0])
              evento.currentTarget.value = ''
            }}
          />
          <Button size="$3" disabled={ocupado} onPress={() => archivo.current?.click()}>
            <Button.Text color="$texto">Cargar desde un archivo</Button.Text>
          </Button>
          <Button size="$3" disabled={ocupado} onPress={() => setConfirmando('descartar')}>
            <Button.Text color="$texto">Descartar</Button.Text>
          </Button>
          <Button
            size="$3"
            disabled={ocupado}
            icon={guardar.isPending ? <Spinner size="small" /> : undefined}
            onPress={() => void guardarAhora().then((bien) => bien && toast.show('Borrador guardado'))}
          >
            <Button.Text color="$texto">Guardar</Button.Text>
          </Button>
          <BotonPrimario size="$3" disabled={ocupado} onPress={() => setConfirmando('publicar')}>
            <Button.Text color="$primarioTexto">Publicar</Button.Text>
          </BotonPrimario>
        </XStack>
      </XStack>

      <Campo etiqueta="Nota de esta versión" valor={nota} onCambiar={setNota} placeholder="Ej.: basado en la Norma Nacional de Ambulancias Terrestres" />

      {tipos.map((tipo, indiceTipo) => (
        <YStack key={indiceTipo} gap={12} p={14} rounded={10} borderWidth={1} borderColor="$borde">
          <XStack gap={10} items="flex-end" flexWrap="wrap">
            <Campo etiqueta="Código del tipo" valor={tipo.codigo} ancho={240} mono onCambiar={(codigo) => cambiarTipo(indiceTipo, { codigo: codigo.toUpperCase() })} />
            <Campo etiqueta="Como lo lee el ciudadano" valor={tipo.nombre} ancho={320} onCambiar={(nombre) => cambiarTipo(indiceTipo, { nombre })} />
            <Button
              size="$3"
              icon={<IconoQuitar size={14} />}
              onPress={() => setTipos((actuales) => actuales.filter((_, i) => i !== indiceTipo))}
            >
              <Button.Text color="$texto">Quitar tipo</Button.Text>
            </Button>
          </XStack>

          {tipo.condiciones.map((condicion, indice) => (
            <YStack key={indice} gap={10} p={12} rounded={8} bg="$fondo">
              <XStack gap={10} flexWrap="wrap" items="flex-end">
                <Campo etiqueta="Código" valor={condicion.codigo} ancho={240} mono onCambiar={(codigo) => cambiarCondicion(indiceTipo, indice, { codigo: codigo.toUpperCase() })} />
                <Campo etiqueta="Afirmación que se evalúa" valor={condicion.enunciado} ancho={380} onCambiar={(enunciado) => cambiarCondicion(indiceTipo, indice, { enunciado })} />
                <Button
                  size="$3"
                  icon={<IconoQuitar size={14} />}
                  onPress={() => cambiarTipo(indiceTipo, { condiciones: tipo.condiciones.filter((_, i) => i !== indice) })}
                >
                  <Button.Text color="$texto">Quitar</Button.Text>
                </Button>
              </XStack>
              <Campo etiqueta="Pregunta al testigo (opcional)" valor={condicion.pregunta ?? ''} onCambiar={(pregunta) => cambiarCondicion(indiceTipo, indice, { pregunta })} />
              <XStack gap={10} flexWrap="wrap" items="flex-end">
                <Campo etiqueta="Actuar desde" valor={condicion.umbralActuar} ancho={110} onCambiar={(umbralActuar) => cambiarCondicion(indiceTipo, indice, { umbralActuar })} />
                <Campo etiqueta="Preguntar desde" valor={condicion.umbralPreguntar} ancho={110} onCambiar={(umbralPreguntar) => cambiarCondicion(indiceTipo, indice, { umbralPreguntar })} />
                <Campo etiqueta="Unidades de más" valor={condicion.unidadesAdicionales} ancho={110} onCambiar={(unidadesAdicionales) => cambiarCondicion(indiceTipo, indice, { unidadesAdicionales })} />
                <Campo etiqueta="Por cantidad: afectados desde" valor={condicion.afectadosDesde} ancho={200} onCambiar={(afectadosDesde) => cambiarCondicion(indiceTipo, indice, { afectadosDesde })} />
              </XStack>
              <XStack gap={16} flexWrap="wrap" items="center">
                <XStack gap={6} items="center" role="radiogroup" aria-label="Tipo mínimo de unidad">
                  <Text fontSize={13} fontWeight="500" color="$texto">
                    Tipo mínimo
                  </Text>
                  {TIPOS_DE_UNIDAD.map((opcion) => (
                    <ElegibleCompacto
                      key={opcion ?? 'cualquiera'}
                      texto={opcion ?? 'Cualquiera'}
                      elegida={condicion.tipoMinimo === opcion}
                      onElegir={() => cambiarCondicion(indiceTipo, indice, { tipoMinimo: opcion })}
                    />
                  ))}
                </XStack>
                <XStack gap={6} items="center" role="radiogroup" aria-label="Prioridad que toma el caso">
                  <Text fontSize={13} fontWeight="500" color="$texto">
                    Prioridad
                  </Text>
                  {PRIORIDADES_ELEGIBLES.map((opcion) => (
                    <ElegibleCompacto
                      key={opcion ?? 'ninguna'}
                      texto={opcion ? NOMBRE_DE_PRIORIDAD[opcion] : 'No la cambia'}
                      elegida={condicion.prioridad === opcion}
                      onElegir={() => cambiarCondicion(indiceTipo, indice, { prioridad: opcion })}
                    />
                  ))}
                </XStack>
                <ElegibleCompacto
                  texto="La ve una persona"
                  elegida={condicion.derivaAPersona}
                  onElegir={() => cambiarCondicion(indiceTipo, indice, { derivaAPersona: !condicion.derivaAPersona })}
                />
              </XStack>
              <Campo etiqueta="De qué parte de la norma sale (opcional)" valor={condicion.cita ?? ''} onCambiar={(cita) => cambiarCondicion(indiceTipo, indice, { cita })} />
            </YStack>
          ))}

          <Button
            size="$3"
            self="flex-start"
            icon={<IconoMas size={14} />}
            onPress={() => cambiarTipo(indiceTipo, { condiciones: [...tipo.condiciones, { ...CONDICION_NUEVA }] })}
          >
            <Button.Text color="$texto">Agregar condición</Button.Text>
          </Button>
        </YStack>
      ))}

      <Button
        size="$3"
        self="flex-start"
        icon={<IconoMas size={14} />}
        onPress={() => setTipos((actuales) => [...actuales, { codigo: '', nombre: '', condiciones: [] }])}
      >
        <Button.Text color="$texto">Agregar tipo de suceso</Button.Text>
      </Button>

      <DialogoConfirmacion
        abierto={confirmando !== null}
        titulo={confirmando === 'publicar' ? '¿Publicar este protocolo?' : '¿Descartar el borrador?'}
        descripcion={
          confirmando === 'publicar'
            ? 'Empieza a regir para los incidentes nuevos. Los que ya están abiertos siguen con la versión con la que nacieron.'
            : 'Se pierde todo lo que cambiaste en el borrador. El protocolo vigente no se toca.'
        }
        textoConfirmar={confirmando === 'publicar' ? 'Publicar' : 'Descartar'}
        tono={confirmando === 'publicar' ? 'aviso' : 'peligro'}
        onConfirmar={() => void confirmar()}
        onCambiarAbierto={(abierto) => {
          if (!abierto) setConfirmando(null)
        }}
      />
    </YStack>
  )
}

type PropsCampo = {
  etiqueta: string
  valor: string
  onCambiar: (valor: string) => void
  ancho?: number
  mono?: boolean
  placeholder?: string
}

/** Sin ancho va solo en su renglón y ocupa todo el ancho de la columna que lo contiene. */
function Campo({ etiqueta, valor, onCambiar, ancho, mono = false, placeholder }: PropsCampo) {
  return (
    <YStack gap={4} width={ancho}>
      <Label color="$texto" fontSize={12} fontWeight="500" lineHeight={16}>
        {etiqueta}
      </Label>
      <Input
        size="$3"
        aria-label={etiqueta}
        placeholder={placeholder}
        fontFamily={mono ? '$mono' : undefined}
        value={valor}
        onChange={(evento) => onCambiar(evento.currentTarget.value)}
        borderColor="$bordeFuerte"
      />
    </YStack>
  )
}
