declare module "react-simple-maps" {
  import * as React from "react";

  export interface ProjectionConfig {
    scale?: number;
    center?: [number, number];
    parallels?: [number, number];
    rotate?: [number, number, number];
  }

  export interface ComposableMapProps {
    projection?: string;
    projectionConfig?: ProjectionConfig;
    width?: number;
    height?: number;
    style?: React.CSSProperties;
    children?: React.ReactNode;
  }
  export const ComposableMap: React.FC<ComposableMapProps>;

  export interface ZoomableGroupProps {
    zoom?: number;
    center?: [number, number];
    minZoom?: number;
    maxZoom?: number;
    translateExtent?: [[number, number], [number, number]];
    onMoveStart?: (args: { coordinates: [number, number]; zoom: number }) => void;
    onMove?: (args: { coordinates: [number, number]; zoom: number }) => void;
    onMoveEnd?: (args: { coordinates: [number, number]; zoom: number }) => void;
    children?: React.ReactNode;
  }
  export const ZoomableGroup: React.FC<ZoomableGroupProps>;

  export type FeatureLike = Record<string, unknown>;

  export interface GeographiesProps {
    geography: string | object;
    parseGeographies?: (features: Record<string, unknown>[]) => Record<string, unknown>[];
    children: (props: { geographies: FeatureLike[] }) => React.ReactNode;
  }
  export const Geographies: React.FC<GeographiesProps>;

  export interface GeographyStyle {
    default?: React.CSSProperties;
    hover?: React.CSSProperties;
    pressed?: React.CSSProperties;
  }

  export interface GeographyProps extends React.SVGProps<SVGPathElement> {
    geography: FeatureLike;
    style?: GeographyStyle;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    onMouseEnter?: (event: React.MouseEvent<SVGPathElement>) => void;
    onMouseLeave?: (event: React.MouseEvent<SVGPathElement>) => void;
    onClick?: (event: React.MouseEvent<SVGPathElement>) => void;
  }
  export const Geography: React.FC<GeographyProps>;

  export interface MarkerProps {
    coordinates: [number, number];
    children?: React.ReactNode;
    style?: GeographyStyle;
    onClick?: () => void;
  }
  export const Marker: React.FC<MarkerProps>;
}
