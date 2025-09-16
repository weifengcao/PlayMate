import { FC } from "react";
import { Dog } from "../types";

interface DogItemProps {
  dog: Dog;
}

export const DogItem: FC<DogItemProps> = ({ dog }) => {
  // use the value "dog.id" if you want to do actions on dog.
  return (
    <div>
      - {dog.name} ({dog.breed})
    </div>
  );
};
