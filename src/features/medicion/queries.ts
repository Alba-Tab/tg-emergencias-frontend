import { mutationOptions, queryOptions, type QueryClient } from '@tanstack/react-query'
import { medicionApi, type Medicion, type PedirMedicion } from './api'

export const medicionKeys = {
  todo: ['medicion'] as const,
  banco: () => [...medicionKeys.todo, 'banco'] as const,
  mediciones: () => [...medicionKeys.todo, 'mediciones'] as const,
}

export function sigueCorriendo(medicion: Medicion) {
  return medicion.estado === 'PENDIENTE' || medicion.estado === 'EN_CURSO'
}

export const resumenDelBancoQuery = () =>
  queryOptions({
    queryKey: medicionKeys.banco(),
    queryFn: ({ signal }) => medicionApi.resumenDelBanco(signal),
  })

/** Una medición corre en segundo plano: mientras haya alguna sin terminar, la lista se vuelve a pedir sola. */
export const medicionesQuery = () =>
  queryOptions({
    queryKey: medicionKeys.mediciones(),
    queryFn: ({ signal }) => medicionApi.mediciones(signal),
    refetchInterval: (consulta) => (consulta.state.data?.some(sigueCorriendo) ? 3_000 : false),
  })

function refrescar(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: medicionKeys.todo })
}

export const generarCasosMutation = (queryClient: QueryClient) =>
  mutationOptions({
    mutationFn: (cantidad: number) => medicionApi.generarCasos(cantidad),
    onSettled: () => refrescar(queryClient),
  })

export const borrarGeneradosMutation = (queryClient: QueryClient) =>
  mutationOptions({
    mutationFn: () => medicionApi.borrarGenerados(),
    onSettled: () => refrescar(queryClient),
  })

export const medirMutation = (queryClient: QueryClient) =>
  mutationOptions({
    mutationFn: (datos: PedirMedicion) => medicionApi.medir(datos),
    onSettled: () => refrescar(queryClient),
  })
