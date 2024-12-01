import { Component, OnDestroy, OnInit } from "@angular/core";
import { Subscription } from "rxjs";
import { FirebaseService, IUser } from "src/app/services/firebase";
import { SuperheroFactoryService } from "src/app/services/superhero-factory";

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, OnDestroy {

    // firebase sync
    isConnected: boolean = false;
    subscriptionList: Subscription;
    subscriptionObj: Subscription;

    userItems: IUser[] = [];

    constructor(
        private fbs: FirebaseService,
        private sfs: SuperheroFactoryService
    ) {

    }

    ngOnInit() {

    }

    connectFirebase() {
        if (this.isConnected) {
            return;
        }
        this.isConnected = true;
        this.fbs.connectToDatabase();
        this.subscriptionList = this.fbs.getChangeFeedList().subscribe((items: IUser[]) => {
            console.log("users updated: ", items);
            this.userItems = items;
        });
        this.subscriptionObj = this.fbs.getChangeFeedObject().subscribe((stat: IUser) => {
            console.log("object updated: ", stat);
        });
    }

    addNewUser() {
        const newUser: IUser = {
            username: 'john_doe',
            password: 'password123',
            achievements: ['first_order', 'loyal_customer'],
            favorite_restaurants: ['restaurantId1', 'restaurantId2'],
            visited_restaurants: ['restaurantId3', 'restaurantId4']
        };

        // Call the addUser method to add this user to Firestore
        this.fbs.addUser(newUser).then(() => {
            console.log('User added successfully!');
        }).catch((error) => {
            console.error('Error adding user: ', error);
        });
    }

    disconnectFirebase() {
        if (this.subscriptionList != null) {
            this.subscriptionList.unsubscribe();
        }
        if (this.subscriptionObj != null) {
            this.subscriptionObj.unsubscribe();
        }
    }

    ngOnDestroy(): void {
        this.disconnectFirebase();
    }
}