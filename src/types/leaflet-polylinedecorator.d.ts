// Type definitions for leaflet-polylinedecorator
declare module 'leaflet' {
  namespace L {
    interface SymbolOptions {
      pixelSize?: number
      pathOptions?: PathOptions
    }

    interface Symbol {
      arrowHead(options?: SymbolOptions): any
    }

    namespace Symbol {
      function arrowHead(options?: SymbolOptions): any
    }

    interface PatternOptions {
      offset?: number | string
      repeat?: number | string
      symbol: any
    }

    interface PolylineDecoratorOptions {
      patterns: PatternOptions[]
    }

    function polylineDecorator(
      paths: LatLng[][] | LatLng[] | Polyline | Polygon,
      options?: PolylineDecoratorOptions
    ): Layer
  }
}