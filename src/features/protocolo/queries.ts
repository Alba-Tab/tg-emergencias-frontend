import { mutationOptions, queryOptions, type QueryClient } from '@tanstack/react-query'
import { protocoloApi, type GuardarProtocolo } from './api'

export const protocoloKeys = {
  todo: ['protocolo'] as const,
  vigente: () => [...protocoloKeys.todo, 'vigente'] as const,
  borrador: () => [...protocoloKeys.todo, 'borrador'] as const,
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
