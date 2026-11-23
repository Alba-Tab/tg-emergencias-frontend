import { mutationOptions, queryOptions, type QueryClient } from '@tanstack/react-query'
import { protocoloApi, type GuardarProtocolo, type RevisionDelProtocolo } from './api'

export const protocoloKeys = {
  todo: ['protocolo'] as const,
  vigente: () => [...protocoloKeys.todo, 'vigente'] as const,
  borrador: () => [...protocoloKeys.todo, 'borrador'] as const,
  revisiones: () => [...protocoloKeys.todo, 'revisiones'] as const,
}

export const protocoloVigenteQuery = () =>
  queryOptions({
    queryKey: protocoloKeys.vigente(),
    queryFn: ({ signal }) => protocoloApi.vigente(signal),
  })

export const borradorDeProtocoloQuery = () =>
  queryOptions({
    queryKey: protocoloKeys.borrador(),
    queryFn: ({ signal }) => protocoloApi.borrador(signal),
  })

export function revisionSigueCorriendo(revision: RevisionDelProtocolo) {
  return revision.estado === 'PENDIENTE' || revision.estado === 'EN_CURSO'
}

/** Una revisión corre en segundo plano: mientras haya una sin terminar, la lista se vuelve a pedir sola. */
export const revisionesDelProtocoloQuery = () =>
  queryOptions({
    queryKey: protocoloKeys.revisiones(),
    queryFn: ({ signal }) => protocoloApi.revisiones(signal),
    refetchInterval: (consulta) => (consulta.state.data?.some(revisionSigueCorriendo) ? 3_000 : false),
  })

export const pedirRevisionMutation = (queryClient: QueryClient) =>
  mutationOptions({
    mutationFn: () => protocoloApi.pedirRevision(),
    onSettled: () => queryClient.invalidateQueries({ queryKey: protocoloKeys.revisiones() }),
  })

function refrescar(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: protocoloKeys.todo })
}

export const abrirBorradorMutation = (queryClient: QueryClient) =>
  mutationOptions({
    mutationFn: () => protocoloApi.abrirBorrador(),
    onSettled: () => refrescar(queryClient),
  })

export const guardarBorradorMutation = (queryClient: QueryClient) =>
  mutationOptions({
    mutationFn: (datos: GuardarProtocolo) => protocoloApi.guardarBorrador(datos),
    onSuccess: (borrador) => queryClient.setQueryData(protocoloKeys.borrador(), borrador),
  })

export const publicarBorradorMutation = (queryClient: QueryClient) =>
  mutationOptions({
    mutationFn: () => protocoloApi.publicarBorrador(),
    onSettled: () => refrescar(queryClient),
  })

export const descartarBorradorMutation = (queryClient: QueryClient) =>
  mutationOptions({
    mutationFn: () => protocoloApi.descartarBorrador(),
    onSettled: () => refrescar(queryClient),
  })
