import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import esri = __esri; // Esri TypeScript Types
import WebMap from "@arcgis/core/WebMap";
import MapView from "@arcgis/core/views/MapView";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import Graphic from "@arcgis/core/Graphic";
import Point from "@arcgis/core/geometry/Point";

@Injectable({
  providedIn: "root",
})
export class MapService {
  private map: esri.Map;
  private view: esri.MapView;
  private graphicsLayer: esri.GraphicsLayer;
  private mapLoadedSubject: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  // Track the currently selected (black) marker
  public selectedMarker: esri.Graphic | null = null;

  constructor() {}

  initializeMap(mapContainer: HTMLElement) {
    const mapProperties: esri.WebMapProperties = {
      basemap: "streets-vector",
    };
    this.map = new WebMap(mapProperties);

    this.graphicsLayer = new GraphicsLayer();
    this.map.add(this.graphicsLayer);

    const mapViewProperties = {
      container: mapContainer as HTMLDivElement,
      map: this.map,
      zoom: 10,
      center: [26.1025, 44.4268],
    };

    this.view = new MapView(mapViewProperties);
    this.view.when().then(() => {
      this.mapLoadedSubject.next(true); // Notify that the map is loaded
    });
  }

  getMapLoaded() {
    return this.mapLoadedSubject.asObservable();
  }

  addMarker(lat: number, lng: number, color: number[]) {
    const point = new Point({
      longitude: lng,
      latitude: lat,
    });

    const simpleMarkerSymbol = {
      type: "simple-marker",
      color: color,
      outline: {
        color: [255, 255, 255], // White outline
        width: 1,
      },
    };

    const pointGraphic = new Graphic({
      geometry: point,
      symbol: simpleMarkerSymbol,
    });

    this.graphicsLayer.add(pointGraphic);

    return pointGraphic; // Return the graphic object for reference
  }

  clearMarkers() {
    this.graphicsLayer.removeAll();
  }

  // Clears only the selected (black) markers
  clearSelectedMarkers() {
    this.graphicsLayer.graphics.forEach((graphic) => {
      // Check if the marker is black by comparing its RGB values
      if (graphic.symbol.color.r === 0 && graphic.symbol.color.g === 0 && graphic.symbol.color.b === 0) {
        this.graphicsLayer.remove(graphic);
      }
  });
}
  
}
