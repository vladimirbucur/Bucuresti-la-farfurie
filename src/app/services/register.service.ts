// src/app/services/register.service.ts
import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RegisterService {

  constructor(
    private afAuth: AngularFireAuth,  // Using the compat module for authentication
    private firestore: AngularFirestore  // Using the compat module for Firestore
  ) {}

  // Register user with name, email, and password
  registerUser(name: string, email: string, password: string): Observable<any> {
    return new Observable(observer => {
      // Create user with email and password
      this.afAuth.createUserWithEmailAndPassword(email, password)
        .then(userCredential => {
          const user = userCredential.user;
          if (user) {
            // Save user data to Firestore, including name
            this.firestore.collection('users').doc(email).set({
              name: name,  // Add name field
              email: email,
              achievements: [],
              favorite_restaurants: [],
              visited_restaurants: [],
            }).then(() => {
              observer.next('Registration successful');
              observer.complete();
            }).catch(error => {
              observer.error('Error saving user to Firestore: ' + error);
            });
          }
        })
        .catch(error => {
          observer.error('Registration failed: ' + error.message);
        });
    });
  }

  // addTestUser(): void {
  //   const testEmail = 'testuser3@example.com';
  //   const testPassword = 'test1234';

  //   this.afAuth.createUserWithEmailAndPassword(testEmail, testPassword)
  //     .then(userCredential => {
  //       const user = userCredential.user;
  //       if (user) {
  //         // Save test user data to Firestore
  //         this.firestore.collection('users').doc(testEmail).set({
  //           email: testEmail,
  //           achievements: [],
  //           favorite_restaurants: [],
  //           visited_restaurants: [],
  //         }).then(() => {
  //           console.log('Test user added successfully.');
  //         }).catch(error => {
  //           console.error('Error saving test user to Firestore:', error);
  //         });
  //       }
  //     })
  //     .catch(error => {
  //       console.error('Error creating test user:', error.message);
  //     });
  // }

  // use registerUser to add a user with email "test@gmail.com" and password
  // "password" to the Firestore database

}
