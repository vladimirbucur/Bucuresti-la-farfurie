import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  Output,
  EventEmitter,
  OnDestroy
} from "@angular/core";
import { Subscription } from "rxjs";
import { FirebaseService, IUser } from "src/app/services/firebase";
import { SuperheroFactoryService } from "src/app/services/superhero-factory";
import { MapService } from 'src/app/services/map.service'; // Import the MapService

@Component({
  selector: "app-esri-map",
  templateUrl: "./home.component.html",
  styleUrls: ["./home.component.scss"]
})
export class HomeComponent implements OnInit, OnDestroy {
  @Output() mapLoadedEvent = new EventEmitter<boolean>();

  @ViewChild("mapViewNode", { static: true }) private mapViewEl: ElementRef;

  zoom = 10;
  center: Array<number> = [26.1025, 44.4268];
  basemap = "streets-vector";
  loaded = false;

  places = [
    "Choose a place type...",
    "Parks and Outdoors",
    "Coffee shop",
    "Gas station",
    "Food",
    "Hotel"
  ];
  locatorUrl = "http://geocode-api.arcgis.com/arcgis/rest/services/World/GeocodeServer";

  // firebase sync
  isConnected: boolean = false;
  subscriptionList: Subscription;
  subscriptionObj: Subscription;

  userItems: IUser[] = [];
  view: any; // Define the 'view' property

  constructor(
    private fbs: FirebaseService,
    private sfs: SuperheroFactoryService,
    private mapService: MapService // Inject MapService here
  ) {}

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

    // Initialize map using the mapService
    this.mapService.initializeMap(this.mapViewEl.nativeElement);

    // Listen for when the map is loaded
    this.mapService.getMapLoaded().subscribe((isLoaded) => {
      if (isLoaded) {
        this.loaded = true;
        this.mapLoadedEvent.emit(true);

        // Fetch and plot restaurants after the map is ready
        this.fetchAndPlotRestaurants();
      }
    });

    document.getElementById('apply-filters')?.addEventListener('click', () => {
      this.applyFilters();
    });
  }

  applyFilters() {
    const typeFilter = (document.getElementById('type-filter') as HTMLSelectElement).value;
    const cuisineFilter = (document.getElementById('cuisine-filter') as HTMLSelectElement).value;
    const mealFilter = (document.getElementById('meal-filter') as HTMLSelectElement).value;
    const ratingFilter = (document.getElementById('rating-filter') as HTMLInputElement).value;
    const openHoursFilter = (document.getElementById('open-hours-filter') as HTMLInputElement).value;

    // Clear all existing markers
    this.mapService.clearMarkers();

    // Fetch filtered restaurants
    this.fbs.getRestaurants().subscribe((restaurants: any[]) => {
      const filteredRestaurants = restaurants.filter(restaurant => {
        const matchesType = !typeFilter || restaurant.type === typeFilter;
        const matchesCuisine = !cuisineFilter || restaurant.cuisine === cuisineFilter;
        const matchesMeal = !mealFilter || (restaurant.meals && restaurant.meals.includes(mealFilter));
        const matchesRating = !ratingFilter || restaurant.rating >= parseFloat(ratingFilter);
        const matchesOpenHours = !openHoursFilter || this.isOpenAt(restaurant.original_open_hours, openHoursFilter);
        return matchesType && matchesCuisine && matchesMeal && matchesRating && matchesOpenHours;
      });

      // Add the filtered restaurants to the map
      filteredRestaurants.forEach(restaurant => {
        if (restaurant.location?.latitude && restaurant.location?.longitude) {
          const markerColor = this.getMarkerColorBasedOnRating(restaurant.rating);
          this.mapService.addMarker(
            restaurant.location.latitude,
            restaurant.location.longitude,
            markerColor
          );
        }
      });
    });
  }

  isOpenAt(openHours: any, time: string): boolean {
    const dayOfWeek = new Date().toLocaleString("en-US", { weekday: "short" });

    if (openHours[dayOfWeek]) {
      return openHours[dayOfWeek].some((interval: string) => {
        const [start, end] = interval.split("-");
        const timeInMinutes = this.convertToMinutes(time);
        const startInMinutes = this.convertToMinutes(start);
        const endInMinutes = this.convertToMinutes(end);

        if (endInMinutes < startInMinutes) {
          return timeInMinutes >= startInMinutes || timeInMinutes <= endInMinutes;
        }

        return timeInMinutes >= startInMinutes && timeInMinutes <= endInMinutes;
      });
    }

    return false;
  }

  convertToMinutes(time: string): number {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  }

  fetchAndPlotRestaurants() {
    this.fbs.getRestaurants().subscribe((restaurants: any[]) => {
      restaurants.forEach(restaurant => {
        if (restaurant.location?.latitude && restaurant.location?.longitude && restaurant.rating != null) {
          let rating = restaurant.rating;
          let markerColor = this.getMarkerColorBasedOnRating(rating);
  
          // Add the restaurant point with the popup
          this.mapService.addMarker(
            restaurant.location.latitude,
            restaurant.location.longitude,
            markerColor
          );
        }
      });
    }, error => {
      console.error("Error fetching restaurants: ", error);
    });
  }

  getMarkerColorBasedOnRating(rating: number): number[] {
    if (rating >= 0 && rating < 3) {
      return [255, 0, 0];  // Red for ratings between 0-3
    } else if (rating >= 3 && rating < 4) {
      return [255, 255, 0];  // Yellow for ratings between 3-4
    } else if (rating >= 4 && rating <= 5) {
      return [0, 255, 0];  // Green for ratings between 4-5
    } else {
      return [226, 119, 40];  // Default (orange) for undefined or invalid ratings
    }
  }

  ngOnDestroy() {
    if (this.view) {
      this.view.container = null;
    }
  }

  clearRouter() {
    this.mapService.clearMarkers();
  }
}
