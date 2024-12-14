import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class FilterPopupService {
  private isPopupVisible = new BehaviorSubject<boolean>(false);
  isPopupVisible$ = this.isPopupVisible.asObservable();

  // Open popup
  openPopup() {
    this.isPopupVisible.next(true);
  }

  // Close popup
  closePopup() {
    this.isPopupVisible.next(false);
  }

  // Toggle popup
  togglePopup() {
    this.isPopupVisible.next(!this.isPopupVisible.value);
  }
}
