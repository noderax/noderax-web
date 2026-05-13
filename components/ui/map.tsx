"use client";

import { cn } from "@/lib/utils";
import { MapPinIcon, MinusIcon, PlusIcon } from "lucide-react";
import React, {
  Suspense,
  lazy,
  useEffect,
  useState,
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

const ClientOnly = ({ children }: { children: ReactNode }) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
  url = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
  attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attributions">CARTO</a>',
  ...props
}: Omit<TileLayerProps, "url"> & { url?: string }) => (
  <ClientOnly>
    <LeafletTileLayer url={url} attribution={attribution} {...props} />
  </ClientOnly>
);

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
}: {
  bounds: LatLngBoundsExpression;
  maxZoom?: number;
}) => {
  const map = useMap();

  useEffect(() => {
    map.fitBounds(bounds, {
      maxZoom,
      padding: [42, 42],
    });
  }, [bounds, map, maxZoom]);

  return null;
};
