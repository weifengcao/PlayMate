/*
 * ----------------------------------------
 * File: friend_setstate.ts
 * Created: 05/06/2024
 * Author: Travis Trainee
 * 
 * Updates:
 *   05/04/2024 (Travis Trainee)
 *     Factorization of the building of failed status, with the function failStatus
 *   03/06/2024 (Travis Trainee)
 *     Optimization of the check to make sure the state is 0, 1 or 2.
 * ----------------------------------------
*/

import { FriendLink } from '../models/FriendLink'

// useless ??
function getFriendLink() {
  //const friendId = req.body.friendId;
  return FriendLink.findAll();
}

const FAIL_TYPE_INVALID_FRIENDSHIP_STATE = 0;
const FAIL_TYPE_NOT_A_FRIEND = 1;

function failStatus(res, failType) {
  /*
  ------------------
  Function failStatus
  ------------------

  Returns a fail status when the operation failed.

  Parameters:
    res: the result to return, telling the operation failed.
    failType: type of failing. Either the value FAIL_TYPE_INVALID_FRIENDSHIP_STATE or the value FAIL_TYPE_NOT_A_FRIEND.

  Return value:
    the res.

  Algorithm:
    See code.
  */

  let errorMsg = "";
  if (failType === FAIL_TYPE_INVALID_FRIENDSHIP_STATE) {
    errorMsg = "Invalid friendship state.";
  } else {
    if (failType === FAIL_TYPE_NOT_A_FRIEND) {
      errorMsg = "This user is not a friend.";
    }
  }
  return res.status(401).json({status: "failed",data: [],message: errorMsg,});
}

export async function friendSetState(req, res) {
  /*
  ------------------
  Function friendSetState
  ------------------

  Sets the state of a friend.
  Parameters:
    req: the request corresponding to the setting of the state.
    res: the result to return, telling if the setting worked or not.

  Return value:
    the res.

  Algorithm:
    See code.
  */

    function checkDatabaseAnswer(dataBaseAnswer2) {
      /*
      ------------------
      Function failStatus
      ------------------

      Sub-function inside friendSetState.
      TODO: complete the header of this function.
      */
      const newState = req.body.friendshipState;

      console.log("before check zzxxxyyy.")
      //console.log("state", dataBaseAnswer._state);
      //console.log("settled", dataBaseAnswer._settled);
      
      //if (dataBaseAnswer._settled) {
      //dataBaseAnswer.then({
      
        console.log("we have the database answer.");
        //console.log("state", dataBaseAnswer._state);
        //console.log("settled", dataBaseAnswer._settled);
        console.log(dataBaseAnswer["friendlink"]);
        console.log(dataBaseAnswer2.length);
        console.log("----------------");

        let foundLink = false;
        for (let i =0; i < dataBaseAnswer2.length; i++) {
          const oneLink = dataBaseAnswer2[i];
          console.log("askerId", oneLink.askerId, "receiverId", oneLink.receiverId, "state", oneLink.state);
          if ((oneLink.askerId === friendId) && (oneLink.receiverId === req.user.id)) {
            console.log("Modify this one !");
            foundLink = true;
            oneLink.state = newState;
            oneLink.save();
          }
        }

        if (!foundLink) {
          return failStatus(res, FAIL_TYPE_NOT_A_FRIEND);
          /*
          return res.status(401).json({
            status: "failed",
            data: [],
            message:
              "This user is not a friend.",
          });*/
        }
        res.end();
      
      console.log("wait for database answer zzzt.")
      
    }

    console.log("I am inside friendSetState")
    const friendId = req.body.friendId;
    const newState = req.body.friendshipState;
    // Optimized way to check newState is 0, 1 or 2
    // (A boolean AND and a diff check is faster than 2 comparison checks).
    console.log(newState & 3);
    console.log(newState);
    if (((newState & 3) !== newState)) {
      return failStatus(res, FAIL_TYPE_INVALID_FRIENDSHIP_STATE);
      /*return res.status(401).json({
        status: "failed",
        data: [],
        message:
          "Invalid friendship state.",
      });*/
    }

    const dataBaseAnswer = FriendLink.findAll();
    dataBaseAnswer.then(checkDatabaseAnswer);
    //const interval = setInterval(checkDatabaseAnswer, 1000);


};



export async function friendSetState_old(req, res) {
  /*
  ------------------
  Function failStatus
  ------------------

  Sets the state of a friend.
  Parameters:
    req: the request corresponding to the setting of the state.
    res: the result to return, telling if the setting worked or not.

  Return value:
    the res.

  Algorithm:
    See code.
  */

    function checkDatabaseAnswer(dataBaseAnswer2) {
      /*
      ------------------
      Function failStatus
      ------------------

      Sub-function inside friendSetState.
      TODO: complete the header of this function.
      */
      const newState = req.body.friendshipState;

      console.log("before check zzxxxyyy.")
      //console.log("state", dataBaseAnswer._state);
      //console.log("settled", dataBaseAnswer._settled);
      
      //if (dataBaseAnswer._settled) {
      //dataBaseAnswer.then({
      
        console.log("we have the database answer.");
        //console.log("state", dataBaseAnswer._state);
        //console.log("settled", dataBaseAnswer._settled);
        console.log(dataBaseAnswer["friendlink"]);
        console.log(dataBaseAnswer2.length);
        console.log("----------------");

        let foundLink = false;
        for (let i =0; i < dataBaseAnswer2.length; i++) {
          const oneLink = dataBaseAnswer2[i];
          console.log("askerId", oneLink.askerId, "receiverId", oneLink.receiverId, "state", oneLink.state);
          if ((oneLink.askerId === friendId) && (oneLink.receiverId === req.user.id)) {
            console.log("Modify this one !");
            foundLink = true;
            oneLink.state = newState;
            oneLink.save();
          }
        }

        if (!foundLink) {
          return failStatus(res, FAIL_TYPE_NOT_A_FRIEND);
          /*
          return res.status(401).json({
            status: "failed",
            data: [],
            message:
              "This user is not a friend.",
          });*/
        }
        res.end();
      
      console.log("wait for database answer zzzt.")
      
    }

    console.log("I am inside friendSetState")
    const friendId = req.body.friendId;
    const newState = req.body.friendshipState;
    if (!((newState >= 0) && (newState <= 2))) {
      return failStatus(res, FAIL_TYPE_INVALID_FRIENDSHIP_STATE);
      /*return res.status(401).json({
        status: "failed",
        data: [],
        message:
          "Invalid friendship state.",
      });*/
    }

    const dataBaseAnswer = FriendLink.findAll();
    dataBaseAnswer.then(checkDatabaseAnswer);
    //const interval = setInterval(checkDatabaseAnswer, 1000);


};