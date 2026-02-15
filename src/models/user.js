
import { exists, existance, empty } from '../functions.js';
import { uuid } from '../storage/uuid.js';

const USERS_KEY = 'app:users';
const LAST_USER_KEY = 'app:last-user';

class UserManager {
    constructor() {
        this.users = this._loadUsers();
        this.currentUser = null;
    }

    _loadUsers() {
        try {
            const stored = window.localStorage.getItem(USERS_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            console.error('Failed to load users', e);
            return [];
        }
    }

    _saveUsers() {
        window.localStorage.setItem(USERS_KEY, JSON.stringify(this.users));
    }

    getUsers() {
        return this.users;
    }

    createUser(name) {
        if (empty(name)) throw new Error('User name cannot be empty');
        
        const newUser = {
            id: uuid(),
            name: name,
            created: Date.now()
        };
        
        this.users.push(newUser);
        this._saveUsers();
        return newUser;
    }

    selectUser(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) {
            throw new Error(`User not found: ${userId}`);
        }
        
        this.currentUser = user;
        window.localStorage.setItem(LAST_USER_KEY, userId);
        return user;
    }

    getLastUser() {
        const lastId = window.localStorage.getItem(LAST_USER_KEY);
        if (lastId) {
            return this.users.find(u => u.id === lastId);
        }
        return null;
    }

    // Helper to get the current storage prefix
    getStoragePrefix() {
        if (!this.currentUser) return '';
        return this.currentUser.id + ':';
    }
}

export const userManager = new UserManager();
