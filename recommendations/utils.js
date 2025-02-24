import axios from 'axios';
import { GOOGLE_PLACES_API_KEY } from "@env";

export const getNearbyPlaces = async (latitude, longitude, type="point_of_interest") => {
  const radius = 1000; // Радиус поиска в метрах (1 км)

  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=${radius}&type=${type}&key=${GOOGLE_PLACES_API_KEY}`;

  try {
    const response = await axios.get(url);
    return response.data.results;
  } catch (error) {
    console.error('Error fetching nearby places:', error);
    return [];
  }
};
