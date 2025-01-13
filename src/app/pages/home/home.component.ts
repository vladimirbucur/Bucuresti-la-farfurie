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
import { MapService } from 'src/app/services/map.service'; // Import the MapService
import { FilterPopupService } from 'src/app/services/filter-popup.service';
import { ActivatedRoute, Router } from '@angular/router';
import { LoginService } from 'src/app/services/login.service';
import { User } from 'src/app/models'; // Import the User model
import { UserService } from 'src/app/services/user.service'; // Import the UserService
import { AngularFirestore } from '@angular/fire/compat/firestore';
import 'firebase/compat/firestore';

@Component({
  selector: "app-home",
  templateUrl: "./home.component.html",
  styleUrls: ["./home.component.scss"]
})
export class HomeComponent implements OnInit, OnDestroy {
  selectedRestaurant: any = null; // Holds the data for the clicked restaurant
  visitedRestaurantIds: Set<string> = new Set();
  showReviewSection: boolean = false;
  favoriteRestaurantIds: Set<string> = new Set(); // Stores IDs of favorite restaurants
  directions: any[] = []; // Add this property to store the directions

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
  formattedOpeningHours: string[] = [];
  recommendedRestaurant: any = null;

  isLoggedIn = false;
  isVisited = false;
  isFavorite: boolean = false; // Default value, false when not added to favorites
  review = {
    rating: 1,
    comment: '',
    restaurant_id: '',
    user_id: ''
  };

  userItems: IUser[] = [];
  view: any; // Define the 'view' property

  constructor(
    private fbs: FirebaseService,
    private mapService: MapService,
    private route: ActivatedRoute,
    private router: Router,
    public filterPopupService: FilterPopupService,
    private loginService: LoginService,
    private firestore: AngularFirestore 
  ) {}

  ngOnInit() {
    this.loginService.getCurrentUser().subscribe(user => {
      this.isLoggedIn = !!user; // Check if the user is logged in
      this.fetchVisitedRestaurants();
      this.loadFavorites(); // Load favorite restaurants
    });

    if (this.selectedRestaurant) {
      this.isFavorite = this.favoriteRestaurantIds.has(this.selectedRestaurant.id); // Initialize isFavorite
    }
      
    if (this.isConnected) {
      return;
    }
    this.isConnected = true;
    this.fbs.connectToDatabase();

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

    // Fetch restaurant data from Firebase and add markers
    this.fbs.getRestaurants().subscribe((restaurants: any[]) => {
      restaurants.forEach((restaurant) => {
        // Add a marker for each restaurant
        this.mapService.addMarker(
          restaurant.latitude,
          restaurant.longitude,
          [255, 0, 0], // Marker color
          restaurant
        );
      });
    });

    // Subscribe to restaurant click events
    this.mapService.restaurantClicked.subscribe((restaurant) => {
      if (restaurant) {
        this.selectedRestaurant = restaurant; // Show popup with restaurant details
        this.processOpeningHours(); // Call the method here
      }
    });

        // get reccomendedRestaurant from route
        this.route.paramMap.subscribe(params => {
          const restaurantId = params.get('restaurantId');
          if (restaurantId) {
            this.fbs.getRestaurantById(restaurantId).subscribe(restaurant => {
              this.recommendedRestaurant = restaurant;
              console.log(this.recommendedRestaurant);
    
              // Open the popup for the recommended restaurant
              this.selectedRestaurant = restaurant;
              this.processOpeningHours();
    
            });
          }
        });
  }

  calculateRoute() {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
  
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
  
        if (this.selectedRestaurant?.location?.latitude && this.selectedRestaurant?.location?.longitude) {
          const restaurantLocation = {
            latitude: this.selectedRestaurant.location.latitude,
            longitude: this.selectedRestaurant.location.longitude,
          };
  
          this.mapService.calculateRoute(userLocation, restaurantLocation)
            .then((directions) => {
              this.directions = directions; // Store the directions in the component
              console.log("Route displayed on the map.");
            })
            .catch((error) => {
              console.error("Error calculating route:", error);
            });
        } else {
          alert("Restaurant location is unavailable.");
        }
      },
      (error) => {
        console.error("Error retrieving location:", error);
        alert("Unable to retrieve your location.");
      }
    );
  } 

  selectRestaurant(restaurant: any) {
    this.selectedRestaurant = restaurant;
    this.review.restaurant_id = restaurant.id; // Set the restaurant ID for the review
  }

  // Method to submit the review to Firestore
  submitReview() {
    if (this.isLoggedIn && this.selectedRestaurant) {
      const reviewData = {
        comment: this.review.comment,
        id: new Date().getTime(), // Use a simple timestamp as ID
        rating: this.review.rating,
        restaurant_id: this.selectedRestaurant.id,
        timestamp: new Date(), // Use JavaScript's Date object to get the current timestamp
        user_id: '' // Placeholder for the user ID
      };

      this.loginService.getCurrentUser().subscribe(user => {
        if (user && user.email) {
          reviewData.user_id = user.email;
          this.fbs.addReview(reviewData).then(() => {
            console.log('Review submitted successfully');
            this.review = { rating: 1, comment: '', restaurant_id: '', user_id: '' }; // Reset the review form
          }).catch(error => {
            console.error('Error submitting review:', error);
          });
        } else {
          alert('You need to be logged in to submit a review.');
        }        

      });
    }
  }

  fetchVisitedRestaurants() {
    this.loginService.getCurrentUser().subscribe(user => {
      if (user && user.email) {
        const userRef = this.firestore.collection('users').doc(user.email);
  
        userRef.get().subscribe(docSnapshot => {
          if (docSnapshot.exists) {
            const userData = docSnapshot.data() as User;
            this.visitedRestaurantIds = new Set(userData.visited_restaurants || []);
          }
        }, error => {
          console.error('Error fetching user data:', error);
        });
      }
    });
  }

  // Check if the restaurant is already in the visited list
  isRestaurantVisited(restaurant: any): boolean {
    // const user = this.getCurrentUser(); // Get the current user (you can replace this with actual logic)
    
    // if (user && Array.isArray(user.visited_restaurants)) {
    //   return user.visited_restaurants.includes(restaurant.name);
    // } else {
    //   return false; // If no valid user or visited_restaurants, return false
    // }
    return this.visitedRestaurantIds.has(restaurant.id);
  }

  // Get the current user (this is a placeholder, replace with actual logic to get the current user)
  getCurrentUser(): IUser {
    return this.userItems[0]; // Assuming the first user is the current user for now
  }

  markAsVisited(restaurant: any) {
    this.loginService.getCurrentUser().subscribe(user => {
      if (user && user.email) {
        const userRef = this.firestore.collection('users').doc(user.email);
  
        // Get the user's current visited restaurants list
        userRef.get().subscribe(docSnapshot => {
          if (docSnapshot.exists) {
            const userData = docSnapshot.data() as User;
            const visitedRestaurants = userData.visited_restaurants || [];
  
            if (!visitedRestaurants.includes(restaurant.id)) {
              // Add the restaurant to the visited list
              visitedRestaurants.push(restaurant.id);
  
              // Update the visited restaurants list in Firestore
              userRef.update({ visited_restaurants: visitedRestaurants })
                .then(() => {
                  console.log('Restaurant marked as visited');
                  // Update the local state (visitedRestaurantIds set) for UI update
                  this.visitedRestaurantIds.add(restaurant.id);
                  this.showReviewSection = true; // Force review section to appear
                })
                .catch(error => {
                  console.error('Error marking restaurant as visited:', error);
                });
            } else {
              console.log('Restaurant is already in the visited list.');
              this.showReviewSection = true; // Force review section to appear even if it's already in the visited list
            }
          } else {
            console.error('User data not found.');
          }
        }, error => {
          console.error('Error fetching user data:', error);
        });
      } else {
        console.error('User is not logged in.');
      }
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
        const matchesOpenHours = !openHoursFilter || this.isOpenAt(JSON.parse(restaurant.original_open_hours || '{}'), openHoursFilter);
        return matchesType && matchesCuisine && matchesMeal && matchesRating && matchesOpenHours;
      });

      // Add the filtered restaurants to the map
      filteredRestaurants.forEach(restaurant => {
        if (restaurant.location?.latitude && restaurant.location?.longitude) {
          const markerColor = this.getMarkerColorBasedOnRating(restaurant.rating);
          this.mapService.addMarker(
            restaurant.location.latitude,
            restaurant.location.longitude,
            markerColor,
            restaurant
          );
        }
      });
    });

    console.log('Filters applied');
    this.filterPopupService.closePopup();
  }

  isOpenAt(openHours: any, time: string): boolean {
    const dayOfWeek = new Date().toLocaleString("en-US", { weekday: "short" }); // Obține ziua curentă (e.g., Mon, Tue)

    if (openHours[dayOfWeek]) {
      return openHours[dayOfWeek].some((interval: string) => {
        const [start, end] = interval.split("-");
        const timeInMinutes = this.convertToMinutes(time);
        const startInMinutes = this.convertToMinutes(start);
        const endInMinutes = this.convertToMinutes(end);
  
        // Dacă intervalul traversează miezul nopții
        if (endInMinutes < startInMinutes) {
          return (
            timeInMinutes >= startInMinutes || // Timpul este în aceeași zi după ora de început
            timeInMinutes <= endInMinutes // Timpul este în ziua următoare înainte de ora de sfârșit
          );
        }
  
        // Cazuri normale (în aceeași zi)
        return timeInMinutes >= startInMinutes && timeInMinutes <= endInMinutes;
      });
    }
  
    return false; // Dacă nu există ore de funcționare pentru ziua curentă
  }
  

  convertToMinutes(time: string): number {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  }  

  processOpeningHours(): void {
    if (this.selectedRestaurant?.original_open_hours) {
      try {
        const openingHours = JSON.parse(this.selectedRestaurant.original_open_hours || '{}');
        if (Object.keys(openingHours).length === 0) {
          this.formattedOpeningHours = ["No opening hours provided."];
        } else {
          this.formattedOpeningHours = this.formatOpeningHours(openingHours);
        }
      } catch (error) {
        console.error('Error parsing opening hours:', error);
        this.formattedOpeningHours = ["No opening hours provided."];
      }
    } else {
      this.formattedOpeningHours = ["No opening hours provided."];
    }
  }  

  formatOpeningHours(openingHours: any): string[] {
    const daysOfWeek = [
      { short: "Mon", full: "Monday" },
      { short: "Tue", full: "Tuesday" },
      { short: "Wed", full: "Wednesday" },
      { short: "Thu", full: "Thursday" },
      { short: "Fri", full: "Friday" },
      { short: "Sat", full: "Saturday" },
      { short: "Sun", full: "Sunday" },
    ];

    return daysOfWeek.map(day => {
      const intervals = openingHours[day.short] || [];
      const hours = intervals.length > 0 ? intervals.join(", ") : "Closed";
      return `${day.full}: ${hours}`;
    });
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
            markerColor,
            restaurant
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
    this.loaded = false;
    
    if (this.view) {
      this.view.container = null;
    }
  }

  closePopup() {
    this.selectedRestaurant = null; // Close the popup
    this.recommendedRestaurant = null;
    this.router.navigate(['/home/null']);
    this.showReviewSection = false; // Hide the review section when closing the popup
  }

  loadFavorites() {
    this.loginService.getCurrentUser().subscribe(user => {
      if (user && user.email) {
        const userRef = this.firestore.collection('users').doc(user.email);
  
        userRef.get().subscribe(docSnapshot => {
          if (docSnapshot.exists) {
            const userData = docSnapshot.data() as User;
            const favoriteRestaurants = userData.favorite_restaurants || [];
            this.favoriteRestaurantIds = new Set(favoriteRestaurants); // Store favorites in local state
          }
        }, error => {
          console.error('Error fetching favorite restaurants:', error);
        });
      }
    });
  }
  
  

  toggleFavorite(restaurant: any) {
    this.loginService.getCurrentUser().subscribe(user => {
      if (user && user.email) {
        const userRef = this.firestore.collection('users').doc(user.email);
  
        userRef.get().subscribe(docSnapshot => {
          if (docSnapshot.exists) {
            const userData = docSnapshot.data() as User;
            const favoriteRestaurants = userData.favorite_restaurants || [];
  
            if (favoriteRestaurants.includes(restaurant.id)) {
              // Remove from favorites
              const updatedFavorites = favoriteRestaurants.filter(id => id !== restaurant.id);
  
              userRef.update({ favorite_restaurants: updatedFavorites })
                .then(() => {
                  console.log(`Restaurant with ID ${restaurant.id} removed from favorites.`);
                  this.favoriteRestaurantIds.delete(restaurant.id); // Update local state
                })
                .catch(error => console.error('Error removing from favorites:', error));
            } else {
              // Add to favorites
              favoriteRestaurants.push(restaurant.id);
  
              userRef.update({ favorite_restaurants: favoriteRestaurants })
                .then(() => {
                  console.log(`Restaurant with ID ${restaurant.id} added to favorites.`);
                  this.favoriteRestaurantIds.add(restaurant.id); // Update local state
                })
                .catch(error => console.error('Error adding to favorites:', error));
            }
          } else {
            console.error('User data not found.');
          }
        });
      } else {
        console.error('User is not logged in.');
      }
    });
  }
  
  isRestaurantFavorite(restaurant: any): boolean {
    return this.favoriteRestaurantIds.has(restaurant.id); // Check if ID exists in the set
  }
  
}

