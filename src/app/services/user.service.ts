import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { LoginService } from './login.service';
import { Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { User, Restaurant } from './../models';
import firebase from 'firebase/compat/app';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  constructor(
    private firestore: AngularFirestore,
    private loginService: LoginService
  ) {}

  // Get the current user's profile
  getUserProfile(): Observable<User> {
    return this.loginService.getCurrentUser().pipe(
      switchMap(user => {
        if (user && user.email) {
          return this.firestore.collection('users').doc(user.email).valueChanges() as Observable<User>;
        } else {
          throw new Error('User is not logged in.');
        }
      })
    );
  }

  // Get the current user's favorite restaurants
  getFavoriteRestaurants(): Observable<Restaurant[]> {
    return this.loginService.getCurrentUser().pipe(
      switchMap(user => {
        if (user && user.email) {
          return this.firestore.collection('users').doc(user.email).get();
        } else {
          throw new Error('User is not logged in.');
        }
      }),
      switchMap(docSnapshot => {
        if (docSnapshot.exists) {
          const data = docSnapshot.data() as User;
          const favoriteRestaurants = (data.favorite_restaurants || []).map(id => id.toString()); // Ensure IDs are strings
          if (favoriteRestaurants.length === 0) {
            return []; // Return an empty array if no favorite restaurants
          }
          return this.firestore.collection('restaurants', ref =>
            ref.where(firebase.firestore.FieldPath.documentId(), 'in', favoriteRestaurants) // Query by document ID
          ).valueChanges() as Observable<Restaurant[]>;
        } else {
          throw new Error('User data not found in Firestore.');
        }
      })
    );
  }

  // Get the current user's visited restaurants
  getVisitedRestaurants(): Observable<Restaurant[]> {
    return this.loginService.getCurrentUser().pipe(
      switchMap(user => {
        if (user && user.email) {
          return this.firestore.collection('users').doc(user.email).get();
        } else {
          throw new Error('User is not logged in.');
        }
      }),
      switchMap(docSnapshot => {
        if (docSnapshot.exists) {
          const data = docSnapshot.data() as User;
          const visitedRestaurants = (data.visited_restaurants || []).map(id => id.toString()); // Ensure IDs are strings
          if (visitedRestaurants.length === 0) {
            return []; // Return an empty array if no visited restaurants
          }
          return this.firestore.collection('restaurants', ref =>
            ref.where(firebase.firestore.FieldPath.documentId(), 'in', visitedRestaurants) // Query by document ID
          ).valueChanges() as Observable<Restaurant[]>;
        } else {
          throw new Error('User data not found in Firestore.');
        }
      })
    );
  }

  updateUserAchievements(user: User, achievement: string): void {
    if (!user.achievements.includes(achievement)) {
      user.achievements.push(achievement);
      this.firestore.collection('users').doc(user.email).update({
        achievements: user.achievements
      }).then(() => {
        console.log(`Achievement '${achievement}' successfully added for user ${user.email}`);
      }).catch(error => {
        console.error('Error updating achievements:', error);
      });
    } else {
      console.log(`User ${user.email} already has the achievement '${achievement}'`);
    }
  }
}
