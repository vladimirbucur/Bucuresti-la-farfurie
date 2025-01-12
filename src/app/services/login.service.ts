// src/app/services/login.service.ts
import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, BehaviorSubject  } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class LoginService {
  private currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private afAuth: AngularFireAuth, // Firebase authentication service
    private firestore: AngularFirestore // Firebase Firestore service
  ) {
      // Set persistence to SESSION and sign out on initialization
    this.afAuth.setPersistence('session').then(() => {
      console.log('Firebase persistence set to SESSION');
      // this.afAuth.signOut().then(() => {
      //   console.log('User signed out on service initialization');
      //   this.currentUserSubject.next(null);
      // });
    });
  }

  ngOnInit(): void {
    // log out the user when the app starts
    this.logoutUser().subscribe(
      () => console.log('Logged out user.'),
      error => console.error('Error logging out user:', error)
    );
  }

  // Login a user with email and password
  loginUser(email: string, password: string): Observable<any> {
  return new Observable(observer => {
    this.afAuth.signInWithEmailAndPassword(email, password)
      .then(userCredential => {
        // Fetch user details from Firestore using email
        this.firestore.collection('users').doc(email).get().subscribe(
          docSnapshot => {
            if (docSnapshot.exists) {
              this.currentUserSubject.next(docSnapshot.data());
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
          this.currentUserSubject.next(null);
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
          this.currentUserSubject.next({ uid: user.uid, email: user.email });
          return { uid: user.uid, email: user.email };
        } else {
          this.currentUserSubject.next(null);
          return null;
        }
      })
    );
  }
}
