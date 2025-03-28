import { collection, doc, setDoc, getDocs, deleteDoc } from "firebase/firestore";
import { firestore } from "../firebase/config"; // adjust path if needed

export const seedMostVisitedPlaces = async (uid) => {
  if (!uid) {
    console.error("UID is required.");
    return;
  }

  const places = [
    {
      latitude: 53.3509935,
      longitude: -6.2773878,
      count: 8,
      timeSpent: 300,
      type: "home",
    },
    {
      latitude: 53.3385303,
      longitude: -6.2691175,
      count: 5,
      timeSpent: 200,
      type: "work",
    },
    {
      //it's a trap cafe
      latitude: 53.3400223,
      longitude: -6.2662978,
      count: 10,
      timeSpent: 50,
      type: "cafe"
    },
    {
      //gym
      latitude: 53.348242,
      longitude:-6.2811017,
      count: 5,
      timeSpent: 5,
      type: "gym",
    },
    {
      // cobblestones pub
      latitude: 53.3488314,
      longitude: -6.2808707,
      count: 1,
      timeSpent: 11,
      type: "bar",
    },
    {
      //lidl
      latitude: 53.3502178,
      longitude: -6.279085,
      count: 10,
      timeSpent: 2,
      type: "grocery",
    },
    {
      //ohenix park
      latitude: 53.3539102,
      longitude: -6.3229063,
      count: 3,
      timeSpent: 4,
      type: "parks",
    },
  ];

  try {
    const mostVisitedCollection = collection(firestore, "locations", uid, "mostVisitedPlaces");
    console.error("HELP");

    // Delete existing entries if needed (optional cleanup)
    // You can also skip this part if you want to just append
    const existingDocs = await getDocs(mostVisitedCollection);
    const deletePromises = existingDocs.docs.map((docSnap) => 
      deleteDoc(doc(firestore, "locations", uid, "mostVisitedPlaces", docSnap.id))
    );
    await Promise.all(deletePromises);

    // Add each place as a new document
    const writePromises = places.map((place) => {
      const newDocRef = doc(mostVisitedCollection); // auto-generated ID
      return setDoc(newDocRef, place);
    });

    await Promise.all(writePromises);

    console.log("✅ Successfully seeded mostVisitedPlaces in Firestore.");
  } catch (error) {
    console.error("🔥 Error writing mostVisitedPlaces to Firestore:", error);
  }
};
