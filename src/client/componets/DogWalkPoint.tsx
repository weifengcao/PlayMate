// This code is ugly on purpose.
// It's part of one of the exercise to review and fix it.
// Good luck !

import { useEffect, useState } from "react";
import { setMyDogwalkPoint, getMyDogwalkPoint } from "../api";

export const DogWalkPoint = (props) => {
  const [latitude, setLatitude] = useState(0);
  const [longitude, setLongitude] = useState(0);
  const [error, setErrMessage] = useState("");

  const fetchDataAndUpdateState = () => {
    getMyDogwalkPoint().then((result) => {
      console.log("updating withzzz", result);
      updateLatLong(result);
    });
  };

  const updateLatLong = (data) => {
    const updateLatitude = (lat) => setLatitude(lat);
    const updateLongitude = (long) => setLongitude(long);
    updateLatitude(data.dogwalk_latit);
    updateLongitude(data.dogwalk_longi);
  };

  useEffect(() => {
    const initialize = () => {
      try {
        fetchDataAndUpdateState();
      } catch (e) {
        console.log("Fetch failed", e);
      }
    };
    initialize();
  }, [props]);

  const onFormInputChange = () => {
    let lat = document.getElementById("dogwalk_latit").value;
    let long = document.getElementById("dogwalk_longi").value;
    if (lat != latitude) {
      changeLatitude(lat);
    }
    if (long != longitude) {
      changeLongitude(long);
    }
  };

  const changeLatitude = (val) => {
    const updateLat = (lat) => setLatitude(lat);
    updateLat(val);
  };

  const changeLongitude = (val) => {
    const updateLong = (long) => setLongitude(long);
    updateLong(val);
  };

  const formSubmitHandler = (event) => {
    event.preventDefault();
    let lat = document.getElementById("dogwalk_latit").value;
    console.log("latzz", lat);
    let long = document.getElementById("dogwalk_longi").value;
    const triggerUpdate = () => {
      if (props.onUpdate) props.onUpdate();
    };
    try {
      let dataInit = {};
      let dataCurrent = {};
      const wait = (milliseconds) =>
        new Promise((resolve) => setTimeout(resolve, milliseconds));

      getMyDogwalkPoint().then((result) => {
        dataInit = result;
        console.log("dataInit z", dataInit);

        setMyDogwalkPoint(lat, long);

        //triggerUpdate();
        wait(1).then(() => {
          console.log("Waited 1 milliseconds");
          getMyDogwalkPoint().then((result) => {
            dataCurrent = result;
            console.log("dataCurrent", dataCurrent);
            if (dataCurrent != dataInit) {
              console.log("ok");
              triggerUpdate();
              return;
            }
            wait(1000).then(() => {
              console.log("Waited 1 second");
              getMyDogwalkPoint().then((result) => {
                dataCurrent = result;
                console.log("dataCurrent", dataCurrent);
                if (dataCurrent != dataInit) {
                  console.log("ok");
                  triggerUpdate();
                  return;
                }
                wait(5000).then(() => {
                  console.log("Waited 5 seconds");
                  console.log("update and pray.");
                  triggerUpdate();
                });
              });
            });
          });
        });
      });
    } catch (err) {
      setErrMessage(err.message || "Error occurred");
    }
  };

  const renderLabel = (text, htmlFor) => (
    <label htmlFor={htmlFor}>{text}</label>
  );

  const renderLabelAndInputField = (text, htmlFor, name, value, color) => (
    <>
      <label htmlFor={htmlFor}>{text}</label>
      <input
        style={{ width: "120px", color }}
        type="text"
        name={name}
        id={name}
        value={value}
        onChange={onFormInputChange}
      />
    </>
  );

  return (
    <div
      style={{ margin: "30px", padding: "10px", backgroundColor: "#613803" }}
    >
      <form onSubmit={formSubmitHandler}>
        <div style={{ display: "block" }}>
          {renderLabelAndInputField(
            "Latitude:",
            "dogwalk_latit",
            "dogwalk_latit",
            latitude,
            "white"
          )}
          {renderLabelAndInputField(
            "Longitude:",
            "dogwalk_longi",
            "dogwalk_longi",
            longitude,
            "white"
          )}
          <button type="submit" style={{ padding: "10px", margin: "10px" }}>
            Submit Location
          </button>
        </div>
      </form>
    </div>
  );
};
