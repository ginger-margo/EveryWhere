// Function to calculate points every `distance` meters
const interpolatePoints = (start, end, interval) => {
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const toDegrees = (radians) => (radians * 180) / Math.PI;

  const R = 6371000; // Earth's radius in meters
  const lat1 = toRadians(start.latitude);
  const lon1 = toRadians(start.longitude);
  const lat2 = toRadians(end.latitude);
  const lon2 = toRadians(end.longitude);

  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;
  const distance =
    R *
    2 *
    Math.asin(
      Math.sqrt(
        Math.sin(dLat / 2) ** 2 +
          Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
      )
    );

  const points = [];
  const numPoints = Math.floor(distance / interval);
  for (let i = 0; i <= numPoints; i++) {
    const fraction = i / numPoints;
    const lat = toDegrees(lat1 + fraction * dLat);
    const lon = toDegrees(lon1 + fraction * dLon);
    points.push({ latitude: lat, longitude: lon });
  }
  return points;
};

// Original points
const originalPoints = [
  { latitude: 53.350710, longitude: -6.278160 }, // Ardcairn House
  { latitude: 53.348881, longitude: -6.279207 }, // Queen St
  { latitude: 53.346486, longitude: -6.277003 }, // Liffey
  { latitude: 53.346172, longitude: -6.277593 }, // O'Donovan Rossa Bridge
  { latitude: 53.342255, longitude: -6.271220 }, // St. Patrick's Park
  { latitude: 53.338456, longitude: -6.267452 }, // Aungier St TU Dublin
  { latitude: 53.350960, longitude: -6.265020 }, // Ilac Shopping Center
  { latitude: 53.345867, longitude: -6.263162 }, // Temple Bar
  { latitude: 53.350710, longitude: -6.278160 }, // Back to Ardcairn House
  { latitude: 53.347753, longitude: -6.274534 }, // Four Courts
  { latitude: 53.350710, longitude: -6.278160 }, // Back to Ardcairn House
];

// Generate interpolated points
export const mockTravelPoints = [];
const interval = 50; // 50 meters
for (let i = 0; i < originalPoints.length - 1; i++) {
  const interpolated = interpolatePoints(originalPoints[i], originalPoints[i + 1], interval);
  mockTravelPoints.push(...interpolated);
}
