// src/app/pages/register/register.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { RegisterService } from '../../services/register.service';  // Import the register service

// Custom Validator for Password Match
export function passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirmPassword = group.get('confirmPassword')?.value;
  return password === confirmPassword ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {

  registerForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private registerService: RegisterService  // Inject the register service
  ) { }

  ngOnInit(): void {
    // Initialize the form with validation
    this.registerForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],  // Name validation
      email: ['', [Validators.required, Validators.email]],  // Email validation
      password: ['', [Validators.required, Validators.minLength(6)]],  // Password validation
      confirmPassword: ['', [Validators.required]],  // Confirm password
    }, {
      validators: passwordMatchValidator // Custom validator for password matching
    });
  }

  onSubmit(): void {
      if (this.registerForm.invalid) {
        return;
      }

      const { name, email, password } = this.registerForm.value;
      console.log('Form submitted', { name, email, password });

      // Call the authentication service to register the user and save to Firestore
      this.registerService.registerUser(name, email, password).subscribe(
        response => {
          console.log('Registration successful', response);
          // Redirect to login page after successful registration
          this.router.navigate(['/home']);
        },
        error => {
          console.error('Registration failed', error);
          alert(error); // Show error message
    })
  }

  // Navigate to the login page
  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
