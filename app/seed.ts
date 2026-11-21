import { PLAN_IMPORT_NOTE, PLAN_VERSION, planPlots } from './site-plan';
import type { EstateState } from './validate';
export { statuses } from './site-plan';

export function initial(): EstateState {
  return {
    name: 'My estate',
    planVersion: PLAN_VERSION,
    plots: planPlots.map(({ id, marla, dimensions, note }) => ({
      id,
      marla,
      dimensions,
      area: 0,
      status: 'Unverified',
      verified: false,
      price: 0,
      buyer: '',
      notes: [PLAN_IMPORT_NOTE, note].filter(Boolean).join(' '),
    })),
    buyers: [],
    payments: [],
    expenses: [],
    schedule: [],
    audit: [],
  };
}
