import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  Output,
  EventEmitter,
  OnDestroy
} from "@angular/core";

import esri = __esri; // Esri TypeScript Types

import Config from '@arcgis/core/config';
import WebMap from '@arcgis/core/WebMap';
import MapView from '@arcgis/core/views/MapView';

import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import Graphic from '@arcgis/core/Graphic';
import Point from '@arcgis/core/geometry/Point';
import Polyline from "@arcgis/core/geometry/Polyline.js";

import * as locator from "@arcgis/core/rest/locator.js";

import FeatureLayer from '@arcgis/core/layers/FeatureLayer';

import FeatureSet from '@arcgis/core/rest/support/FeatureSet';
import RouteParameters from '@arcgis/core/rest/support/RouteParameters';
import * as route from "@arcgis/core/rest/route.js";

import { Subscription } from "rxjs";
import { FirebaseService, IUser } from "src/app/services/firebase";
import { SuperheroFactoryService } from "src/app/services/superhero-factory";


@Component({
  selector: "app-esri-map",
  templateUrl: "./home.component.html",
  styleUrls: ["./home.component.scss"]
})
export class HomeComponent implements OnInit, OnDestroy {
  @Output() mapLoadedEvent = new EventEmitter<boolean>();

  @ViewChild("mapViewNode", { static: true }) private mapViewEl: ElementRef;

  map: esri.Map;
  view: esri.MapView;
  graphicsLayer: esri.GraphicsLayer;
  graphicsLayerUserPoints: esri.GraphicsLayer;
  graphicsLayerRoutes: esri.GraphicsLayer;
  trailheadsLayer: esri.FeatureLayer;

  zoom = 10;
  center: Array<number> = [26.1025, 44.4268];
  basemap = "streets-vector";
  loaded = false;
  directionsElement: any;

  places = ["Choose a place type...", "Parks and Outdoors", "Coffee shop", "Gas station", "Food", "Hotel"];
  locatorUrl = "http://geocode-api.arcgis.com/arcgis/rest/services/World/GeocodeServer";

  // firebase sync
  isConnected: boolean = false;
  subscriptionList: Subscription;
  subscriptionObj: Subscription;

  userItems: IUser[] = [];

  constructor(
      private fbs: FirebaseService,
      private sfs: SuperheroFactoryService
  ) {

  }

  ngOnInit() {
      if (this.isConnected) {
          return;
      }
      this.isConnected = true;
      this.fbs.connectToDatabase();
      this.subscriptionList = this.fbs.getChangeFeedList().subscribe((items: IUser[]) => {
          console.log("users updated: ", items);
          this.userItems = items;
      });
      this.subscriptionObj = this.fbs.getChangeFeedObject().subscribe((stat: IUser) => {
          console.log("object updated: ", stat);
      });

      this.initializeMap().then(() => {
        this.loaded = this.view.ready;
        this.mapLoadedEvent.emit(true);

        // Fetch and plot restaurants
        this.fetchAndPlotRestaurants();
    });
  }

  fetchAndPlotRestaurants() {
    this.fbs.getRestaurants().subscribe((restaurants: any[]) => {
      restaurants.forEach(restaurant => {
        if (restaurant.location?.latitude && restaurant.location?.longitude && restaurant.rating != null) {
          const latitude = restaurant.location.latitude;
          const longitude = restaurant.location.longitude;
          const rating = restaurant.rating;
          const markerColor = this.getMarkerColorBasedOnRating(rating);
          this.addRestaurantPoint(latitude, longitude, restaurant, markerColor);
        }
      });
    }, error => {
      console.error("Error fetching restaurants: ", error);
    });
  }

  getMarkerColorBasedOnRating(rating: number): number[] {
    if (rating < 3) return [255, 0, 0];  // Red
    if (rating < 4) return [255, 255, 0];  // Yellow
    return [0, 255, 0];  // Green
  }

  addRestaurantPoint(lat: number, lng: number, restaurant: any, color: number[]) {
    const point = new Point({
        longitude: lng,
        latitude: lat
    });

    const simpleMarkerSymbol = {
        type: "simple-marker",
        color: color,  // Apply the dynamic color based on rating
        outline: {
            color: [255, 255, 255], // White
            width: 1
        }
    };

    const attributes = {
        Name: restaurant.name,
        Address: restaurant.address,
        Cuisine: restaurant.cuisine,
        Rating: restaurant.rating,
        TotalReviews: restaurant.total_reviews,
        VeganOptions: restaurant.vegan_options ? "Yes" : "No",
        VegetarianOptions: restaurant.vegetarian_options ? "Yes" : "No",
        GlutenFree: restaurant.gluten_free ? "Yes" : "No",
        PriceRange: restaurant.price_range != null ? `$${restaurant.price_range}` : "N/A",
        Meals: restaurant.meals.join(", ")  // Assuming meals is an array of strings
    };

    // Popup template content
    const popupTemplate = {
        title: "{Name}",
        content: `
            <strong>Name:</strong> {Name}<br>
            <strong>Address:</strong> {Address}<br>
            <strong>Cuisine:</strong> {Cuisine}<br>
            <strong>Rating:</strong> {Rating}<br>
            <strong>Total Reviews:</strong> {TotalReviews}<br>
            <strong>Vegan Options:</strong> {VeganOptions}<br>
            <strong>Vegetarian Options:</strong> {VegetarianOptions}<br>
            <strong>Gluten Free:</strong> {GlutenFree}<br>
            <strong>Price Range:</strong> {PriceRange}<br>
            <strong>Meals:</strong> {Meals}<br>
        `
    };

    const pointGraphic = new Graphic({
        geometry: point,
        symbol: simpleMarkerSymbol,
        attributes: attributes,
        popupTemplate: popupTemplate
    });

    this.graphicsLayer.add(pointGraphic);
  }

  async initializeMap() {
    try {
      Config.apiKey = "AAPTxy8BH1VEsoebNVZXo8HurJ3UTd981HCdUBR39KDcygc1_GPNANYjv63Cm49GdloX9mZD5ni0Z49zTUyaJRkpVPxQKskQy_1qEJaBfuy63kLIYRV9vH3U5jJ_V5N2knKsI-bLp5Hl7QoCi0BPfCjRAmUMlSeA7Zj6T5JJjeHZz4I9Epc2fFmz0_tMa-26N_FpK1n735Zo5YdqzurrtTXQOngs1AHQ2yzhch_V0QAPEbg.AT1_nEFdrUZ8";

      const mapProperties: esri.WebMapProperties = { basemap: this.basemap };
      this.map = new WebMap(mapProperties);
      this.addGraphicsLayer();

      const mapViewProperties = {
        container: this.mapViewEl.nativeElement,
        center: this.center,
        zoom: this.zoom,
        map: this.map
      };
      this.view = new MapView(mapViewProperties);

      await this.view.when();
      console.log("ArcGIS map loaded");
      this.addPlaceSearch();
    } catch (error) {
      console.error("Error loading the map: ", error);
      alert("Error loading the map");
    }
  }

  addPlaceSearch() {
    const select = document.createElement("select");
    select.setAttribute("class", "esri-widget esri-select");
    select.setAttribute("style", "width: 175px; font-family: 'Avenir Next W00'; font-size: 1em");

    this.places.forEach((p) => {
      const option = document.createElement("option");
      option.value = p;
      option.innerHTML = p;
      select.appendChild(option);
    });

    this.view.ui.add(select, "top-right");

    select.addEventListener("change", (event) => {
      const target = event.target as HTMLSelectElement;
      this.findPlaces(target.value, this.view.center);
    });
  }

  findPlaces(category: string, pt: Point) {
    const simpleSymbol = {
      type: "simple-marker",
      color: "#FFC0CB",
      size: "12px",
      outline: {
        color: "#ffffff",
        width: "2px"
      }
    };

    locator
      .addressToLocations(this.locatorUrl, {
        location: pt,
        categories: [category],
        maxLocations: 25,
        outFields: ["Place_addr", "PlaceName"],
        address: undefined
      })
      .then((results) => {
        this.view.closePopup();
        this.view.graphics.removeAll();

        results.forEach((result) => {
          this.view.graphics.add(
            new Graphic({
              attributes: result.attributes, // Data attributes returned
              geometry: result.location, // Point returned
              symbol: simpleSymbol,

              popupTemplate: {
                title: "{PlaceName}", // Data attribute names
                content: "{Place_addr}"
              }
            })
          );
        });
      });

  }

  addFeatureLayers() {
    const bucharestLayer = new FeatureLayer({
      url: "https://services5.arcgis.com/Q6Owo5Oo1deIBT3v/arcgis/rest/services/restaurants_in_bucuresti2_view/FeatureServer",
      outFields: ['*']
    });
    this.map.add(bucharestLayer, 0); // Add to the map

    console.log("Feature layers added");
  }

  addGraphicsLayer() {
    this.graphicsLayer = new GraphicsLayer();
    this.map.add(this.graphicsLayer);
    this.graphicsLayerUserPoints = new GraphicsLayer();
    this.map.add(this.graphicsLayerUserPoints);
    this.graphicsLayerRoutes = new GraphicsLayer();
    this.map.add(this.graphicsLayerRoutes);
  }

  addRouting() {
    const routeUrl = "https://route-api.arcgis.com/arcgis/rest/services/World/Route/NAServer/Route_World";
    this.view.on("click", (event) => {
      this.view.hitTest(event).then((elem: esri.HitTestResult) => {
        if (elem && elem.results && elem.results.length > 0) {
          let point: esri.Point = elem.results.find(e => e.layer === this.trailheadsLayer)?.mapPoint;
          if (point) {
            console.log("get selected point: ", elem, point);
            if (this.graphicsLayerUserPoints.graphics.length === 0) {
              this.addPoint(point.latitude, point.longitude);
            } else if (this.graphicsLayerUserPoints.graphics.length === 1) {
              this.addPoint(point.latitude, point.longitude);
              this.calculateRoute(routeUrl);
            } else {
              this.removePoints();
            }
          }
        }
      });
    });
  }

  addPoint(lat: number, lng: number) {
    let point = new Point({
      longitude: lng,
      latitude: lat
    });

    const simpleMarkerSymbol = {
      type: "simple-marker",
      color: [226, 119, 40],  // Orange
      outline: {
        color: [255, 255, 255], // White
        width: 1
      }
    };

    let pointGraphic: esri.Graphic = new Graphic({
      geometry: point,
      symbol: simpleMarkerSymbol
    });

    this.graphicsLayerUserPoints.add(pointGraphic);
  }

  removePoints() {
    this.graphicsLayerUserPoints.removeAll();
  }

  removeRoutes() {
    this.graphicsLayerRoutes.removeAll();
  }

  async calculateRoute(routeUrl: string) {
    const routeParams = new RouteParameters({
      stops: new FeatureSet({
        features: this.graphicsLayerUserPoints.graphics.toArray()
      }),
      returnDirections: true
    });

    try {
      const data = await route.solve(routeUrl, routeParams);
      this.displayRoute(data);
    } catch (error) {
      console.error("Error calculating route: ", error);
      alert("Error calculating route");
    }
  }

  displayRoute(data: any) {
    for (const result of data.routeResults) {
      result.route.symbol = {
        type: "simple-line",
        color: [5, 150, 255],
        width: 3
      };
      this.graphicsLayerRoutes.graphics.add(result.route);
    }
    if (data.routeResults.length > 0) {
      this.showDirections(data.routeResults[0].directions.features);
    } else {
      alert("No directions found");
    }
  }

  clearRouter() {
    if (this.view) {
      // Remove all graphics related to routes
      this.removeRoutes();
      this.removePoints();
      console.log("Route cleared");
      this.view.ui.remove(this.directionsElement);
      this.view.ui.empty("top-right");
      console.log("Directions cleared");
    }
  }

  showDirections(features: any[]) {
    this.directionsElement = document.createElement("ol");
    this.directionsElement.classList.add("esri-widget", "esri-widget--panel", "esri-directions__scroller");
    this.directionsElement.style.marginTop = "0";
    this.directionsElement.style.padding = "15px 15px 15px 30px";

    features.forEach((result, i) => {
      const direction = document.createElement("li");
      direction.innerHTML = `${result.attributes.text} (${result.attributes.length} miles)`;
      this.directionsElement.appendChild(direction);
    });

    this.view.ui.empty("top-right");
    this.view.ui.add(this.directionsElement, "top-right");
  }

  ngOnDestroy() {
    if (this.view) {
      this.view.container = null;
    }
    this.subscriptionList.unsubscribe();
  }
}
