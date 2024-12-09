import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Event, Router } from '@angular/router';
import { LoginService } from './services/login.service';

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

  constructor(
    private router: Router,  // Inject Router service
    private loginService: LoginService
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
