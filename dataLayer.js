import { firestore } from "./firebase/config";
import { collection, getDocs } from "firebase/firestore";

// Получение всех точек пользователя из Firestore
export async function fetchLocationPoints(userId) {
    const snapshot = await getDocs(
      collection(firestore, "locations", userId, "locationData")
    );
  
    const points = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      points.push({
        latitude: data.latitude,
        longitude: data.longitude,
        timestamp: data.timestamp,
      });
    });
  
    return points.sort((a, b) => a.timestamp - b.timestamp);
  }