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

    updateUser(userId: string, user: Partial<IUser>) {
        return this.fs.collection('users').doc(userId).update(user);
    }
}
