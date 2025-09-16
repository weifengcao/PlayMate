import React from 'react';

interface PlaydateLocation {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
}

interface PlaydateLocationProps {
  location: PlaydateLocation;
}

const PlaydateLocation: React.FC<PlaydateLocationProps> = ({ location }) => {
  return (
    <div className="playdate-location">
      <h3>{location.name}</h3>
      <p>Latitude: {location.latitude}</p>
      <p>Longitude: {location.longitude}</p>
    </div>
  );
};

export default PlaydateLocation;
