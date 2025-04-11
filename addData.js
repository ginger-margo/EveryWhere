import { auth, firestore } from "./firebase/config";
import { collection, addDoc } from "firebase/firestore";

export const addLocation = async (latitude, longitude, timestamp) => {
  const user = auth.currentUser;

  if (!user) {
    console.error("User not authenticated");
    return;
  }

  const uid = user.uid; 

  try {
    const data = {
      latitude,
      longitude,
      timestamp,
      accuracy: 0,
      altitude: 0,
      altitudeAccuracy: 0,
      heading: 0,
      speed: 0,
    };

    const locationsRef = collection(firestore, `coords/${uid}/locations`);
    await addDoc(locationsRef, data);
  } catch (error) {
    console.error("Error saving location in Firestore:", error);
  }
};
