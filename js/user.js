function signIn(email, password) {
  app.preloader.show();
  firebase.auth().signInWithEmailAndPassword(email, password).catch(function(error) {
    app.preloader.hide();
    app.toast.show({
      text: error,
      closeTimeout: 10000,
      closeButton: true
    });
  }).then(function() {
    //Put any code that needs to happen after login here
    console.log("Signed in!");
  });
}

function signOut() {
  firebase.auth().signOut().then(function() {
    // Sign-out successful.
  }).catch(function(error) {
    throw (error);
    console.log("Failed to sign out: " + error.message);
  });
}

//getUser function taken from app
var loadedUsers = []; //
var callbacks = {}; // This stores the calbacks for users we are loading
function getUser(userID, callback) {
  //example usage
  //  getUser('MTyzi4gXVqfKIOoeihvdUuVAu3E2', function(user) {
  //  console.log(user);});

  if (userID && userID != '') { // If the userID is valid
    if (loadedUsers[userID]) { // If we have already loaded this users data then return it else load it from the database
      console.log("found user in array");
      callback(loadedUsers[userID]);
    } else {

      if (!callbacks[userID]) { // Check if we are already loading this user
        // We are not currently loading this user so make a callback array for the user and push the current callback to it
        callbacks[userID] = [];
        callbacks[userID].push(callback);

        var profilePic = "";
        var profilePictureRef = storageRef.child('profile-pictures').child(userID); // Create a reference to the file we want to download

        profilePictureRef.getDownloadURL().then(function(url) { // Get the download URL
          profilePic = url;
        }).catch(function(error) {
          profilePic = "./unknown.jpg";;
        }).then(function() {
          db.collection("users").doc(userID).get().then(function(userData) {
            if (userData.exists) {
              loadedUsers[userID] = {
                uid: userID,
                username: userData.get("username"),
                firstName: userData.get("firstName"),
                lastName: userData.get("lastName"),
                fullName: function() {
                  return "" + this.firstName + " " + this.lastName;
                },
                profilePic: profilePic,
                bio: userData.get("bio"),
                favoriteSports: userData.get("favoriteSports"),
                favoriteTeams: userData.get("favoriteTeams"),
              };
              console.log("loaded user: " + userID);
              for (let i = 0; i < callbacks[userID].length; i++) { // Iterate through the callbacks for this user
                callbacks[userID][i](loadedUsers[userID]);
              }
              delete callbacks[userID]; // Remove the callbacks for this user
            } else {
              db.collection("bannedUsers").doc(userID).get().then(function(banedUserData) {
                if (banedUserData.exists) {
                  loadedUsers[userID] = {
                    uid: userID,
                    username: banedUserData.get("username"),
                    firstName: banedUserData.get("firstName"),
                    lastName: banedUserData.get("lastName"),
                    fullName: function() {
                      return "" + this.firstName + " " + this.lastName;
                    },
                    profilePic: profilePic,
                    bio: banedUserData.get("bio"),
                    favoriteSports: banedUserData.get("favoriteSports"),
                    favoriteTeams: banedUserData.get("favoriteTeams"),
                  };
                  for (let i = 0; i < callbacks[userID].length; i++) { // Iterate through the callbacks for this user
                    callbacks[userID][i](loadedUsers[userID]);
                  }
                  delete callbacks[userID]; // Remove the calbacks for this user

                } else { //This user does not exist

                }
              });
            }

          });
        });
      } else { // This user currently being loaded so add the callback to the array
        callbacks[userID].push(callback);
      }

    }
  } else {
    callback({}); //The id is invalid so return the invalid/anonomus user object
  }
}

//If the pool exist then this edits its data if it doesnt exist eg poolID=0||null then it creates a new pool. tags should be an array, poolStartDate should be a Timestamp
function editUser(username, firstName, lastName, pic, password) {
  //If the user document is not null and not 0 edit the data
  var userRef = db.collection('users').doc(uid);
  db.collection('users').doc(uid).get().then(function(userData) {
    if (userData.exists) {
      //Edit pool name
      if (username) {
        userRef.update({
            username: username,
          })
          .then(function() {
            console.log("username successfully updated!");
          })
          .catch(function(error) {
            console.error("Error updating user: ", error);
          });
      }
      if (firstName) {
        userRef.update({
            firstName: firstName,
          })
          .then(function() {
            console.log("user firstName successfully updated!");
          })
          .catch(function(error) {
            console.error("Error updating user: ", error);
          });
      }
      if (lastName) {
        userRef.update({
            lastName: lastName,
          })
          .then(function() {
            console.log("user lastName successfully updated!");
          })
          .catch(function(error) {
            console.error("Error updating user: ", error);
          });
      }
      if (pic) {
        var profilePictureRef = storageRef.child('profile-pictures').child(uid);
        profilePictureRef.put(file).then(function(snapshot) {
          //after picture is posted
        });
      }
      if (password) {
        // TODO: paswords
      }
    } else {
      //the user doc does not exist so create a new doc and set its information
      db.collection("users").doc(uid).set({
          username: username,
          firstName: firstName,
          lastName: lastName,
        })
        .then(function() {
          console.log("Successfully added a new pool!");
        })
        .catch(function(error) {
          console.error("Error adding pool: ", error);
        });
    }
  });
}

async function banUserF(uidToBan) { //Bans the user then resfreshes the page


  console.log('Trying to ban uid: ', uidToBan);

  banUser({
    uidToBan: uidToBan,
    liftBan: false,
  }).then(function(result) {
    // TODO: Refresh the search properly
    searchUsers();
    app.dialog.alert('Successfully banned the user!');
    console.log(result);
  }).catch(error => {
    app.dialog.close();
    app.dialog.alert(error.message);
    console.log(error);
  });

  return true;
}

function liftBan(uidToLift) {

  console.log('Trying to lift ban on user uid: ', uidToLift);

  banUser({
    uidToBan: uidToLift,
    liftBan: true,
  }).then(function(result) {
    // TODO: Refresh the search properly
    searchBannedUsers();
    app.dialog.alert('Successfully lifted ban!');
    console.log(result);
  }).catch(error => {
    app.dialog.close();
    app.dialog.alert(error.message);
    console.log(error);
  });
}

function searchUsers() {

  $$('.search-user-preloader').show();
  $$('#all-users-list').html('');

  //get query
  let query = $$('#user-search').val().toLowerCase();

  //where we will store the results
  var foundUsers = {};

  //an array to store our query promises
  let querys = [];

  //Add the querys
  querys.push(db.collection('users').where("username", "==", query).get());
  querys.push(db.collection('users').where("firstName", "==", query).get());
  querys.push(db.collection('users').where("lastName", "==", query).get());

  //Await all the the querys then add their results
  Promise.all(querys).catch(function(error) {

    $$('.search-user-preloader').hide();
    $$('#all-users-list').html('There was an error loading results. Please try again later.');

    console.error(error.message);
    return;
  }).then(function(queryDoc) {
    queryDoc.forEach(function(queryResults) {
      queryResults.forEach(function(userDoc) {
        //If this user has already been found add to its priority
        if (foundUsers[userDoc.id]) {
          foundUsers[userDoc.id] += 2;
        } else {
          foundUsers[userDoc.id] = 2;
        }
      });
    });

    //Sort by priority
    var sortable = [];
    for (var user in foundUsers) {
      sortable.push([user, foundUsers[user]]);
    }

    //If nothing is found
    if (sortable.length < 1) {
      $$('#all-users-list').html('There were no users matching \"' + query + '\"');
      $$('.search-user-preloader').hide();
      return;
    }

    sortable.sort(function(a, b) {
      return b[1] - a[1];
    });

    //get user info and display on list
    let lastUser = sortable[sortable.length - 1][0];
    sortable.forEach(function(userDoc) {
      getUser(userDoc[0], function(user) {
        $$('#all-users-list').append('<li><div class="item-content">' +
          '<div class="item-media"><div class="picture" style="background-image: url(' + user.picURL + ')"></div></div>' +
          '<div class="item-inner">' +
          '<div class="item-title-row"><div class="item-title">' + user.username + '</div><div class="item-after"><a href="#" onclick="banUserF(\'' + user.uid + '\')" class="button color-red">Ban User</a></div></div>' +
          '<div class="item-text">' + user.firstName + ' ' + user.lastName + '</div>' +
          '</div></div></li>');

        //hide preloader on last result
        if (user.uid == lastUser) {
          $$('.search-user-preloader').hide();
        }
      });


    });
  });

}

function searchBannedUsers() {

  $$('.search-banned-user-preloader').show();
  $$('#banned-users-list').html('');

  //get query
  let query = $$('#banned-user-search').val().toLowerCase();

  if (query != null && query != '') {

    //where we will store the results
    var foundUsers = {};
    //an array to store our query promises
    let querys = [];

    //Add the querys
    querys.push(db.collection('bannedUsers').where("username", "==", query).get());
    querys.push(db.collection('bannedUsers').where("firstName", "==", query).get());
    querys.push(db.collection('bannedUsers').where("lastName", "==", query).get());

    //Await all the the querys then add their results
    Promise.all(querys).catch(function(error) {

      $$('.search-banned-user-preloader').hide();
      $$('#banned-users-list').html('There was an error loading results. Please try again later.');
      console.error(error.message);
      return;
    }).then(function(queryDoc) {
      queryDoc.forEach(function(queryResults) {
        queryResults.forEach(function(userDoc) {
          //If this user has already been found add to its priority
          if (foundUsers[userDoc.id]) {
            foundUsers[userDoc.id] += 2;
          } else {
            foundUsers[userDoc.id] = 2;
          }
        });
      });

      //Sort by priority
      var sortable = [];
      for (var user in foundUsers) {
        sortable.push([user, foundUsers[user]]);
      }

      //If nothing is found
      if (sortable.length < 1) {
        $$('#banned-users-list').html('There were no users matching \"' + query + '\"');
        $$('.search-banned-user-preloader').hide();
        return;
      }

      sortable.sort(function(a, b) {
        return b[1] - a[1];
      });

      //get user info and display on list
      let lastUser = sortable[sortable.length - 1][0];
      sortable.forEach(function(userDoc) {
        getUser(userDoc[0], function(user) {
          $$('#banned-users-list').append('<li><div class="item-content">' +
            '<div class="item-media"><div class="picture" style="background-image: url(' + user.picURL + ')"></div></div>' +
            '<div class="item-inner">' +
            '<div class="item-title-row"><div class="item-title">' + user.username + '</div><div class="item-after"><a href="#" onclick="liftBan(\'' + user.uid + '\')" class="button color-red">Lift Ban</a></div></div>' +
            '<div class="item-text">' + user.firstName + ' ' + user.lastName + '</div>' +
            '</div></div></li>');

          //hide preloader on last result
          if (user.uid == lastUser) {
            $$('.search-banned-user-preloader').hide();
          }
        });


      });
    });
  } else {
    $$('.search-banned-user-preloader').hide();
  }

}

function forgotPassword() {
  //show prompt dialog
  app.dialog.prompt('What is your email address?', function(email) {

    //show loading dialog
    app.dialog.preloader('Sending reset email...');

    //attempt to send reset email
    firebase.auth().sendPasswordResetEmail(email).then(function() {
      app.dialog.close();
      app.dialog.alert('A password reset email was sent to your address.');
    }).catch(function(error) {
      app.dialog.close();
      app.dialog.alert(error.message);
      console.error(error.message);
    });
  });
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}