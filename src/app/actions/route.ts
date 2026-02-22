'use server';

const ROUTES_API_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';

export type RouteDetailsData = {
    distanceMeters: number;
    duration: string; // e.g. "600s"
    polyline: {
        encodedPolyline: string;
    };
    startLocation: { lat: number; lng: number };
    endLocation: { lat: number; lng: number };
};

export type RouteDetailsResponse = {
    success: true;
    data: RouteDetailsData | null;
} | {
    success: false;
    error: string;
};

export async function getRouteDetails(originAddress: string, destinationAddress: string): Promise<RouteDetailsResponse> {
    if (!destinationAddress || !originAddress) {
        return { success: true, data: null };
    }
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
        const error = 'Google Maps API key is missing';
        console.error(error);
        return { success: false, error };
    }
    
    const originPayload = { address: originAddress };
    const destinationPayload = { address: destinationAddress };

    try {
        const response = await fetch(ROUTES_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': apiKey,
                'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline,routes.legs'
            },
            body: JSON.stringify({
                origin: originPayload,
                destination: destinationPayload,
                travelMode: 'DRIVE',
                languageCode: 'fr-CA',
            })
        });
        
        const data = await response.json();

        if (data.error) {
            console.error('Routes API error:', data.error.message);
            return { success: false, error: data.error.message || 'Error fetching route details from Routes API.' };
        }

        if (!data.routes || data.routes.length === 0) {
             const error = "No routes found between the specified origin and destination.";
             console.error(error);
             return { success: false, error };
        }

        const route = data.routes[0];
        const startLatLng = route.legs?.[0]?.startLocation?.latLng;
        const endLatLng = route.legs?.[0]?.endLocation?.latLng;

        if (!route.distanceMeters || !route.duration || !route.polyline?.encodedPolyline || !startLatLng || !endLatLng) {
            const error = "Routes API did not return all required route information.";
            console.error(error, route);
            return { success: false, error };
        }

        return {
            success: true,
            data: {
                distanceMeters: route.distanceMeters,
                duration: route.duration,
                polyline: route.polyline,
                startLocation: { lat: startLatLng.latitude, lng: startLatLng.longitude },
                endLocation: { lat: endLatLng.latitude, lng: endLatLng.longitude },
            }
        };

    } catch (error) {
        const errorMessage = 'Error fetching route details.';
        console.error(errorMessage, error);
        return { success: false, error: errorMessage };
    }
}
