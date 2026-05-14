"""
Geocoding para leads sin coordenadas (Instagram, Facebook).
Usa Google Maps Geocoding API via Apify para buscar coordenadas por nombre.
Si no encuentra nada, devuelve None — el lead aparece en lista pero no en mapa.
"""
import time
import urllib.request
import urllib.parse
import json


def geocode_by_name(nombre: str, ciudad: str = "") -> dict:
    """
    Busca coordenadas de un negocio por nombre y ciudad.
    Devuelve {lat, lng, maps_url} o None si no encuentra.
    """
    if not nombre:
        return None

    query = f"{nombre} {ciudad}".strip()
    encoded = urllib.parse.quote(query)
    
    # Usar Nominatim (OpenStreetMap) — gratuito, sin API key
    url = f"https://nominatim.openstreetmap.org/search?q={encoded}&format=json&limit=1&countrycodes=es"
    
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'NexumProspector/1.0'})
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode())
            
        if data and len(data) > 0:
            result = data[0]
            lat = float(result.get('lat', 0))
            lng = float(result.get('lon', 0))
            
            if lat and lng:
                maps_url = f"https://www.google.com/maps/search/?api=1&query={lat},{lng}"
                return {'lat': lat, 'lng': lng, 'maps_url': maps_url}
        
        return None
    except Exception as e:
        print(f"Geocoding error para '{nombre}': {e}")
        return None


def enrich_leads_with_coordinates(leads: list) -> list:
    """
    Añade coordenadas a todos los leads.
    Google Maps leads ya tienen coords. Instagram leads se geocodifican.
    """
    enriched = []
    
    for lead in leads:
        if lead.get('lat') and lead.get('lng'):
            # Ya tiene coordenadas (Google Maps)
            enriched.append(lead)
            continue
        
        # Sin coordenadas — intentar geocodificar
        source = lead.get('source', '')
        if source in ['instagram', 'facebook', 'linkedin']:
            geo = geocode_by_name(lead.get('nombre', ''), lead.get('ciudad', ''))
            if geo:
                lead['lat'] = geo['lat']
                lead['lng'] = geo['lng']
                lead['maps_url'] = geo['maps_url']
                print(f"  📍 Geocodificado: {lead.get('nombre')} → {geo['lat']:.4f}, {geo['lng']:.4f}")
            else:
                lead['lat'] = None
                lead['lng'] = None
                lead['maps_url'] = None
                print(f"  ❌ Sin coordenadas: {lead.get('nombre')}")
            
            # Rate limit — Nominatim requiere 1 req/seg
            time.sleep(1.1)
        
        enriched.append(lead)
    
    return enriched
