'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { planBoundary, planPlots, planRoads, statuses } from './site-plan';

type MapPlot = { id: number; status: string; marla: number; dimensions: string };
const fills: Record<string, string> = {
  Unverified: '#e9eee3', Available: '#dcecdf', Reserved: '#fbebd2',
  Booked: '#dde9f3', Sold: '#bed8c8', Blocked: '#f0deda',
};

type EstateMapProps = { plots: MapPlot[]; onSelect: (plot: MapPlot) => void };

export function EstateMap(props: EstateMapProps) {
  const [zoom, setZoom] = useState(100);
  const [fitWidth, setFitWidth] = useState<number | null>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const previousZoom = useRef(100);
  useLayoutEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const fit = () => setFitWidth(Math.min(element.clientWidth, element.clientHeight * 970 / 510));
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useLayoutEffect(() => {
    const element = viewport.current;
    if (element) {
      const ratio = zoom / previousZoom.current;
      element.scrollLeft = zoom <= 100 ? 0 : (element.scrollLeft + element.clientWidth / 2) * ratio - element.clientWidth / 2;
      element.scrollTop = zoom <= 100 ? 0 : (element.scrollTop + element.clientHeight / 2) * ratio - element.clientHeight / 2;
    }
    previousZoom.current = zoom;
  }, [zoom]);

  return <div className="digital-plan">
    <div className="map-toolbar" role="group" aria-label="Map zoom controls">
      <span className="map-zoom-hint">Scroll to explore when zoomed in</span>
      <div className="map-zoom-controls">
        <button type="button" aria-label="Zoom out" title="Zoom out" disabled={zoom <= 50} onClick={() => setZoom(value => Math.max(50, value - 25))}><ZoomOut size={16}/></button>
        <output aria-live="polite" aria-label="Map zoom level">{zoom}%</output>
        <button type="button" aria-label="Zoom in" title="Zoom in" disabled={zoom >= 250} onClick={() => setZoom(value => Math.min(250, value + 25))}><ZoomIn size={16}/></button>
        <button type="button" className="map-fit" title="Fit the whole map" onClick={() => setZoom(100)}><Maximize2 size={14}/> Fit map</button>
      </div>
    </div>
    <div className="map-viewport" ref={viewport} tabIndex={0} role="region" aria-label="Digital map. Use the zoom controls and scroll to explore.">
      <div className="map-canvas" style={{ width: fitWidth === null ? `${zoom}%` : fitWidth * zoom / 100 }}><EstatePlan {...props}/></div>
    </div>
    <div className="map-caption">Interactive schematic · Not to scale. Sizes are plan labels; refer to the original for exact boundaries.</div>
  </div>;
}

export function EstatePlan({ plots, onSelect }: EstateMapProps) {
  const byId = new Map(plots.map(plot => [plot.id, plot]));
  return <svg className="estate-plan" viewBox="0 0 970 510" aria-label="Estate site plan: all 96 plots, internal roads, Kahal and main road">
      <g className="plan-roads">
        {planRoads.map(road => <rect key={road.id} x={road.x} y={road.y} width={road.width} height={road.height}/>)}
      </g>
      <g className="plan-road-labels">
        {planRoads.map(road => <text key={road.id}
          transform={`translate(${road.x + road.width / 2} ${road.y + road.height / 2})${road.vertical ? ' rotate(90)' : ''}`}
          dominantBaseline="central" className={road.id === 'main' ? 'plan-main-label' : undefined}>{road.label}</text>)}
      </g>
      <g className="plan-kahal">
        <rect x="844" y="337.5" width="94" height="11"/>
        <text x="891" y="345.5">KAHAL 11′-0″ WIDE</text>
      </g>
      <path className="plan-boundary" d={planBoundary}/>
      <g className="plan-heading">
        <text x="35" y="86">YOUR ESTATE</text>
        <text x="35" y="109">Select a plot to view its details</text>
        <text x="35" y="129">Layout follows the supplied site photograph</text>
      </g>
      {planPlots.map(plan => {
        const plot = byId.get(plan.id);
        if (!plot) return null;
        const centerX = plan.x + plan.width / 2;
        const centerY = plan.y + plan.height / 2;
        return <g key={plan.id} className="plan-plot" role="button" tabIndex={0}
          aria-label={`Plot ${plot.id}, ${plot.marla} marla, ${plot.dimensions}, ${plot.status}`}
          onClick={() => onSelect(plot)} onKeyDown={event => {
            if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(plot); }
          }}>
          <title>{`Plot ${plot.id} · ${plot.marla} marla · ${plot.dimensions} · ${plot.status}`}</title>
          <rect x={plan.x + 0.6} y={plan.y + 0.6} width={plan.width - 1.2} height={plan.height - 1.2}
            fill={fills[plot.status] ?? fills[statuses[0]]}/>
          <text x={centerX} y={centerY - 1} className="plan-number">{plot.id}</text>
          <text x={centerX} y={centerY + 10} className="plan-size">{plot.marla} M</text>
        </g>;
      })}
    </svg>;
}
