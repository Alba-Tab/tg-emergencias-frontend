import { createRoute } from '@tanstack/react-router'
import { ProtocoloPage } from '../../features/protocolo/ProtocoloPage'
import { rutaProtegida } from './protegida'

export const rutaProtocolo = createRoute({
  getParentRoute: () => rutaProtegida,
  path: '/protocolo',
  component: ProtocoloPage,
})
