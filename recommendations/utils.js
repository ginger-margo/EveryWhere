import axios from "axios";
import { GOOGLE_PLACES_API_KEY } from "@env";

const blockListInNames = ["atm", "atm ", "service", "repair", "gas", "station"];

export const getNearbyPlaces = async (
  latitude,
  longitude,
  type = "point_of_interest",
  ignoreRadius = false
) => {
  const radius = ignoreRadius ? undefined : 1000;

  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&${
    radius ? `radius=${radius}` : "rankby=distance"
  }&type=${type}&key=${GOOGLE_PLACES_API_KEY}`;

  console.log("Google Places full URL:", url);

  try {
    const response = await axios.get(url);
    const results = response.data.results;

    console.log("Results length before filtering:", response.data.results.length);

    const filtered = results.filter(
      (place) =>
        (place.rating ?? 0) >= 3.5 &&
        (place.user_ratings_total ?? 0) >= 5 &&
        (place.photos?.length ?? 0) >= 1 &&
        place.business_status === "OPERATIONAL" &&
        place.types &&
        !place.types.includes("political") &&
        !place.types.includes("postal_code") &&
        !place.types.includes("locality") &&
        !place.types.includes("sublocality") &&
        !place.types.includes("lodging") &&
        !place.types.includes("insurance_agency") &&
        !place.types.includes("finance") &&
        !place.types.includes("parking") &&
        !blockListInNames.some((word) =>
          place.name?.toLowerCase().includes(word)
        )
    );

    console.log("Results length after filtering:", filtered.length);

    return filtered.sort(() => Math.random() - 0.5).slice(0, 10);
  } catch (error) {
    console.error("Error fetching nearby places:", error);
    return [];
  }
};
