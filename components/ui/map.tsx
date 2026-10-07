"use client";

import { cn } from "@/lib/utils";
import { MapPinIcon, MinusIcon, PlusIcon } from "lucide-react";
import { useTheme } from "next-themes";
import React, {
  Suspense,
  lazy,
  useEffect,
  useState,
  useSyncExternalStore,
  type ComponentType,
  type ReactNode,
} from "react";
import { renderToString } from "react-dom/server";
import type {
  DivIconOptions,
  LatLngBoundsExpression,
  LatLngExpression,
  Map as LeafletMap,
  Marker as LeafletMarkerType,
  Popup as LeafletPopupType,
} from "leaflet";
import {
  useMap,
  type MapContainerProps,
  type MarkerProps,
  type PopupProps,
} from "react-leaflet";

type MapContainerComponentProps = MapContainerProps & React.RefAttributes<LeafletMap>;
type MarkerComponentProps = MarkerProps & React.RefAttributes<LeafletMarkerType>;
type PopupComponentProps = PopupProps & React.RefAttributes<LeafletPopupType>;

const LeafletMapContainer = lazy(() =>
  import("react-leaflet").then((mod) => ({
    default: mod.MapContainer as ComponentType<MapContainerComponentProps>,
  })),
);
const LeafletMarker = lazy(() =>
  import("react-leaflet").then((mod) => ({
    default: mod.Marker as ComponentType<MarkerComponentProps>,
  })),
);
const LeafletPopup = lazy(() =>
  import("react-leaflet").then((mod) => ({
    default: mod.Popup as ComponentType<PopupComponentProps>,
  })),
);

const subscribeToClientSnapshot = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;
const LIGHT_MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";
const DARK_MAP_STYLE = "https://tiles.openfreemap.org/styles/dark";
const MAP_ATTRIBUTION =
  '<a href="https://openfreemap.org/">OpenFreeMap</a> &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> Data from <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

const ClientOnly = ({ children }: { children: ReactNode }) => {
  const isMounted = useSyncExternalStore(
    subscribeToClientSnapshot,
    getClientSnapshot,
    getServerSnapshot,
  );

  if (!isMounted) {
    return null;
  }

  return <Suspense>{children}</Suspense>;
};

export const Map = ({
  zoom = 3,
  maxZoom = 18,
  className,
  ...props
}: Omit<MapContainerProps, "zoomControl"> & {
  center: LatLngExpression;
}) => (
  <ClientOnly>
    <LeafletMapContainer
      minZoom={1}
      zoom={zoom}
      maxZoom={maxZoom}
      attributionControl
      zoomControl={false}
      className={cn("z-0 size-full min-h-96 flex-1 rounded-md", className)}
      {...props}
    />
  </ClientOnly>
);

export const MapTileLayer = () => {
  const map = useMap();
  const { resolvedTheme } = useTheme();
  const style = resolvedTheme === "dark" ? DARK_MAP_STYLE : LIGHT_MAP_STYLE;

  useEffect(() => {
    let disposed = false;
    let layer: import("leaflet").Layer | undefined;

    void import("@maplibre/maplibre-gl-leaflet").then(({ maplibreGL }) => {
      if (disposed) return;
      layer = maplibreGL({
        style,
        attributionControl: { customAttribution: MAP_ATTRIBUTION },
      });
      layer.addTo(map);
    });

    return () => {
      disposed = true;
      if (layer) map.removeLayer(layer);
    };
  }, [map, style]);

  return null;
};

export const MapMarker = ({
  icon = <MapPinIcon className="size-6" />,
  iconAnchor = [12, 12],
  bgPos,
  popupAnchor,
  tooltipAnchor,
  ...props
}: Omit<MarkerProps, "icon"> &
  Pick<
    DivIconOptions,
    "iconAnchor" | "bgPos" | "popupAnchor" | "tooltipAnchor"
  > & {
    icon?: ReactNode;
  }) => {
  const [L, setL] = useState<typeof import("leaflet") | null>(null);

  useEffect(() => {
    void import("leaflet").then((leaflet) => setL(leaflet.default));
  }, []);

  if (!L) {
    return null;
  }

  return (
    <ClientOnly>
      <LeafletMarker
        icon={L.divIcon({
          html: renderToString(icon),
          iconAnchor,
          ...(bgPos ? { bgPos } : {}),
          ...(popupAnchor ? { popupAnchor } : {}),
          ...(tooltipAnchor ? { tooltipAnchor } : {}),
        })}
        riseOnHover
        {...props}
      />
    </ClientOnly>
  );
};

export const MapPopup = (props: PopupProps) => (
  <ClientOnly>
    <LeafletPopup {...props} />
  </ClientOnly>
);

export const MapZoomControl = () => {
  const map = useMap();

  return (
    <div className="absolute right-3 top-3 z-[1000] grid overflow-hidden rounded-lg border bg-card shadow-[var(--shadow-dashboard)]">
      <button
        type="button"
        aria-label="Zoom in"
        className="flex size-8 items-center justify-center text-foreground transition-colors hover:bg-muted"
        onClick={() => map.zoomIn()}
      >
        <PlusIcon className="size-4" />
      </button>
      <button
        type="button"
        aria-label="Zoom out"
        className="flex size-8 items-center justify-center border-t text-foreground transition-colors hover:bg-muted"
        onClick={() => map.zoomOut()}
      >
        <MinusIcon className="size-4" />
      </button>
    </div>
  );
};

export const MapFitBounds = ({
  bounds,
  maxZoom = 7,
  fitKey,
}: {
  bounds: LatLngBoundsExpression;
  maxZoom?: number;
  fitKey?: string;
}) => {
  const map = useMap();
  const previousFitKeyRef = React.useRef<string | null>(null);

  useEffect(() => {
    const nextFitKey = fitKey ?? JSON.stringify(bounds);
    if (previousFitKeyRef.current === nextFitKey) {
      return;
    }
    previousFitKeyRef.current = nextFitKey;

    map.fitBounds(bounds, {
      maxZoom,
      padding: [42, 42],
    });
  }, [bounds, fitKey, map, maxZoom]);

  return null;
};
