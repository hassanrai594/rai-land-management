// Transcribed from public/site-map.png. Measurements are plan labels, not a survey.
export const PLAN_VERSION = 1;
export const PLAN_IMAGE = '/site-map.png';
export const landAreas = { total: 227480, plots: 179900, roads: 47580 };
export const statuses = ['Unverified', 'Available', 'Reserved', 'Booked', 'Sold', 'Blocked'] as const;

export type PlanPlot = {
  id: number; marla: number; dimensions: string;
  x: number; y: number; width: number; height: number; note?: string;
};

const plots: PlanPlot[] = [];
function add(id: number, marla: number, dimensions: string, x: number, y: number, width: number, height: number, note?: string) {
  plots.push({ id, marla, dimensions, x, y, width, height, ...(note ? { note } : {}) });
}

// Right-hand strip: plot 12 at the top, plot 1 facing the main road.
for (let id = 12; id >= 4; id--) {
  add(id, 7, '31′ 6″ × 60′', 844, 12 + (12 - id) * 31.5, 60, 31.5);
}
add(3, 9.33, '42′ × 60′', 844, 295.5, 60, 42);
// The 11-foot Kahal separates plots 3 and 2.
add(2, 10, '45′ × 60′', 844, 348.5, 60, 45);
add(1, 10.55, '47′ 6″ × 60′', 844, 393.5, 60, 47.5);

// Upper block, with two horizontal 30-foot roads.
const upperRows = [[15, 14, 13], [16, 17, 18], [21, 20, 19], [22, 23, 24]];
upperRows.forEach((row, index) => {
  const y = [12, 82, 122, 192][index];
  row.forEach((id, col) => add(id, col === 2 ? 6 : 5,
    col === 2 ? '40′ 6″ × 40′' : '33′ 9″ × 40′',
    706 + col * 33.75, y, col === 2 ? 40.5 : 33.75, 40));
});

// The long row above the main internal road runs 53 → 25.
for (let id = 53; id >= 25; id--) {
  add(id, id === 25 ? 6.29 : id === 47 ? 7 : 5,
    id === 25 ? '34′ × 50′' : '27′ × 50′',
    24 + (53 - id) * 27, 232, id === 25 ? 34 : 27, 50,
    id === 47 ? 'The photograph labels plot 47 as 7 marla with 27′ × 50′ dimensions; confirm this discrepancy against original records.' : undefined);
}

// Lower rows are split by the vertical road between 71/72 and 83/82.
let x = 24;
for (let id = 54; id <= 77; id++) {
  if (id === 72) x += 30;
  const width = id === 71 ? 37.25 : id === 77 ? 45.25 : 30.75;
  add(id, id === 71 ? 8.5 : id === 77 ? 10.3 : 7,
    id === 71 ? '37′ 3″ × 61′ 6″' : id === 77 ? '45′ 3″ × 61′ 6″' : '30′ 9″ × 61′ 6″',
    x, 312, width, 61.5);
  x += width;
}
x = 24;
for (let id = 96; id >= 78; id--) {
  if (id === 82) x += 30;
  add(id, 10, '40′ × 67′ 6″', x, 373.5, 40, 67.5);
  x += 40;
}

export const planPlots = plots.sort((a, b) => a.id - b.id);
export const PLOT_COUNT = planPlots.length;
export const PLAN_IMPORT_NOTE = 'Transcribed from the updated site plan; verify dimensions and area against original records.';

// Derive road edges from the adjacent plots to keep the drawing aligned.
const byId = new Map(planPlots.map(plot => [plot.id, plot]));
const get = (id: number) => byId.get(id)!;
const right = (id: number) => get(id).x + get(id).width;
const bottom = (id: number) => get(id).y + get(id).height;
export const planRoads = [
  { id: 'under-15', x: get(15).x, y: bottom(15), width: right(13) - get(15).x, height: get(16).y - bottom(15), label: 'ROAD 30′ WIDE', vertical: false },
  { id: 'under-21', x: get(21).x, y: bottom(21), width: right(19) - get(21).x, height: get(22).y - bottom(21), label: 'ROAD 30′ WIDE', vertical: false },
  { id: 'right', x: right(13), y: get(12).y, width: get(12).x - right(13), height: bottom(1) - get(12).y, label: 'ROAD 30′-0″ WIDE', vertical: true },
  { id: 'central', x: get(53).x, y: bottom(53), width: get(4).x - get(53).x, height: get(54).y - bottom(53), label: 'ROAD 30′-0″ WIDE', vertical: false },
  { id: 'lower', x: right(71), y: get(71).y, width: get(72).x - right(71), height: bottom(83) - get(71).y, label: 'ROAD 30′-0″ WIDE', vertical: true },
  { id: 'main', x: 8, y: bottom(1), width: right(1) + 30 - 8, height: 44, label: 'MAIN ROAD', vertical: false },
];
export const planBoundary = `M${get(53).x} ${bottom(96)}V${get(53).y}H${get(15).x}V${get(15).y}H${right(12)}V${bottom(3)}M${right(2)} ${get(2).y}V${bottom(1)}`;
