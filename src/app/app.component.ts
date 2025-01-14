import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { NavigationEnd, Event, Router } from '@angular/router';
import { LoginService } from './services/login.service';
import { UserService } from './services/user.service';
import { FirebaseService } from "src/app/services/firebase";
import { FormControl } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { MapService } from './services/map.service'; // Import MapService
import { FilterPopupService } from './services/filter-popup.service';
import { Restaurant} from './models';

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
  isLoading = false; // Track loading state
  activeTab = this.tabs[0].link;
  searchControl = new FormControl(''); // Form control for the search input
  restaurants: any[] = []; // Array to hold restaurant data
  filteredRestaurants: any[] = []; // Array to hold search results
  selectedRestaurant: any; // To hold the selected restaurant
  isPopupVisible: boolean;
  recommendedRestaurant: any = null;   // Holds the recommended restaurant
  isRecommendationPopupVisible = false; // Flag to show/hide the recommendation popup

  @ViewChild('mapViewNode', { static: true }) private mapViewEl: ElementRef;

  constructor(
    private router: Router,  // Inject Router service
    private loginService: LoginService,
    private userService: UserService,
    private fbs: FirebaseService, // Inject Firestore service
    private mapService: MapService, // Inject MapService
    public filterPopupService: FilterPopupService
  ) {
    this.router.events.subscribe((event: Event) => {
      if (event instanceof NavigationEnd) {
        this.activeTab = event.url;
        console.log(event);
        this.checkIfPopupShouldBeVisible();
      }
    });
  }

  ngOnInit(): void {
    // Subscribe to the logged status from AuthService to determine UI changes
    this.isLoading = true;
    this.loginService.getCurrentUser().subscribe(user => {
      this.isLoggedIn = !!user;
      this.isLoading = false;
      if (user) {
        console.log('user:', user.email);
      }
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
        if(this.searchControl.value !== this.selectedRestaurant?.name) {
          this.updateFilteredRestaurants(searchTerm);
          this.mapService.clearSelectedMarkers();
      }});
      

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

    this.searchControl.setValue(restaurant.name); // Set the selected restaurant name
    this.filteredRestaurants = []; // Hide the dropdown
  }

  // Method to handle navigation logic
  navigate(link: string): void {
    this.router.navigate([link]);
  }

  mapLoadedEvent(status: boolean) {
    console.log('The map loaded: ' + status);
    this.recommendedRestaurant = null;
  }

  goToHome(): void {
    if (this.recommendedRestaurant) {
      this.router.navigate(['/home', this.recommendedRestaurant.id]);
    } else {
      this.router.navigate(['/home/null']);
    }
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
    this.recommendedRestaurant = null;
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

    this.recommendedRestaurant = null;
  }

  goToProfile(): void {
    this.router.navigate(['/profile']);
    this.recommendedRestaurant = null;
  }

  clearSearch(): void {
    this.searchControl.setValue('');
    this.mapService.clearSelectedMarkers();
  }

  checkIfPopupShouldBeVisible(): void {
    const isHomePage = this.activeTab.includes('/home');

    if (isHomePage && this.isLoggedIn) {
      setTimeout(() => {
        this.isRecommendationPopupVisible = true;
      }, 3000);
    } else {
      this.isRecommendationPopupVisible = false;
    }
  }

  // Method to handle recommendation click
  getRecommendation(): void {
    // Fetch the user's visited restaurants
    this.userService.getVisitedRestaurants().subscribe((visitedRestaurants: Restaurant[]) => {
      if (visitedRestaurants.length === 0) {
        console.log('No visited restaurants found for this user. Returning a random recommendation.');
        this.recommendedRestaurant = this.restaurants[Math.floor(Math.random() * this.restaurants.length)];
        return;
      }
  
      // Analyze the user's preferences based on visited restaurants
      const cuisineCount = new Map<string, number>();
      const typeCount = new Map<string, number>();
      const priceRangeCount = new Map<string, number>();
      const veganPreference = { yes: 0, no: 0 };
      const vegetarianPreference = { yes: 0, no: 0 };
      const glutenFreePreference = { yes: 0, no: 0 };
  
      visitedRestaurants.forEach((restaurant: Restaurant) => {
        // Count cuisines
        if (restaurant.cuisine) {
          cuisineCount.set(restaurant.cuisine, (cuisineCount.get(restaurant.cuisine) || 0) + 1);
        }
        // Count types
        if (restaurant.type) {
          typeCount.set(restaurant.type, (typeCount.get(restaurant.type) || 0) + 1);
        }
        // Count price ranges
        if (restaurant.price_range) {
          priceRangeCount.set(restaurant.price_range, (priceRangeCount.get(restaurant.price_range) || 0) + 1);
        }
        // Count dietary preferences
        veganPreference[restaurant.vegan_options ? 'yes' : 'no']++;
        vegetarianPreference[restaurant.vegetarian_options ? 'yes' : 'no']++;
        glutenFreePreference[restaurant.gluten_free ? 'yes' : 'no']++;
      });
  
      // Identify the most frequent preferences
      const favoriteCuisine = Array.from(cuisineCount.entries()).reduce((a, b) => (a[1] > b[1] ? a : b), [null, 0])[0];
      const favoriteType = Array.from(typeCount.entries()).reduce((a, b) => (a[1] > b[1] ? a : b), [null, 0])[0];
      const favoritePriceRange = Array.from(priceRangeCount.entries()).reduce((a, b) => (a[1] > b[1] ? a : b), [null, 0])[0];
      const prefersVegan = veganPreference.yes > veganPreference.no;
      const prefersVegetarian = vegetarianPreference.yes > vegetarianPreference.no;
      const prefersGlutenFree = glutenFreePreference.yes > glutenFreePreference.no;
  
      console.log(`Favorite cuisine: ${favoriteCuisine}, type: ${favoriteType}, price range: ${favoritePriceRange}`);
      console.log(`Dietary preferences: Vegan=${prefersVegan}, Vegetarian=${prefersVegetarian}, Gluten-Free=${prefersGlutenFree}`);
  
      // Calculate match scores for each restaurant
      const scoredRestaurants = this.restaurants
        .filter((restaurant: Restaurant) => {
          return !visitedRestaurants.some((visited: Restaurant) => visited.name === restaurant.name);
        })
        .map((restaurant: Restaurant) => {
          let score = 0;
  
          if (favoriteCuisine && restaurant.cuisine === favoriteCuisine) score += 3;
          if (favoriteType && restaurant.type === favoriteType) score += 2;
          if (favoritePriceRange && restaurant.price_range === favoritePriceRange) score += 1;
          if (prefersVegan && restaurant.vegan_options) score += 2;
          if (prefersVegetarian && restaurant.vegetarian_options) score += 2;
          if (prefersGlutenFree && restaurant.gluten_free) score += 2;
  
          return { restaurant, score };
        })
        .sort((a, b) => b.score - a.score); // Sort by score, descending
  
      // Get the top match
      const topMatch = scoredRestaurants.length > 0 ? scoredRestaurants[0].restaurant : null;
  
      if (topMatch) {
        console.log('Recommended Restaurant:', topMatch);
        this.recommendedRestaurant = topMatch;
      } else {
        console.log('No matching recommendation found. Returning a random restaurant.');
        this.recommendedRestaurant = this.restaurants[Math.floor(Math.random() * this.restaurants.length)];
      }
    });

    this.goToHome();
  }

  closeRecommendationPopup(): void {
    this.isRecommendationPopupVisible = false;
  }
}