import { createRoute } from '@tanstack/react-router'
import { MedicionesPage } from '../../features/medicion/MedicionesPage'
import { rutaProtegida } from './protegida'

export const rutaMediciones = createRoute({
  getParentRoute: () => rutaProtegida,
  path: '/mediciones',
  component: MedicionesPage,
})
