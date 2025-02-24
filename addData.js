import { auth, firestore } from "./firebase/config";
import { collection, addDoc } from "firebase/firestore";

export const addLocation = async (latitude, longitude, timestamp) => {
  const user = auth.currentUser;

  if (!user) {
    console.error("User not authenticated");
    return;
  }

  const uid = user.uid; // ✅ Get actual user UID

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

    // ✅ Correct Firestore path for subcollection
    const locationsRef = collection(firestore, `coords/${uid}/locations`);
    await addDoc(locationsRef, data);
    console.log("Location saved in Firestore", new Date(timestamp).toLocaleString());
  } catch (error) {
    console.error("Error saving location in Firestore:", error);
  }
};
