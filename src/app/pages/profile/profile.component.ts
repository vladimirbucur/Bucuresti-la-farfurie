import { Component, OnInit, OnDestroy } from '@angular/core';
import { UserService } from 'src/app/services/user.service';
import { LoginService } from 'src/app/services/login.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Restaurant, User } from './../../models';
import { Console } from 'console';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit, OnDestroy {
  user: User | null = null; // Holds user data
  favoriteRestaurants: Restaurant[] = []; // List of favorite restaurants
  visitedRestaurants: Restaurant[] = []; // List of visited restaurants
  isLoading = true; // Loading state
  private destroy$ = new Subject<void>(); // For unsubscribing from observables

  constructor(
    private userService: UserService,
    private loginService: LoginService
  ) {}

  ngOnInit(): void {
    // Check if user is logged in before attempting to fetch the profile data
    this.loginService.currentUser$.pipe(takeUntil(this.destroy$)).subscribe(user => {
      this.user = user; // Set user data
      if (this.user) {
        this.fetchUserProfile();
      } else {
        console.log('1 User is not logged in.');
        this.isLoading = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Fetch user profile from the service
  fetchUserProfile(): void {
    console.log('Fetching user profile...');
    this.userService.getUserProfile().pipe(takeUntil(this.destroy$)).subscribe(
      data => {
        console.log('Received profile data:', data);
        this.user = data;
        this.isLoading = false;

        // After the user profile is fetched, fetch favorite and visited restaurants
        this.fetchFavoriteRestaurants();
        this.fetchVisitedRestaurants();
        this.checkForAchievements();
      },
      error => {
        console.error('Error fetching user profile:', error);
        this.isLoading = false;
      }
    );
  }

  // Fetch favorite restaurants from the service
  fetchFavoriteRestaurants(): void {
    if (this.user && this.user.favorite_restaurants && this.user.favorite_restaurants.length > 0) {
      this.userService.getFavoriteRestaurants().subscribe(
        restaurants => {
          console.log('Received favorite restaurants:', restaurants);
          this.favoriteRestaurants = restaurants;
        },
        error => console.error('Error fetching favorite restaurants:', error)
      );
    } else {
      console.log('No favorite restaurants to fetch.');
    }
  }

  // Fetch visited restaurants from the service
  fetchVisitedRestaurants(): void {
    if (this.user && this.user.visited_restaurants && this.user.visited_restaurants.length > 0) {
      this.userService.getVisitedRestaurants().subscribe(
        restaurants => {
          console.log('Received visited restaurants:', restaurants);
          this.visitedRestaurants = restaurants;
        },
        error => console.error('Error fetching visited restaurants:', error)
      );
    } else {
      console.log('No visited restaurants to fetch.');
    }
  }

  checkForAchievements(): void {
    this.userService.getVisitedRestaurants().subscribe((restaurants: Restaurant[]) => {
      this.userService.getUserProfile().subscribe((user: User) => {
        const achievements = user.achievements || [];

        // Bar Enthusiast
        if (restaurants.filter(r => r.type === 'bar').length >= 10 && !achievements.includes('Bar Enthusiast')) {
          this.userService.updateUserAchievements(user, 'Bar Enthusiast');
        }

        // Culinary Explorer
        const uniqueTypes = new Set(restaurants.map(r => r.type));
        if (uniqueTypes.size >= 5 && !achievements.includes('Culinary Explorer')) {
          this.userService.updateUserAchievements(user, 'Culinary Explorer');
        }

        // High Roller
        if (restaurants.some(r => {
          const priceRange = r.price_range || '';
          const maxPrice = parseFloat(priceRange.split('-')[1]?.replace(/[^0-9.]/g, ''));
          return maxPrice >= 10; // Example threshold for "High Roller"
        }) && !achievements.includes('High Roller')) {
          this.userService.updateUserAchievements(user, 'High Roller');
        }

        // Around the World
        const uniqueCuisines = new Set(restaurants.map(r => r.cuisine));
        if (uniqueCuisines.size >= 5 && !achievements.includes('Around the World')) {
          this.userService.updateUserAchievements(user, 'Around the World');
        }

        // American Dreamer
        if (restaurants.filter(r => r.cuisine === 'american').length >= 3 && !achievements.includes('American Dreamer')) {
          this.userService.updateUserAchievements(user, 'American Dreamer');
        }

        // Vegan Voyager
        if (restaurants.filter(r => r.vegan_options).length >= 3 && !achievements.includes('Vegan Voyager')) {
          this.userService.updateUserAchievements(user, 'Vegan Voyager');
        }

        // Lunch Lover
        if (restaurants.filter(r => r.meals.includes('Lunch')).length >= 5 && !achievements.includes('Lunch Lover')) {
          this.userService.updateUserAchievements(user, 'Lunch Lover');
        }

        // Dinner Devotee
        if (restaurants.filter(r => r.meals.includes('Dinner')).length >= 5 && !achievements.includes('Dinner Devotee')) {
          this.userService.updateUserAchievements(user, 'Dinner Devotee');
        }

        // Night Owl
        if (restaurants.filter(r => {
          const hours = JSON.parse(r.original_open_hours || '{}');
          return Object.values(hours).some((times: string[]) => times.some(time => time.split('-')[1] > '23:00'));
        }).length >= 3 && !achievements.includes('Night Owl')) {
          this.userService.updateUserAchievements(user, 'Night Owl');
        }

        // Gluten-Free Adventurer
        if (restaurants.filter(r => r.gluten_free).length >= 3 && !achievements.includes('Gluten-Free Adventurer')) {
          this.userService.updateUserAchievements(user, 'Gluten-Free Adventurer');
        }

        // Vegetarian Advocate
        if (restaurants.filter(r => r.vegetarian_options).length >= 3 && !achievements.includes('Vegetarian Advocate')) {
          this.userService.updateUserAchievements(user, 'Vegetarian Advocate');
        }

        // Top Rated
        if (restaurants.some(r => r.rating >= 4.5) && !achievements.includes('Top Rated')) {
          this.userService.updateUserAchievements(user, 'Top Rated');
        }

        // Underdog
        if (restaurants.filter(r => r.total_reviews < 10).length >= 1 && !achievements.includes('Underdog')) {
          this.userService.updateUserAchievements(user, 'Underdog');
        }

        // City Explorer
        const uniqueSectors = new Set(restaurants.map(r => r.address.split('Sector ')[1]?.[0]));
        if (uniqueSectors.size >= 3 && !achievements.includes('City Explorer')) {
          this.userService.updateUserAchievements(user, 'City Explorer');
        }

        // Traveler
        const userLocation = { latitude: 44.4268, longitude: 26.1025 }; // Example coordinates for Bucharest
        if (restaurants.filter(r => {
          const distance = this.calculateDistance(userLocation.latitude, userLocation.longitude, r.location.latitude, r.location.longitude);
          return distance > 10;
        }).length >= 1 && !achievements.includes('Traveler')) {
          this.userService.updateUserAchievements(user, 'Traveler');
        }
      });
    });
  }

  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the Earth in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  }

  deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}