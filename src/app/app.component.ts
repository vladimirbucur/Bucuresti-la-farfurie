import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { NavigationEnd, Event, Router } from '@angular/router';
import { LoginService } from './services/login.service';
import { FirebaseService, IUser } from "src/app/services/firebase";
import { FormControl } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { MapService } from './services/map.service'; // Import MapService
import { FilterPopupService } from './services/filter-popup.service';

interface ITab {
  name: string;
  link: string;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  tabs: ITab[] = [{
    name: 'Home',
    link: '/home'
  }];

  isLoggedIn = false; // Track login state
  activeTab = this.tabs[0].link;
  searchControl = new FormControl(''); // Form control for the search input
  restaurants: any[] = []; // Array to hold restaurant data
  filteredRestaurants: any[] = []; // Array to hold search results
  selectedRestaurant: any; // To hold the selected restaurant
  isPopupVisible: boolean;

  @ViewChild('mapViewNode', { static: true }) private mapViewEl: ElementRef;

  constructor(
    private router: Router,  // Inject Router service
    private loginService: LoginService,
    private fbs: FirebaseService, // Inject Firestore service
    private mapService: MapService, // Inject MapService
    public filterPopupService: FilterPopupService
  ) {
    this.router.events.subscribe((event: Event) => {
      if (event instanceof NavigationEnd) {
        this.activeTab = event.url;
        console.log(event);
      }
    });
  }

  ngOnInit(): void {
    // Subscribe to the logged status from AuthService to determine UI changes
    this.loginService.getCurrentUser().subscribe(user => {
      this.isLoggedIn = !!user;  // Set loggedIn based on whether a user is present
    });

    this.fbs.connectToDatabase(); // Connect to Firestore
    // Fetch restaurant data from Firestore
    this.fbs.getRestaurants().subscribe((restaurants: any[]) => {
      this.restaurants = restaurants;
      this.filteredRestaurants = restaurants; // Initially display all restaurants
    });

    // Listen to search input changes and filter restaurants
    this.searchControl.valueChanges
      .pipe(
        debounceTime(300), // Wait for 300ms after the user stops typing
        distinctUntilChanged() // Ignore if the value hasn’t changed
      )
      .subscribe(searchTerm => {
        this.updateFilteredRestaurants(searchTerm);
      });

    if (this.mapViewEl) {
      this.mapService.initializeMap(this.mapViewEl.nativeElement);
    }

    this.filterPopupService.isPopupVisible$.subscribe((visible) => {
      this.isPopupVisible = visible;
    });
  }

  toggleFilterPopup() {
    this.filterPopupService.togglePopup();
  }

  // Method to update filtered restaurants based on the search term
  updateFilteredRestaurants(searchTerm: string): void {
    this.filteredRestaurants = this.restaurants.filter(restaurant => {
      return restaurant.name.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }

  // Method to handle restaurant selection
  selectRestaurant(restaurant: any): void {
    this.selectedRestaurant = restaurant; // Save the selected restaurant
    
    // Clear all existing restaurant markers from the map
    this.mapService.clearSelectedMarkers();

    // Add a marker for the selected restaurant
    if (restaurant.location?.latitude && restaurant.location?.longitude) {
      const markerColor = [0, 0, 0];
      this.mapService.addMarker(
        restaurant.location.latitude,
        restaurant.location.longitude,
        markerColor,
        restaurant
      );
    }
  }

  // Method to handle navigation logic
  navigate(link: string): void {
    this.router.navigate([link]);
  }

  mapLoadedEvent(status: boolean) {
    console.log('The map loaded: ' + status);
  }

  goToHome(): void {
    this.router.navigate(['/home']);
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  goToLogout(): void {
    // Log the user out using AuthService
    this.loginService.logoutUser().subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
      error: (err) => {
        console.error('Error during logout:', err);
      }
    });
  }

  goToProfile(): void {
    this.router.navigate(['/profile']);
  }
}
