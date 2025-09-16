import React from 'react';

interface Kid {
  id: number;
  name: string;
  breed: string;
  age: number;
}

interface KidItemProps {
  kid: Kid;
}

const KidItem: React.FC<KidItemProps> = ({ kid }) => {
  return (
    <div className="kid-item">
      <h3>{kid.name}</h3>
      <p>Breed: {kid.breed}</p>
      <p>Age: {kid.age}</p>
    </div>
  );
};

export default KidItem;
