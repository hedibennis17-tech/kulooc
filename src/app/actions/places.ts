'use server';

const AUTOCOMPLETE_API_URL = 'https://maps.googleapis.com/maps/api/place/autocomplete/json';

export type AutocompletePrediction = {
  description: string;
  place_id: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  }
};

export type AutocompleteResponse = {
  success: true;
  predictions: AutocompletePrediction[];
} | {
  success: false;
  error: string;
};

export async function autocompleteAddress(input: string): Promise<AutocompleteResponse> {
  if (!input) {
    return { success: true, predictions: [] };
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    const error = 'Google Maps API key is missing';
    console.error(error);
    return { success: false, error };
  }

  const montrealCoords = "45.5019,-73.5674";
  const radius = "50000"; // 50km in meters

  const url = `${AUTOCOMPLETE_API_URL}?input=${encodeURIComponent(
    input
  )}&key=${apiKey}&components=country:CA&language=fr&types=address&locationbias=circle:${radius}@${montrealCoords}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      const error = data.error_message || `Places Autocomplete API error: ${data.status}`;
      console.error(error);
      return { success: false, error };
    }

    return { success: true, predictions: data.predictions || [] };
  } catch (error) {
    const errorMessage = 'Error fetching autocomplete suggestions.';
    console.error(errorMessage, error);
    return { success: false, error: errorMessage };
  }
}

const GEOCODE_API_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

export type ReverseGeocodeResponse = {
  success: true;
  address: string;
} | {
  success: false;
  error: string;
};

export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResponse> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    const error = 'Google Maps API key is missing';
    console.error(error);
    return { success: false, error };
  }

  const url = `${GEOCODE_API_URL}?latlng=${lat},${lng}&key=${apiKey}&language=fr`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK') {
      const error = data.error_message || `Geocoding API error: ${data.status}`;
      console.error(error);
      return { success: false, error };
    }

    const address = data.results[0]?.formatted_address;
    if (!address) {
      return { success: false, error: 'No address found' };
    }

    return { success: true, address };
  } catch (error) {
    const errorMessage = 'Error fetching reverse geocode.';
    console.error(errorMessage, error);
    return { success: false, error: errorMessage };
  }
}
