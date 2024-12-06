import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AbstractControl, ValidationErrors } from '@angular/forms';
import { LoginService } from '../../services/login.service';
import { UserService } from '../../services/user.service';

export function passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirmPassword = group.get('confirmPassword')?.value;

  return password === confirmPassword ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {

  loginForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private loginService: LoginService,
    private userService: UserService
  ) { }

  ngOnInit(): void {
    // Initialize the form with validation
    this.loginForm = this.fb.group({
      username: ['', [Validators.required, Validators.email]],  // Email validation
      password: ['', [Validators.required, Validators.minLength(6)]], // Password min length 6
      confirmPassword: ['', [Validators.required]], // Confirm password validator
    },{
      validators: passwordMatchValidator // Apply custom validator to the entire group
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      return;
    }

    const formValues = this.loginForm.value;
    const email = formValues.username;
    const password = formValues.password;

    this.loginService.loginUser(email, password).subscribe(
      userData => {
        console.log('Login successful', userData);
        this.userService.setLoggedIn(true); // Set the user as logged in
        // Redirect to home page after successful login
        this.router.navigate(['/home']);
      },
      error => {
        console.error('Login failed', error);
        alert(error); // Show error message
      }
    );
  }

   // Navigate to the register page
   goToRegister(): void {
    this.router.navigate(['/register']);
  }
}
