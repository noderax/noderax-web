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
  TileLayer as LeafletTileLayerType,
} from "leaflet";
import {
  useMap,
  type MapContainerProps,
  type MarkerProps,
  type PopupProps,
  type TileLayerProps,
} from "react-leaflet";

type MapContainerComponentProps = MapContainerProps & React.RefAttributes<LeafletMap>;
type TileLayerComponentProps = TileLayerProps &
  React.RefAttributes<LeafletTileLayerType>;
type MarkerComponentProps = MarkerProps & React.RefAttributes<LeafletMarkerType>;
type PopupComponentProps = PopupProps & React.RefAttributes<LeafletPopupType>;

const LeafletMapContainer = lazy(() =>
  import("react-leaflet").then((mod) => ({
    default: mod.MapContainer as ComponentType<MapContainerComponentProps>,
  })),
);
const LeafletTileLayer = lazy(() =>
  import("react-leaflet").then((mod) => ({
    default: mod.TileLayer as ComponentType<TileLayerComponentProps>,
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
const LIGHT_TILE_URL = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png";
const DARK_TILE_URL = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png";
const CARTO_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attributions">CARTO</a>';

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
      zoom={zoom}
      maxZoom={maxZoom}
      attributionControl={false}
      zoomControl={false}
      className={cn("z-0 size-full min-h-96 flex-1 rounded-md", className)}
      {...props}
    />
  </ClientOnly>
);

export const MapTileLayer = ({
  url,
  lightUrl = LIGHT_TILE_URL,
  darkUrl = DARK_TILE_URL,
  attribution = CARTO_ATTRIBUTION,
  ...props
}: Omit<TileLayerProps, "url"> & {
  url?: string;
  lightUrl?: string;
  darkUrl?: string;
}) => {
  const { resolvedTheme } = useTheme();
  const tileUrl = url ?? (resolvedTheme === "dark" ? darkUrl : lightUrl);

  return (
    <ClientOnly>
      <LeafletTileLayer
        key={tileUrl}
        url={tileUrl}
        attribution={attribution}
        {...props}
      />
    </ClientOnly>
  );
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
