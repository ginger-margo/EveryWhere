import { useState, useEffect } from "react";
import * as Location from "expo-location";
import { returnGeocodedLocation } from "../map/locationUtils";

const cache = {};

const useCityBoundary = () => {
  const [boundingBox, setBoundingBox] = useState(null);
  const [cityName, setCityName] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBoundingBox = async () => {
      try {
        setLoading(true);

        const location = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = location.coords;

        const geoResult = await returnGeocodedLocation({ latitude, longitude });
        // const city = geoResult[0]?.city || geoResult[0]?.subregion || geoResult[0]?.region;
        const city = geoResult[0]?.region;

        if (!city) {
          setError("Unable to determine city name");
          setLoading(false);
          return;
        }

        setCityName(city);

        // 3. Check cache
        if (cache[city]) {
          setBoundingBox(cache[city]);
          setLoading(false);
          return;
        }

        // 4. Fetch bounding box from Nominatim
        const url = `https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(city)}&format=json&limit=1`;
        const res = await fetch(url, {
          headers: {
            "User-Agent": "EveryWhereApp/1.0 (marefil1711@.com)"
          }
        });
        const data = await res.json();

        if (!data.length || !data[0].boundingbox) {
          setError("City boundary not found");
          setLoading(false);
          return;
        }

        const [southLat, northLat, westLng, eastLng] = data[0].boundingbox;

        const box = {
          minLatitude: parseFloat(southLat),
          maxLatitude: parseFloat(northLat),
          minLongitude: parseFloat(westLng),
          maxLongitude: parseFloat(eastLng),
        };

        // 5. Save
        cache[city] = box;
        setBoundingBox(box);
        setLoading(false);
      } catch (err) {
        console.error("City boundary error:", err);
        setError("Failed to fetch city boundary");
        setLoading(false);
      }
    };

    fetchBoundingBox();
  }, []);

  return { boundingBox, cityName, loading, error };
};

export default useCityBoundary;
