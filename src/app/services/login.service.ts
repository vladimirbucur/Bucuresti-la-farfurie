// src/app/services/login.service.ts
import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class LoginService {

  constructor(
    private afAuth: AngularFireAuth, // Firebase authentication service
    private firestore: AngularFirestore // Firebase Firestore service
  ) {}

  // Login a user with email and password
  loginUser(email: string, password: string): Observable<any> {
  return new Observable(observer => {
    this.afAuth.signInWithEmailAndPassword(email, password)
      .then(userCredential => {
        // Fetch user details from Firestore using email
        this.firestore.collection('users').doc(email).get().subscribe(
          docSnapshot => {
            if (docSnapshot.exists) {
              observer.next(docSnapshot.data());
              observer.complete();
            } else {
              observer.error('User data not found in Firestore.');
            }
          },
          error => {
            observer.error('Error fetching user data: ' + error);
          }
        );
      })
      .catch(error => {
        observer.error('Login failed: ' + error.message);
      });
  });
}


  // Logout the currently logged-in user
  logoutUser(): Observable<void> {
    return new Observable(observer => {
      this.afAuth.signOut()
        .then(() => {
          observer.next();
          observer.complete();
        })
        .catch(error => {
          observer.error('Logout failed: ' + error.message);
        });
    });
  }

  // Check if a user is currently logged in
  getCurrentUser(): Observable<any> {
    return this.afAuth.authState.pipe(
      map(user => {
        if (user) {
          return { uid: user.uid, email: user.email };
        } else {
          return null;
        }
      })
    );
  }
}
