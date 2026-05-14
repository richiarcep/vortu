"""
Nexum Prospector — Scraping de leads via Apify.
Fuentes: Google Maps, Instagram, Facebook, LinkedIn.
"""
import os
from apify_client import ApifyClient
from core.config import get_settings

settings = get_settings()
client = ApifyClient(getattr(settings, 'APIFY_API_TOKEN', ''))


def scrape_google_maps(query: str, location: str, max_results: int = 100) -> list:
    """
    Scraping de Google Maps — negocios por categoria y ubicacion.
    Devuelve lista de leads con nombre, direccion, telefono, web, rating.
    """
    print(f"Scraping Google Maps: {query} en {location}...")
    
    run_input = {
        "searchStringsArray": [f"{query} en {location}"],
        "maxCrawledPlacesPerSearch": max_results,
        "language": "es",
        "countryCode": "es",
        "includeWebResults": False,
    }
    
    try:
        run = client.actor("compass/crawler-google-places").call(run_input=run_input)
        items = list(client.dataset(run["defaultDatasetId"]).iterate_items())
        
        leads = []
        for item in items:
            # Extract coordinates from Google Maps
            location_data = item.get("location", {}) or {}
            lat = location_data.get("lat") or item.get("lat")
            lng = location_data.get("lng") or item.get("lng")
            maps_url = item.get("url", "") or (f"https://www.google.com/maps/search/?api=1&query={lat},{lng}" if lat and lng else "")

            lead = {
                "source": "google_maps",
                "nombre": item.get("title", ""),
                "categoria": item.get("categoryName", ""),
                "direccion": item.get("address", ""),
                "telefono": item.get("phone", ""),
                "website": item.get("website", ""),
                "email": item.get("email", ""),
                "rating": item.get("totalScore", 0),
                "reviews": item.get("reviewsCount", 0),
                "instagram": "",
                "facebook": "",
                "linkedin": "",
                "descripcion": item.get("description", ""),
                "ciudad": location,
                "query_usada": query,
                "lat": lat,
                "lng": lng,
                "maps_url": maps_url,
            }
            if lead["nombre"]:
                leads.append(lead)
        
        print(f"Google Maps: {len(leads)} leads encontrados")
        return leads
    except Exception as e:
        print(f"Error Google Maps scraping: {e}")
        return []


def scrape_instagram(query: str, max_results: int = 50) -> list:
    """
    Scraping de perfiles de Instagram — negocios por hashtag o palabra clave.
    """
    print(f"Scraping Instagram: {query}...")
    
    run_input = {
        "hashtags": [query.replace(" ", "").replace("#", "")],
        "resultsLimit": max_results,
        "resultsType": "posts",
    }
    
    try:
        run = client.actor("apify/instagram-hashtag-scraper").call(run_input=run_input)
        items = list(client.dataset(run["defaultDatasetId"]).iterate_items())
        
        leads = []
        seen = set()
        for item in items:
            owner = item.get("ownerUsername", "")
            if not owner or owner in seen:
                continue
            seen.add(owner)
            
            lead = {
                "source": "instagram",
                "nombre": item.get("ownerFullName", owner),
                "categoria": query,
                "direccion": "",
                "telefono": "",
                "website": "",
                "email": "",
                "rating": 0,
                "reviews": 0,
                "instagram": f"https://instagram.com/{owner}",
                "facebook": "",
                "linkedin": "",
                "descripcion": (item.get("caption") or "")[:200],
                "ciudad": "",
                "query_usada": query,
                "seguidores": item.get("ownerFollowersCount", 0),
            }
            leads.append(lead)
        
        print(f"Instagram: {len(leads)} leads encontrados")
        return leads
    except Exception as e:
        print(f"Error Instagram scraping: {e}")
        return []


def run_prospector(prompt: str, location: str = "Madrid", max_per_source: int = 100) -> list:
    """
    Pipeline completo de scraping.
    Combina todas las fuentes y deduplica por nombre.
    """
    all_leads = []
    
    # Google Maps — fuente principal
    maps_leads = scrape_google_maps(prompt, location, max_per_source)
    all_leads.extend(maps_leads)
    
    # Instagram — fuente secundaria
    ig_leads = scrape_instagram(prompt, max_per_source // 2)
    all_leads.extend(ig_leads)
    
    # Deduplicar por nombre similar
    seen_names = set()
    unique_leads = []
    for lead in all_leads:
        name_key = lead["nombre"].lower().strip()[:20]
        if name_key and name_key not in seen_names:
            seen_names.add(name_key)
            unique_leads.append(lead)
    
    print(f"Total leads unicos: {len(unique_leads)}")
    
    # Enriquecer con coordenadas (geocoding para Instagram)
    from modules.prospector.geocoder import enrich_leads_with_coordinates
    print("Geocodificando leads sin coordenadas...")
    unique_leads = enrich_leads_with_coordinates(unique_leads)
    
    return unique_leads
