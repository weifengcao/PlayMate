import { FC } from 'react';
import { Kid } from '../types';

interface KidItemProps {
  kid: Kid;
}

const KidItem: FC<KidItemProps> = ({ kid }) => {
  return (
    <div className="kid-item">
      <h3>{kid.name}</h3>
      <p>Favorite activity: {kid.favoriteActivity}</p>
      <p>Age: {kid.age}</p>
    </div>
  );
};

export default KidItem;
