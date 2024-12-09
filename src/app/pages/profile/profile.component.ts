import { Component, OnInit, OnDestroy } from '@angular/core';
import { UserService } from 'src/app/services/user.service';
import { LoginService } from 'src/app/services/login.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Restaurant, User } from './../../models';

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
        console.log('User is not logged in.');
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
}
