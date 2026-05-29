import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNodes } from '../api/hooks';
import { useGame } from '../store/game';

export function MapView() {
  const { t } = useTranslation();
  const { data: nodes = [] } = useNodes();
  const selectNode = useGame((s) => s.selectNode);
  const nodeEntropies = useGame((s) => s.nodeEntropies);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});

  // 1. Initialize Map once
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Center on NTU campus by default
    const map = L.map(mapContainerRef.current, {
      center: [25.0173, 121.5405],
      zoom: 16,
      zoomControl: false,
      attributionControl: false,
    });

    // Use CartoDB Dark Matter tiles for cyberpunk aesthetic
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 20,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // 2. Update markers whenever nodes or nodeEntropies change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const currentNodeIds = new Set(nodes.map((n) => n.id));

    // Clear stale markers
    Object.keys(markersRef.current).forEach((id) => {
      if (!currentNodeIds.has(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });

    // Create or update markers
    nodes.forEach((node) => {
      if (node.lat == null || node.lng == null) return;

      const ent = nodeEntropies[node.id] ?? node.entropy;
      const online = node.status === 'online';
      const warning = node.health_avg > 0 && node.health_avg < 50;

      // Color coding representing node warning level or offline status
      const colorClass = !online
        ? 'bg-neon-magenta shadow-magenta'
        : warning
          ? 'bg-amber-400 animate-pulse shadow-[0_0_8px_#fbbf24,0_0_16px_#fbbf24]'
          : 'bg-neon-green shadow-neon';

      const textColor = !online ? 'text-neon-magenta' : warning ? 'text-amber-400' : 'text-neon-green';

      const htmlContent = `
        <div class="relative -translate-x-1/2 -translate-y-1/2 text-center" style="width: 120px; outline: none !important;">
          <div class="mx-auto h-4 w-4 rounded-full ${colorClass} border-2 border-void transition-all duration-300"></div>
          <div class="mt-1 text-[10px] font-bold tracking-wider ${textColor} font-mono bg-panel/90 px-1 py-0.5 rounded inline-block border border-neon-cyan/20 select-none">${node.name}</div>
          <div class="text-[9px] text-neon-cyan/90 font-mono select-none block drop-shadow-[0_1px_1px_#000]">${node.health_avg.toFixed(0)} HP · ${ent.toFixed(1)} E</div>
        </div>
      `;

      const icon = L.divIcon({
        className: 'custom-neon-marker',
        html: htmlContent,
        iconSize: [120, 40],
        iconAnchor: [60, 20],
      });

      if (markersRef.current[node.id]) {
        // Update existing marker
        const marker = markersRef.current[node.id];
        marker.setLatLng([node.lat, node.lng]);
        marker.setIcon(icon);
      } else {
        // Create new marker
        const marker = L.marker([node.lat, node.lng], { icon })
          .addTo(map)
          .on('click', () => {
            selectNode(node.id);
          });
        markersRef.current[node.id] = marker;
      }
    });

    // Adjust view to fit all nodes if coordinates exist
    const coords = nodes
      .map((n) => [n.lat, n.lng])
      .filter(([la, ln]) => la != null && ln != null) as [number, number][];
    if (coords.length > 0) {
      map.fitBounds(L.latLngBounds(coords), { padding: [50, 50], maxZoom: 17 });
    }
  }, [nodes, nodeEntropies, selectNode]);

  return (
    <div className="panel relative h-full overflow-hidden rounded-lg">
      <div ref={mapContainerRef} className="h-full w-full bg-void z-0" />
      <div className="absolute left-3 top-2 text-[10px] uppercase tracking-[0.3em] text-neon-cyan/70 z-[1000] bg-panel/90 px-2 py-1 rounded border border-neon-cyan/30 pointer-events-none">
        {t('map.cityGrid', { count: nodes.length })}
      </div>
    </div>
  );
}
