import firebase_admin
from firebase_admin import credentials, firestore
import pandas as pd

# Inițializare Firebase Admin SDK
cred = credentials.Certificate("bucuresti-la-farfurie-firebase-adminsdk-4pagv-d08eb6f765.json")
firebase_admin.initialize_app(cred)

# Creează clientul Firestore
db = firestore.client()

# Citeste datele din CSV
file_path = "restaurants_in_bucuresti.csv"  # Înlocuiește cu calea fișierului dacă e diferită
data = pd.read_csv(file_path)

# Valorile posibile pentru 'type'
type_keywords = {
    "cafe": ["cafe", "cheap eats"],
    "pizza": ["pizza"],
    "bar": ["bar", "wine bar", "dining bars"],
    "dessert/bakery": ["dessert", "sweets", "patisserie", "bakeries"],
    "pub": ["pub", "brew pub"],
    "fast-food": ["fast food", "burger", "kebab", "street food"]
}

# Liste cu tipuri de bucătărie specifice pentru validare
countries = [
    "romanian", "italian", "french", "greek", "mexican", "american", "turkish", 
    "chinese", "spanish", "indian", "lebanese", "portuguese", "belgian", "german", 
    "argentinian", "brazilian", "british", "peruvian", "swedish", "irish", "ukrainian", 
    "afghani", "israeli", "thai", "vietnamese", "moroccan", "pakistani", "colombian", 
    "russian", "south american", "middle eastern", "african", "scandinavian", 
    "cajun & creole"
]

# Funcție pentru validarea tipului de bucătărie
def validate_cuisine(cuisines):
    cuisines_lower = cuisines.lower()  # Transformă în litere mici
    for cuisine in countries:
        if cuisine in cuisines_lower:
            return cuisine  # Dacă găsește un tip de bucătărie, returnează-l
    return None  # Dacă nu găsește nimic, returnează None

# Funcție pentru determinarea tipului
def determine_type(cuisines, top_tags):
    combined = f"{cuisines} {top_tags}".lower()  # Combina câmpurile și transformă în litere mici
    for type_name, keywords in type_keywords.items():
        if any(keyword in combined for keyword in keywords):
            return type_name
    return "restaurant"  # Implicit dacă nu se găsește nimic

# Adaugă fiecare rând din primele 100 în Firestore
for index, row in data.iterrows():
    restaurant_id = str(index + 1)  # Creează un ID unic pentru fiecare document
    cuisines = str(row.get("cuisines", "")).lower()  # Convertește în string și litere mici
    top_tags = str(row.get("top_tags", "")).lower()  # Convertește în string și litere mici
    
    # Determină tipul
    restaurant_type = determine_type(cuisines, top_tags)

    # Validăm bucătăria, dacă nu există o bucătărie specifică, punem None
    validated_cuisine = validate_cuisine(cuisines)
    
    document_data = {
        "name": row.get("restaurant_name"),
        "address": row.get("address"),
        "type": restaurant_type,
        "rating": row.get("avg_rating"),
        "price_range": row.get("price_range"),
        "meals": row.get("meals").split(",") if pd.notna(row.get("meals")) else [],
        "total_reviews": row.get("total_reviews_count"),
        "cuisine": validated_cuisine,
        "original_open_hours": row.get("original_open_hours"),
        "vegan_options": row.get("vegan_options") == "Y",
        "vegetarian_options": row.get("vegetarian_friendly") == "Y",
        "gluten_free": row.get("gluten_free") == "Y",
        "location": {
            "latitude": float(row.get("latitude")),
            "longitude": float(row.get("longitude"))
        }
    }
    # Adaugă documentul în colecția 'restaurants'
    db.collection("restaurants").document(restaurant_id).set(document_data)
