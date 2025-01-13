import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import esri = __esri; // Esri TypeScript Types
import WebMap from "@arcgis/core/WebMap";
import MapView from "@arcgis/core/views/MapView";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import Graphic from "@arcgis/core/Graphic";
import Point from "@arcgis/core/geometry/Point";
import * as route from "@arcgis/core/rest/route";
import RouteParameters from "@arcgis/core/rest/support/RouteParameters";
import FeatureSet from "@arcgis/core/rest/support/FeatureSet";
import SimpleLineSymbol from "@arcgis/core/symbols/SimpleLineSymbol";

@Injectable({
  providedIn: "root",
})
export class MapService {
  private map: esri.Map;
  private view: esri.MapView;
  private graphicsLayer: esri.GraphicsLayer;
  private mapLoadedSubject: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  public restaurantClicked = new BehaviorSubject<any>(null); // Emits restaurant data on click

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

    this.view.on("click", (event: esri.ViewClickEvent) => {
      this.view.hitTest(event).then((response) => {
        const results = response.results;
        const graphicResult = results.find((result) => {
          // Check if the result has a `graphic` property and belongs to the graphicsLayer
          return (
            (result as any).graphic && 
            (result as any).graphic.layer === this.graphicsLayer
          );
        });
    
        if (graphicResult) {
          const graphic = (graphicResult as any).graphic; // Access the graphic safely
          const restaurantData = graphic.attributes;
          this.restaurantClicked.next(restaurantData); // Emit clicked restaurant's data
        }
      });
    });
  }

  getMapLoaded() {
    return this.mapLoadedSubject.asObservable();
  }

  addMarker(lat: number, lng: number, color: number[], data: any) {
    const point = new Point({
      latitude: lat,
      longitude: lng,
    });

    const markerSymbol = {
      type: "simple-marker",
      color: color,
      outline: {
        color: [255, 255, 255], // White outline
        width: 1,
      }
    };

    const pointGraphic = new Graphic({
      geometry: point,
      symbol: markerSymbol,
      attributes: data, // Attach restaurant data
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

  calculateRoute(
    start: { latitude: number; longitude: number },
    end: { latitude: number; longitude: number }
  ): Promise<any[]> {
    // Clear the existing route before calculating a new one
    this.clearDirections();
  
    const routeUrl = "https://route-api.arcgis.com/arcgis/rest/services/World/Route/NAServer/Route_World";
  
    const stops = [
      new Graphic({
        geometry: new Point({
          latitude: start.latitude,
          longitude: start.longitude,
        }),
      }),
      new Graphic({
        geometry: new Point({
          latitude: end.latitude,
          longitude: end.longitude,
        }),
      }),
    ];
  
    const routeParams = new RouteParameters({
      stops: new FeatureSet({ features: stops }),
      returnDirections: true,
    });
  
    return route
      .solve(routeUrl, routeParams)
      .then((result) => {
        const routeResult = result.routeResults[0];
        if (routeResult) {
          // Add the route to the map
          const routeGraphic = routeResult.route;
          routeGraphic.symbol = new SimpleLineSymbol({
            color: [0, 0, 255],
            width: 3,
          });
          this.graphicsLayer.add(routeGraphic);
  
          // Display directions in a popup
          this.showDirections(routeResult.directions.features);
  
          // Return the directions
          return routeResult.directions.features.map((feature: any) => ({
            text: feature.attributes.text,
            length: feature.attributes.length,
          }));
        }
        return [];
      })
      .catch((error) => {
        console.error("Error calculating route:", error);
        return [];
      });
  }  
  
  showDirections(features: any[]): void {
    // Create a popup container
    const directionsElement = document.createElement("div");
    directionsElement.style.position = "absolute";
    directionsElement.style.top = "10px";
    directionsElement.style.right = "10px"; // Top-right corner
    directionsElement.style.backgroundColor = "rgba(255, 255, 255, 0.9)";
    directionsElement.style.padding = "15px";
    directionsElement.style.border = "none";
    directionsElement.style.borderRadius = "25px"; // Match rounded style
    directionsElement.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)"; // Add shadow for a floating look
    directionsElement.style.zIndex = "1000";
    directionsElement.style.width = "250px"; // Compact size
    directionsElement.style.maxHeight = "300px"; // Limit height for scroll
    directionsElement.style.overflowY = "auto"; // Enable scrolling
    directionsElement.id = "directions-popup";
  
    // Create a title
    const title = document.createElement("h4");
    title.innerText = "Directions";
    title.style.marginTop = "0";
    title.style.marginBottom = "15px";
    title.style.fontSize = "18px";
    title.style.fontWeight = "bold";
    title.style.color = "#333";
    title.style.textAlign = "center"; // Center title
    directionsElement.appendChild(title);
  
    // Create a list of directions
    const directionsList = document.createElement("ol");
    directionsList.style.paddingLeft = "20px"; // Add padding for ordered list
    directionsList.style.margin = "0";
    directionsList.style.color = "#555"; // Subtle text color
    features.forEach((result: any) => {
      const direction = document.createElement("li");
      direction.innerText = `${result.attributes.text} (${result.attributes.length.toFixed(2)} miles)`;
      direction.style.marginBottom = "8px"; // Space between directions
      directionsList.appendChild(direction);
    });
    directionsElement.appendChild(directionsList);
  
    // Add a close button
    const closeButton = document.createElement("button");
    closeButton.innerText = "Close";
    closeButton.style.marginTop = "15px";
    closeButton.style.background = "linear-gradient(90deg, #4caf50, #43a047)"; // Green gradient
    closeButton.style.color = "white";
    closeButton.style.padding = "12px 20px";
    closeButton.style.border = "none";
    closeButton.style.borderRadius = "25px"; // Match rounded style
    closeButton.style.cursor = "pointer";
    closeButton.style.fontSize = "1em";
    closeButton.style.fontWeight = "bold";
    closeButton.style.textAlign = "center";
    closeButton.style.transition = "transform 0.2s ease, box-shadow 0.3s ease";
    closeButton.style.width = "100%";
    closeButton.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";
    closeButton.onmouseover = () => {
      closeButton.style.transform = "translateY(-3px)";
      closeButton.style.boxShadow = "0 6px 12px rgba(0, 0, 0, 0.15)";
    };
    closeButton.onmouseleave = () => {
      closeButton.style.transform = "translateY(0)";
      closeButton.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";
    };
    closeButton.onclick = () => {
      this.clearDirections(); // Clear the directions on the map and remove the popup
    };
    directionsElement.appendChild(closeButton);
  
    // Remove any existing popup
    const existingPopup = document.getElementById("directions-popup");
    if (existingPopup) {
      existingPopup.remove();
    }
  
    // Append the popup to the map container
    const mapContainer = document.querySelector(".esri-view-root");
    if (mapContainer) {
      mapContainer.appendChild(directionsElement);
    } else {
      console.error("Map container not found.");
    }
  }

  clearDirections() {
    // Remove all polyline graphics from the map
    this.graphicsLayer.graphics.forEach((graphic) => {
      if (graphic.geometry.type === "polyline") {
        this.graphicsLayer.remove(graphic);
      }
    });
  
    // Remove the directions popup
    const directionsPopup = document.getElementById("directions-popup");
    if (directionsPopup) {
      directionsPopup.remove();
    }
  }

}
