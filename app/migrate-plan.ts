import { PLAN_IMPORT_NOTE, PLAN_VERSION, planPlots } from './site-plan';
import type { EstateState } from './validate';

// Only untouched, unverified imports are replaced. Keep reviewed measurements,
// custom notes and all customer, booking and financial data intact.
export function migratePlan(data: EstateState): EstateState {
  if ((data.planVersion ?? 0) >= PLAN_VERSION) return data;
  return {
    ...data,
    planVersion: PLAN_VERSION,
    plots: data.plots.map((plot) => {
      const plan = planPlots.find((p) => p.id === plot.id);
      if (!plan || plot.verified) return plot;
      const legacyMarla = plot.id === 47 ? 5 : plan.marla;
      const untouched = plot.marla === legacyMarla && plot.dimensions === plan.dimensions;
      if (!untouched) return plot;
      const notes =
        plot.notes === 'Imported from photographed plan; verify dimensions and area.'
          ? [PLAN_IMPORT_NOTE, plan.note].filter(Boolean).join(' ')
          : plan.note && !plot.notes.includes(plan.note)
            ? [plot.notes, plan.note].filter(Boolean).join(' ')
            : plot.notes;
      return { ...plot, marla: plan.marla, dimensions: plan.dimensions, notes };
    }),
  };
}
