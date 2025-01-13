import { BrowserModule } from "@angular/platform-browser";
import { NgModule } from "@angular/core";
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { AppComponent } from "./app.component";
import { AppRoutingModule } from "./app-routing.module";

import { environment } from '../environments/environment';

import { AngularFireModule } from '@angular/fire/compat';
import { AngularFirestoreModule } from '@angular/fire/compat/firestore';
import { AngularFireAuthModule } from '@angular/fire/compat/auth';

import { FirebaseService } from './services/firebase';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';

import { FlexLayoutModule } from '@angular/flex-layout';
import { HomeComponent } from "./pages/home/home.component";
import { SuperheroFactoryService } from "./services/superhero-factory";
import { LoginComponent } from './pages/login/login.component';

import { RegisterComponent } from './pages/register/register.component';
import { RegisterService } from './services/register.service';
import { ProfileComponent } from './pages/profile/profile.component';

import Config from "@arcgis/core/config";

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    LoginComponent,
    RegisterComponent,
    ProfileComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    MatTabsModule,
    MatButtonModule,
    MatDividerModule,
    MatListModule,
    FlexLayoutModule,
    AngularFireModule.initializeApp(environment.firebase, 'AngularDemoFirebase'),
    AngularFirestoreModule,
    AngularFireAuthModule,
    ReactiveFormsModule,
    HttpClientModule
  ],
  providers: [
    FirebaseService,
    SuperheroFactoryService,
    RegisterService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { 
  constructor() {
    // Set the portal URL for ArcGIS Online
    Config.portalUrl = 'https://www.arcgis.com'; 

    // Set your API key if required
    Config.apiKey = "AAPTxy8BH1VEsoebNVZXo8HurLDb7lgWhLWBVPBzBrRgly80jCtpL4qsQntGDLbirntOtHjeLPeflh1kwZKubFHjHQfrkUIHaiJn5APeSEU3iot-ZBMMU01xhbh7CxYuN1C0Qm0ZZ2s2MtuaxuoM8pWL34ooA2Pwiay4lmSbp5KxgTPAlRK9m9qE9x6gXU2jzoe_VAPPuk5WK8g8vO7U_ZUXaRJvc52ci9d1w-6faVVedS8.AT1_71qwYr13";
  }
}