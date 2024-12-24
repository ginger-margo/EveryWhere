const adjustCoordinatesForRadius = (location, radius) => {
  const earthRadiusInMeters = 111320; // Радиус земли для широты
  const latitude = location.latitude;
  const longitude = location.longitude;

  const deltaLatitude = radius / earthRadiusInMeters; // Смещение по широте
  const deltaLongitude = radius / (earthRadiusInMeters * Math.cos(latitude * Math.PI / 180)); // Смещение по долготе

  return {
    minLatitude: latitude - deltaLatitude,
    maxLatitude: latitude + deltaLatitude,
    minLongitude: longitude - deltaLongitude,
    maxLongitude: longitude + deltaLongitude,
  };
};

// Преобразование данных для расширения зоны захвата
export const transformLocationsForRadius = (locations, radius) => {
  return locations.map((location) => {
    const adjusted = adjustCoordinatesForRadius(location, radius);
    return {
      ...location,
      latitude: location.latitude, // Центр остается неизменным
      longitude: location.longitude, // Центр остается неизменным
      minLatitude: adjusted.minLatitude, // Нижняя граница
      maxLatitude: adjusted.maxLatitude, // Верхняя граница
      minLongitude: adjusted.minLongitude, // Левая граница
      maxLongitude: adjusted.maxLongitude, // Правая граница
    };
  });
};
