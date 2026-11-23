import { createRoute } from '@tanstack/react-router'
import { CoordinacionPage } from '../../features/coordinacion/CoordinacionPage'
import { rutaProtegida } from './protegida'

export const rutaCoordinacion = createRoute({
  getParentRoute: () => rutaProtegida,
  path: '/coordinacion',
  component: CoordinacionPage,
})
