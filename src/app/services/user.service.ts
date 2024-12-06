import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private loggedSubject = new BehaviorSubject<boolean>(false);
  logged$ = this.loggedSubject.asObservable();

  constructor() {}

  // Set the logged state
  setLoggedIn(loggedIn: boolean): void {
    this.loggedSubject.next(loggedIn);
  }

  // Get the logged state
  getLoggedIn(): boolean {
    return this.loggedSubject.value;
  }
}
