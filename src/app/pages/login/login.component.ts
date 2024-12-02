import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AbstractControl, ValidationErrors } from '@angular/forms';

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
    private router: Router
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
    console.log('Form submitted', formValues);

    // Redirect to home page after successful login
    this.router.navigate(['/home']);
  }
}
