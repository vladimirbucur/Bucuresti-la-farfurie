import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Event, Router } from '@angular/router';
import { UserService } from './services/user.service'; // Import UserService

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

  activeTab = this.tabs[0].link;

  constructor(
    private router: Router,  // Inject Router service
    private userService: UserService // Inject UserService
  ) {
    this.router.events.subscribe((event: Event) => {
      if (event instanceof NavigationEnd) {
        this.activeTab = event.url;
        console.log(event);
      }
    });
  }

  ngOnInit(): void {
    // Subscribe to the logged status and update the tabs
    this.userService.logged$.subscribe(loggedIn => {
      if (loggedIn) {
        this.tabs.push({
          name: 'Logout',
          link: '/logout'
        });
      } else {
        this.tabs = this.tabs.filter(tab => tab.link !== '/logout'); // Remove Logout tab if logged out
        this.tabs.push({
          name: 'Login',
          link: '/login'
        });
      }
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
    this.userService.setLoggedIn(false); // Log the user out
    this.router.navigate(['/login']); // Redirect to login page after logout
  }
}
