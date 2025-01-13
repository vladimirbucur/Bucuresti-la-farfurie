import { Injectable } from '@angular/core';
import { AngularFirestore  } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';

export interface IDatabaseItem {
    name: string;
    val: string;
}

export interface IUser {
    username: string;
    password: string;
    achievements: string[];
    favorite_restaurants: string[];
    visited_restaurants: string[];
}

@Injectable()
export class FirebaseService {

    listFeed: Observable<any[]>;
    objFeed: Observable<any>;

    constructor(public fs: AngularFirestore) {

    }

    connectToDatabase() {
        this.listFeed = this.fs.collection('list').valueChanges();
        this.objFeed = this.fs.collection('objects').doc('obj').valueChanges();
    }

    getChangeFeedList() {
        return this.listFeed;
    }

    getChangeFeedObject() {
        return this.objFeed;
    }

    removeListItems() {
        this.fs.collection('list').get().toPromise().then(snapshot => {
            snapshot.forEach(doc => {
                doc.ref.delete();
            });
        });
    }

    addListObject(val: string) {
        let item: IDatabaseItem = {
            name: "test",
            val: val
        };
        this.fs.collection('list').add(item);
    }

    updateObject(val: string) {
        let item: IDatabaseItem = {
            name: "test",
            val: val
        };
        this.fs.collection('objects').doc('obj').set(item);
    }

    addUser(user: IUser) {
        return this.fs.collection('users').add(user);
    }

    updateUser(user: IUser) {
        const userId = user.username; // Assuming email is the unique identifier for the user
        return this.fs.collection('users').doc(userId).update({
          visited_restaurants: user.visited_restaurants,
        });
    }

    getRestaurants(): Observable<any[]> {
        return this.fs.collection('restaurants').valueChanges();
    }  

    addReview(review: { 
        comment: string; 
        id: number; 
        rating: number; 
        restaurant_id: number; 
        timestamp: Date; 
        user_id: string; 
      }) {
          return this.fs.collection('reviews').add(review);
      }

    getRestaurantById(id: string): Observable<any> {
        return this.fs.collection('restaurants').doc(id).valueChanges();
    }
}
