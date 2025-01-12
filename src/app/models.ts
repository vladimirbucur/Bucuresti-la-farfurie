// User Model
export interface User {
  name: string;
  email: string;
  achievements: string[];  // Assuming achievements are strings
  favorite_restaurants: string[];  // Array of restaurant IDs
  visited_restaurants: string[];  // Array of restaurant IDs
}

// Restaurant Model
export interface Restaurant {
  address: string;
  cuisine: string | null;
  gluten_free: boolean;
  location: { latitude: number; longitude: number };  // Geolocation object
  meals: string[];  // List of meal types
  name: string;
  original_open_hours: string;  // Open hours stored as a JSON string
  price_range: string;
  rating: number;
  total_reviews: number;
  type: string;
  vegan_options: boolean;
  vegetarian_options: boolean;
}

// Review Model
export interface Review {
  comment: string;
  rating: number;
  restaurant_id: string;  // Reference to a restaurant document
  timestamp: string;  // Timestamp when the review was created
  user_id: string;  // Reference to the user who wrote the review
}
