var app = new Framework7({
  root: '#app',
  name: 'Fun Pools Admin',
  id: 'com.myapp.test',
  theme: 'aurora',
  routes: [{
      path: '/home/',
      url: 'index.html',
      options: {
        transition: 'f7-dive',
      },
      on: {
        pageBeforeIn: function() {
          app.preloader.hide();
        }
      }
    },
    {
      path: '/login/',
      url: 'pages/login.html',
      options: {
        transition: 'f7-dive',
      },
      on: {
        pageInit: function(e, page) {
          //When the pages is Initialized setup the signIn button
          $$('#log-in').click(function(event) {
            signIn($$('#uname').val(), $$('#pword').val());
          });
        },
      }
    },


  ],
});

var $$ = Dom7;

var mainView = app.views.create('.view-main');



///////********Page Setup Functions and dom stuff*********\\\\\\\\\\
function makeid(length) {
  var result = '';
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

//user search
$$('#user-search').on('keyup', function(event) {
  if (event.keyCode === 13) {
    $$('#user-search-button').click();
  }
});

// Setup for the new multiple choice question button
$$('#mc-question').on('click', function() {
  //store the question number for later use
  var questionNumb = makeid(10);
  //add the new question html to the page
  addQuestion(questionNumb, '');
});

// Setup for the new numeric question button
$$('#n-question').on('click', function() {

  //store the question number for later use
  var questionNumb = makeid(10);

  //add the new question html to the page
  addNumericQuestion(questionNumb, '');
});


// Delete pool button on click
$$('.pool-delete').on('click', function() {
  let idToDelete = document.getElementById("pool-name").dataset.id;

  app.dialog.create({
    text: 'Are you sure you want to delete this pool? This action can not be undone.',
    buttons: [{
        text: 'Cancel',
      },
      {
        text: 'Delete',
        color: 'red',
        onClick: function() {
          console.log("Deleting pool: ", idToDelete);
          app.preloader.show();
          deletePool({
            poolID: idToDelete,
          }).then(function() {
            app.toast.show({
              text: "Succesfully deleted pool.",
              closeTimeout: 5000,
            });
          }).catch(function(error) {
            app.toast.show({
              text: "There was an error deleting your pool. Please try again later.",
              closeTimeout: 5000,
              closeButton: true
            });
          }).finally(function(result) {
            //Close the uneeded UI
            loadPools(function() {
              app.preloader.hide();
              app.popup.close(".pool-popup");
            });

          });
        }
      },
    ],
  }).open();

});

// Save pool button on click
$$('.pool-save').on('click', function() {
  savePool();
});

//Duplicate pool button
$$('.pool-duplicate').click(function() {
  duplicatePool();
});

// New pool button on click
function newPool() {
  //clear any existing values in the popup
  $$(".pool-popup").find('.pic-upload').css("background-image", "");
  $$(".pool-popup").find('.pic-icon').html("add_photo_alternate");
  document.getElementById("pool-name").value = "";
  document.getElementById("pool-name").dataset.id = "0";
  document.getElementById("pool-description").innerHTML = "";
  $$("#pool-rules").html("");
  $$("#pool-tags").html("");
  $$("#pool-questions").html("");
  poolDateInput.setValue([new Date()]); //Set the value of the date to be nothing

  //open the popup
  app.popup.open(".pool-popup");

}



function setupMainPage() {
  db.collection("admins").doc(uid).get().catch(function(error) {
    console.log(error);
  }).then(function(userData) {
    //If the user exist then this user is an admin so load the main page
    if (userData.exists) {
      let uData = userData.data();
      User = {
        uid: uid,
        username: userData.get("lastName"),
        firstName: userData.get("firstName"),
        lastName: userData.get("lastName"),
        fullName: function() {
          return "" + this.firstName + " " + this.lastName;
        },
        profilePic: null, //profilePic,// TODO: Load that here
        permissions: uData.adminPermissions,
        superUser: uData.superUser,
      };

      console.log(self.app.views.main.router.currentRoute.path);
      //direct user to main page if not already there
      if (self.app.views.main.router.currentRoute.path != '/' && self.app.views.main.router.currentRoute.path != '/fun-sports-pools-admin/') {
        self.app.views.main.router.navigate('/home/');
        console.log("navigated to main page");
      }


      //NOTE: Add code to enable the tab when loading from these functions
      if (User.permissions) {
        if (User.permissions.announcements) {
          $$('#announcements-tab').show();
        }
        if (User.permissions.pools) {
          $$('#pools-tab').show();
          loadPools();
        }
        if (User.permissions.users) {
          $$('#users-tab').show();
        }
        if (User.permissions.categories) {
          $$('#categories-tab').show();
          loadTags();
        }
        if (User.permissions.analytics) {
          $$('#reports-tab').show();
        }

        if (User.superUser) {
          $$('#admins-tab').show();
          loadAdmins();
        }
      }

      //editUser('Administrator', 'test', 'user', null, null);

      $$('#username').html('Hi, ' + User.firstName);
      console.log(User.username);
      var panel = app.panel.create({
        el: '.panel-left',
        resizable: true,
        visibleBreakpoint: 300,
      });

      //hide splash screen
      $$('#splash-screen').hide();
    } else {
      console.log("This user is not an admin! Signing out");
      signOut();
    }

    //load Feedback
    db.collection("feedback").get().then(function(snapshot) {

      $$('.skeleton-feedback').hide();
      var options = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      };
      let messageIndex = 0;
      snapshot.forEach(function(doc) {

        getUser(doc.get('sender'), function(user) {
          var message = {
            id: doc.id,
            sender: user,
            email: doc.get("email") ? doc.get("email") : 'No email provided',
            subject: doc.get("subject") ? doc.get("subject") : 'No subject',
            message: doc.get("message") ? doc.get("message") : 'No message',
            date: doc.get("timestamp") ? doc.get("timestamp").toDate().toLocaleString('en-us', options) : '',
            type: doc.get("type") ? doc.get("type") : 'feedback',
          };

          //store feedback messages in an array to access later
          messages.push(message);

          //add feedback to page
          $$('#' + doc.get("type")).append('<li class="fb-' + message.id + '"><a href="#" onclick="showFeedback(\'' + messageIndex + '\')" class="item-link item-content"><div class="item-inner"><div class="item-title-row">' +
            '<div class="item-title">' + user.username +
            '</div><div class="item-after">' + message.date + '</div></div>' +
            '<div class="item-text">' + message.subject + '</div></div></a></li><li>');
          messageIndex++;
        });
      });
    });

  });
}

//////*******feedback section********\\\\\\\

//array of feedback messages
var messages = [];

//show a popup of message when a feedback list item is clicked
function showFeedback(index) {
  var message = messages[index];
  switch (message.type) {
    case "delete-account":
      app.dialog.create({
        text: 'Are you sure you want to delete this account?',
        buttons: [{
            text: 'Cancel',
          },
          {
            text: 'Delete',
            color: 'red',
            onClick: function() {
              deleteAccount(message.sender.uid)

            },
          },
        ],
        verticalButtons: false,
      }).open();
      break;
    default:
      let mailto = message.email == "No email provided" ? 'No email provided' : '<a href="mailto:' + message.email + '" class="link external">' + message.email + '</a>';
      var popup = app.popup.create({
        content: '<div class="popup">' +
          '<div style="padding: 16px; padding-bottom: 0"><div class="float-right" style="margin-left: 16px"><a href="#" class="button button-outline popup-close">Close</a><a href="#" class="button button-fill resolve-' + message.id + '" style="margin-top: 8px">Resolve</a></div>' +
          '<div class="row justify-content-space-between align-items-center">' +
          '<div><p class="no-margin"><strong>From: </strong>' + message.sender.username + '<br><strong>Subject: </strong>' + message.subject + '<br><strong>Reply-To: </strong>' + mailto + '</p></div>' +
          '<div><p style="opacity: .5; margin: 0 0 4px 0">' + message.date + '</p><div class="display-flex justify-content-flex-end"><div class="picture" style="background-image: url(\'' + message.sender.picURL + '\')"></div></div></div>' +
          '</div><div class="hairline no-margin-bottom"></div></div>' +
          '<div class="body">' +
          message.message +
          '</div>' +
          '</div>',
      });
      popup.open();

      //update feedback type in database
      $$('.resolve-' + message.id).click(function() {

        app.preloader.show();

        db.collection("feedback").doc(message.id).update({
          type: 'resolved'
        }).catch(function(error) {

          console.log(error.message);
          app.preloader.hide();
          app.toast.show({
            text: "There was an error resolving feedback. please try agian later."
          });

        }).then(function() {

          app.preloader.hide();
          popup.close();

          //move to other card
          $$('.fb-' + message.id).appendTo('#resolved');

          //update local copy
          messages[index].type = "resolved";

        });

      });
  }

  //hide resolve button if already resolved
  if (message.type == "resolved") $$('.resolve-' + message.id).hide();
}

function deleteAccount(userID) {
  console.log("TODO Delete account here", userID);
}

///////****Question and answer section****\\\\\\\\\
let questionAnswers = {};
var answerIDs = [];

function addAnswer(questionID, answerID, answerText, correct) { //Adds an answer to the html // NOTE: this only adds the answer to the html not the data base
  // TODO: Check to see if this id is already in the database. If so dont add the answer
  answerIDs.push(answerID);
  $$('.mc-answer-' + questionID).prev().append('<li class="item-content item-input">\
  <div class="item-inner">\
    <div style="width: 100%">\
      <div class="item-title item-label">Answer</div>\
      <div class="item-input-wrap">\
        <input id="' + answerID + '" class="' + questionID + '-answer" type="text" placeholder="Your answer">\
      </div>\
    </div>\
    <div class="item-after">\
    <button id="' + answerID + '-deleteanswer" class="button delete-button" onclick="deleteAnswer(this)">Delete</button>\
      <button id="' + answerID + '-setanswer" class="button" >Correct</button>\
    </div>\
  </div>\
  </li>');

  $$('#' + answerID + "-setanswer").click(function() {
    setAnswer(questionID, answerID);
  });
  document.getElementById(answerID).value = answerText;
  if (correct) {
    setAnswer(questionID, answerID);
  }
}

var questionIDs = [];

function addQuestion(questionID, description, answers) { //Adds a multiple choice question to the html // NOTE: This only adds the question to the html not the database
  // TODO: Check to see if this questionId has been added already if so dont add the question
  questionIDs.push(questionID);

  // Add the question html to the pool questions element
  $$('#pool-questions').append('<div id=' + questionID + ' class="question mc-question list no-hairlines no-hairlines-between">\
  <ul>\
    <li class="item-content item-input">\
      <div class="item-inner">\
      <div style="width: 100%">\
        <div class="item-title item-label question-title">Multiple Choice Question</div>\
        <div class="item-input-wrap">\
          <input id ="question-description-' + questionID + '" type="text" placeholder="Your question">\
        </div>\
        </div>\
        <div class="item-after">\
          <button class="button delete-button" onclick="deleteQuestion(this)">Delete</button>\
        </div>\
      </div>\
    </li>\
    <div class="seporator"></div>\
 </ul>\
  <button class = "button mc-answer-' + questionID + '" > Add Answer </button>\
   </div>');

  //Setup the add answer button
  $$('.mc-answer-' + questionID).on('click', function(event) {
    var answerID = makeid(10);
    addAnswer(questionID, answerID, '', false);
  });

  //Setup the question description
  document.getElementById("question-description-" + questionID).value = description;

  // If the answers array is valid
  if (answers != null && answers.length > 0) {
    let i = 0;
    //Add each answer to the html
    answers.forEach(function(answer) {
      addAnswer(questionID, answer.id, answer.text, answer.correct);

      if (i < 1) { //If this is the first answer remove the delete button
        var deleteButton = document.getElementById(answer.id + "-deleteanswer");
        deleteButton.parentNode.removeChild(deleteButton);
      }

      i++;
    });

  } else {
    //Add a empty first answer to the html
    answerID = makeid(10);
    addAnswer(questionID, answerID, '', false);
    //Remove the Answers delete button
    var deleteButton = document.getElementById(answerID + "-deleteanswer");
    deleteButton.parentNode.removeChild(deleteButton);
  }
  updateQuestionNumbers();
}

let tiebreakerIDs = [];
// This is adds a numeric question to the html // NOTE: This only adds the question to the html not the databasex
function addNumericQuestion(questionID, description, answer) {
  // TODO: Check to see if this questionId has been added already if so dont add the question
  tiebreakerIDs.push(questionID);

  // Add the question html to the pool questions element
  $$('#pool-questions').append('<div  id="' + questionID + '"  class="question n-question list no-hairlines no-hairlines-between">\
    <ul>\
      <li class="item-content item-input">\
      <div class="item-inner">\
      <div style="width: 100%">\
        <div class="item-title item-label question-title">Numeric Question</div>\
        <div class="item-input-wrap">\
          <input id ="question-description-' + questionID + '" type="text" placeholder="Your question">\
        </div>\
        </div>\
        <div class="item-after">\
          <button class="button delete-button" onclick="deleteQuestion(this)">Delete</button>\
        </div>\
      </div>\
      </li>\
      <div class="seporator"></div>\
      <li class="item-content item-input">\
        <div class="item-inner"><div style="width: 100%">\
          <div class="item-title item-label">Answer</div>\
          <div class="item-input-wrap">\
            <input id="' + questionID + '-numeric-answer" class="" type="number">\
          </div>\
        </div></div>\
      </li>\
    </ul>\
  </div>');

  //Setup the question description
  document.getElementById("question-description-" + questionID).value = description;
  document.getElementById(questionID + "-numeric-answer").value = answer;

  updateQuestionNumbers();
}

function updateQuestionNumbers() {
  $$('.question-title').forEach(function(question, i) {
    $$(question).text('Question ' + (i + 1));
  });
}

// TODO: Change these to use the questionIDs and answerIDs
//remove an answer from a multiple choice question
function deleteAnswer(el) {
  var answer = el.parentElement.parentElement.parentElement;
  answer.parentElement.removeChild(answer);
  updateQuestionNumbers();
}

var correctAnswers = [];

function setAnswer(questionID, answerID) { //Set the selected answer as the correct answer for a multiple choice question with ID questionID

  let el = $$('#' + answerID + "-setanswer")[0]; //Get the element of the button(Correct/Undo)
  let answer = el.parentElement.parentElement.parentElement;

  //Set the previously selected answers state and color to the default
  $$('#' + correctAnswers[questionID] + "-setanswer").html("Correct");
  $$('#' + correctAnswers[questionID] + "-setanswer").parent().parent().parent().removeAttr("style");


  if (correctAnswers[questionID] == answerID) { //If this is already marked as the correct answer(eg. the admin has pressed undo in the panel) then remove it from the correct answers
    delete correctAnswers[questionID];
    console.log("Undo set answer as correct");
  } else { //Else add the answer to the list of correct answers and set its html to the correct color and state
    correctAnswers[questionID] = answerID;
    el.innerHTML = "Undo";
    answer.style.backgroundColor = "rgba(76, 175, 80, .2)";
  }
  console.log(correctAnswers);

}

function deleteQuestion(el) { //remove a question from the list
  deleteAnswer(el.parentElement.parentElement);
}




///////*Announcements*\\\\\\\

function newAnnouncement() {
  //clear any existing values in the popup
  $$(".announcement-popup").find('.pic-upload').css("background-image", "");
  $$(".announcement-popup").find('.pic-icon').html("add_photo_alternate");
  $$(".announcement-popup").find('#send-announcement').off('click').click(
    function() {
      app.preloader.show();

      let title = $$('#announcment-title').val();
      let description = $$('#announcment-description').val();
      let link = $$('#announcment-link').val();
      let announcement = {
        title: title,
        description: description,
        link: link,
        test: false,
      };
      console.log("Sending announcement: ", announcement);

      sendAnnouncement(announcement).then(result => {
        app.preloader.hide();
        console.log(result);
      }).catch(error => {
        app.preloader.hide();
        console.error(error);
      });

    });
  $$(".announcement-popup").find('#send-test-announcement').off('click').click(
    function() {
      app.preloader.show();

      let title = $$('#announcment-title').val();
      let description = $$('#announcment-description').val();
      let link = $$('#announcment-link').val();
      let announcement = {
        title: title,
        description: description,
        link: link,
        test: true,
      };
      console.log("Sending announcement: ", announcement);

      sendAnnouncement(announcement).then(result => {
        app.preloader.hide();
        console.log(result);
      }).catch(error => {
        app.preloader.hide();
        console.error(error);
      });

    });

  //open the popup
  app.popup.open(".announcement-popup");

}

///////*TAGS*\\\\\\\

$$('#edit-tags-button').click(function() {
  if ($$('#edit-tags-button').html() == "Edit") {
    console.log("Edit tags");
    app.sortable.enable('#sortable-tags-list');

    $$('#edit-tags-button').html("Save");
    $$('#tags-list').find('input').prop('readOnly', false);
    $$('#new-tag-button').show();
    $$('#cancel-edit-tags-button').show();
    $$('.delete-tag-button').show();

  } else {
    console.log("Save tags");

    saveTags();

    app.sortable.disable('#sortable-tags-list');
    $$('#edit-tags-button').html("Edit");
    $$('#tags-list').find('input').prop('readOnly', true);
    $$('#new-tag-button').hide();
    $$('#cancel-edit-tags-button').hide();
    $$('.delete-tag-button').hide();

  }
});

$$('#cancel-edit-tags-button').click(function() {
  app.preloader.show();
  loadTags().then(function() {
    app.preloader.hide();
  });
  app.sortable.disable('#sortable-tags-list')
  $$('#edit-tags-button').html("Edit");
  $$('#tags-list').find('input').prop('readOnly', true);
  $$('#new-tag-button').hide();
  $$('#cancel-edit-tags-button').hide();
  $$('.delete-tag-button').hide();

});

$$('#new-tag-button').click(function() {
  let tagEl = $$('<li class="tag-input"><div class="item-content"><div class="item-media"><a href="#" class="delete-tag-button"><i class="material-icons icon">cancel</i></a></div><div class="item-inner">' +
    '<div class="item-title"><input class="tag-title-input" type="text" name="Title" placeholder="New Category"></div>' +
    '</div></div><div class="sortable-handler"></div></li>');
  tagEl.attr('data-id', makeid(10)); // TODO: Check for id conflicts

  $$("#tags-list").append(tagEl);
  $$('.delete-tag-button').click(function() {
    console.log("Deleteing tag.");
    $$(this).closest('li').remove();;
  });
});

async function loadTags() { //Clears the current tags then loads them from the server
  console.log("Loading tags");

  universalData = (await universalDataRef.get()).data();
  $$("#tags-list").empty();

  universalData.tags.forEach((tag, i) => {
    let tagEl = $$('<li class="tag-input"><div class="item-content"><div class="item-media"><a href="#" class="delete-tag-button"><i class="material-icons icon">cancel</i></a></div><div class="item-inner">' +
      '<div class="item-title"><input class="tag-title-input" value="' + tag.title + '" type="text" name="Title" placeholder="Title" readonly></div>' +
      '</div></div><div class="sortable-handler"></div></li>');
    tagEl.attr('data-id', tag.id);
    //tagEl.data("id", "gksajdhgfkajsdhg");
    $$("#tags-list").append(tagEl);
  });

  $$('.delete-tag-button').hide();
  $$('.delete-tag-button').click(function() {
    console.log("Deleteing tag.");
    $$(this).parent().parent().parent().remove();
  });

  return 1;
}

async function saveTags() { //Saves the tags and their order as currently displyed in the tags section
  app.preloader.show();
  //console.log($$('#tags-list').find('.tag-input'));
  let tagElements = $$('#tags-list').find('.tag-input');
  let newTags = [];

  tagElements.forEach((tagElement, i) => {
    //console.log($$(tagElement).find('input'));
    console.log($$(tagElement).attr("test"), $$(tagElement).data('id'));
    newTags.push({
      id: $$(tagElement).attr("data-id"),
      title: $$(tagElement).find('.tag-title-input').val(),
    });
  });
  console.log(newTags);

  await universalDataRef.update({
    tags: newTags,
  });

  loadTags();

  app.preloader.hide();

  return 1;
}

/////////*ADMIN MANAGMENT*\\\\\\\\\\\
async function loadAdmins() {
  console.log("Loading admins");

  $$('#admin-list').empty();

  let admins = db.collection("admins").get();
  admins = (await admins).docs;
  console.log(admins);

  for (let i = 0; i < admins.length; i++) {
    //const element = admins[i];
    const admin = admins[i].data();
    const adminID = admins[i].id;

    // console.log("Admin:", admin);
    $$('#admin-list').append('<li id="id-' + adminID + '" class="accordion-item">\
    <a href="#" class="item-content item-link">\
      <div class="item-inner">\
        <div class="item-title">' + admin.firstName + ' ' + admin.lastName + '</div>\
      </div>\
    </a>\
    <div class="accordion-item-content">\
      <div class="block">\
        <div class="row">\
          <div class="list col-50">\
            <h4>User Permissions:</h4>\
            <ul class="permission-list" >\
              <!-- Permission Section -->\
              <li>\
                <label class="item-checkbox item-content">\
                  <input class="pools-checkbox" type="checkbox" name="permission-checkbox" value="edit-pools">\
                  <i class="icon icon-checkbox"></i>\
                  <div class="item-inner">\
                    <div class="item-title">Can edit pools</div>\
                  </div>\
                </label>\
              </li>\
              <li>\
                <label class="item-checkbox item-content">\
                  <input class="users-checkbox" type="checkbox" name="permission-checkbox" value="user-managment" />\
                  <i class="icon icon-checkbox"></i>\
                  <div class="item-inner">\
                    <div class="item-title">User Managment</div>\
                  </div>\
                </label>\
              </li>\
              <li>\
                <label class="item-checkbox item-content">\
                  <input class="categories-checkbox" type="checkbox" name="permission-checkbox" value="categories" />\
                  <i class="icon icon-checkbox"></i>\
                  <div class="item-inner">\
                    <div class="item-title">Tags/Categories</div>\
                  </div>\
                </label>\
              </li>\
              <li>\
                <label  class="item-checkbox item-content">\
                  <input class="analytics-checkbox" type="checkbox" name="permission-checkbox" value="analytics" />\
                  <i class="icon icon-checkbox"></i>\
                  <div class="item-inner">\
                    <div class="item-title">Analytics</div>\
                  </div>\
                </label>\
              </li>\
              <li>\
                <label class="item-checkbox item-content">\
                  <input class="announcements-checkbox" type="checkbox" name="permission-checkbox" value="announcements" />\
                  <i class="icon icon-checkbox"></i>\
                  <div class="item-inner">\
                    <div class="item-title">Announcements</div>\
                  </div>\
                </label>\
              </li>\
            </ul>\
          </div>\
          <div class="col-40">\
            <div style="height: 100px;"></div>\
            <div class="row block">\
              <button class="col button button-fill cancel-admin">Canel</button>\
              <button class="col button button-fill delete-admin">Delete Admin</button>\
              <button class="col button button-fill save-admin">Save</button>\
            </div>\
          </div>\
        </div>\
      </div>\
    </div>\
  </li>');


    if (admin.adminPermissions != null) {
      if (admin.adminPermissions.pools) {
        $$('#id-' + adminID).find('.pools-checkbox').prop('checked', true);
      }
      if (admin.adminPermissions.users) {
        $$('#id-' + adminID).find('.users-checkbox').prop('checked', true);
      }
      if (admin.adminPermissions.categories) {
        $$('#id-' + adminID).find('.categories-checkbox').prop('checked', true);
      }
      if (admin.adminPermissions.announcements) {
        $$('#id-' + adminID).find('.announcements-checkbox').prop('checked', true);
      }
      if (admin.adminPermissions.analytics) {
        $$('#id-' + adminID).find('.analytics-checkbox').prop('checked', true);
      }
    }

    $$('#id-' + adminID).find('.save-admin').click(function() {
      saveAdmin(adminID, {
        adminPermissions: {
          pools: $$('#id-' + adminID).find('.pools-checkbox').is(":checked"),
          users: $$('#id-' + adminID).find('.users-checkbox').is(":checked"),
          categories: $$('#id-' + adminID).find('.categories-checkbox').is(":checked"),
          announcements: $$('#id-' + adminID).find('.announcements-checkbox').is(":checked"),
          analytics: $$('#id-' + adminID).find('.analytics-checkbox').is(":checked"),
        },
      });
    });
    $$('#id-' + adminID).find('.delete-admin').click(function() {
      app.preloader.show();
      deleteAdmin(adminID).then(function() {
        app.preloader.hide();
      });
    });
    $$('#id-' + adminID).find('.cancel-admin').click(function() {
      app.preloader.show();
      loadAdmins().then(function() {
        app.preloader.hide();
      });
    });

  }
  return 1;
}

async function saveAdmin(adminID, adminObj) {
  console.log("Saving admin: id:" + adminID + " object:", adminObj);
  app.preloader.show();
  let foo = {
    adminPermissions: {
      pool: $$('#id-' + adminID).find('.edit-pools-checkbox').is(":checked"),
      users: $$('#id-' + adminID).find('.users-checkbox').is(":checked"),
      categories: $$('#id-' + adminID).find('.categories-checkbox').is(":checked"),
      announcements: $$('#id-' + adminID).find('.announcements-checkbox').is(":checked"),
      analytics: $$('#id-' + adminID).find('.analytics-checkbox').is(":checked"),
    },
  };

  await db.collection("admins").doc(adminID).update(adminObj);
  await loadAdmins();
  app.preloader.hide()
  return 1;
}

async function deleteAdmin(adminID) {
  //TODO: Add Code to delete account here
  console.log("Deleting admins from this panel is currently not finished please consult the devs.");
  return 1;
}




//displays uploaded picture on screen
function previewPic(event, el) {
  $$(el).find('.pic-upload').css("background-image", ("url(" + URL.createObjectURL(event.target.files[0]) + ")"));
  $$(el).find('.pic-icon').html('edit');
}
//add a tag on edit pool page
function addTag(el) {
  chipsDiv = document.getElementById("pool-tags");
  if (el.value.includes(",")) {
    var tag = el.value.split(',')[0].toLowerCase();
    var chip = document.createElement("div");
    chip.innerHTML = '<div class="chip" onclick="$$(this).remove()"><div class="chip-label">' + tag + '</div><a href="#" class="chip-delete"></a></div>';
    chipsDiv.appendChild(chip.childNodes[0]);
    el.value = "";
    el.focus();
    el.select();

  }

}

/*
//load tags
function loadTags() {
  $$('.tag').remove();
  app.preloader.show();
  db.collection("tags").get().then(function(tags) {
    tags.forEach(function(tag) {
      //add to page
      $$('#type-' + tag.get('type')).prepend('<div id="' + tag.id + '" class="tag"><label><div class="pic-upload no-margin">' +
        '<input class="pic-input" type="file" accept="image/jpeg, image/png" onchange="previewPic(event, \'#' + tag.id + '\')" disabled><i class="material-icons pic-icon" style="font-size: 30px; color: rgba(0,0,0,0)">edit</i></div>' +
        '</label><div class="list no-margin"><ul><li class="item-content item-input"><div class="item-inner"><div class="item-input-wrap text-align-center">' +
        '<input class="text-align-center tag-name" type="text" placeholder="Tag name" value="' + tag.get("name") + '" readonly></div></div></li></ul></div>' +
        '<p class="segmented no-margin"><button onclick="deleteTag(\'' + tag.id + '\')" class="button color-red">Delete</button><button class="button tag-edit" onclick=(editTag(\'' + tag.id + '\'))>Edit</button></p></div>');

      //get picture
      storageRef.child('tag-pictures').child(tag.id).getDownloadURL().then(function(url) {
        $$('#' + tag.id).find('.pic-upload').css("background-image", "url('" + url + "')");
      });
    });
    app.preloader.hide();
  }).catch(function(error) {
    console.error(error.message);
    app.preloader.hide();
  });

}

//open and clear popup
function newTag() {
  //clear dataset
  $$('.tag-popup').find('.pic-upload').css("background-image", "");
  $$('.tag-popup').find('.pic-icon').text("add_photo_alternate");
  $$('#tag-name').val("");
  $$('#tag-type').val("");
  //open popup
  app.popup.open(".tag-popup");
}

//actually save
$$(".tag-save").click(function() {
  app.preloader.show();
  //add tag to database
  db.collection("tags").add({
    name: $$('#tag-name').val(),
    type: $$('#tag-type').val()
  }).then(function(doc) {
    //then upload photo
    var profilePictureRef = storageRef.child('tag-pictures').child(doc.id);
    var pic = $$('.tag-popup').find('.pic-input').prop('files')[0];
    //If poolPicture is valid
    if (pic) {
      profilePictureRef.put(pic).then(function() {
        app.popup.close(".tag-popup");
        app.preloader.hide();
        loadTags();
      }).catch(function(error) {
        app.popup.close(".tag-popup");
        app.preloader.hide();
        app.toast.show({
          text: error.message,
          closeTimeout: 10000,
          closeButton: true
        });
        loadTags();

      });
    } else {
      app.popup.close(".tag-popup");
      app.preloader.hide();
      loadTags();

    }
  }).catch(function(error) {
    app.popup.close(".tag-popup");
    app.preloader.hide();
    app.toast.show({
      text: error.message,
      closeTimeout: 10000,
      closeButton: true
    });
    loadTags();

  });
});

function editTag(id) {
  tagEl = $$('#' + id);
  tagEl.find('.tag-name').removeAttr('readonly');
  tagEl.find('.pic-input').removeAttr('disabled');
  tagEl.find('.pic-icon').css("color", "white");
  tagEl.find('.tag-name').css("font-weight", 'normal');
  tagEl.find('.tag-edit').text('Save');
  tagEl.find('.tag-edit').click(function() {
    app.preloader.show();
    db.collection("tags").doc(id).update({
      name: tagEl.find('.tag-name').val(),
    }).then(function() {
      //then upload photo
      var profilePictureRef = storageRef.child('tag-pictures').child(id);
      var pic = tagEl.find('.pic-input').prop('files')[0];
      //If poolPicture is valid
      if (pic) {
        profilePictureRef.put(pic).then(function() {
          app.preloader.hide();
          loadTags();
        }).catch(function(error) {
          app.preloader.hide();
          app.toast.show({
            text: error.message,
            closeTimeout: 10000,
            closeButton: true
          });
          loadTags();

        });
      } else {
        app.preloader.hide();
        loadTags();
      }
    }).catch(function(error) {
      app.preloader.hide();
      app.toast.show({
        text: error.message,
        closeTimeout: 10000,
        closeButton: true
      });
      loadTags();
    });
  });
}

function deleteTag(id) {
  app.preloader.show();
  db.collection("tags").doc(id).delete().then(function() {
    storageRef.child('tag-pictures').child(id).delete().then(function() {
      app.preloader.hide();
      loadTags();
    }).catch(function(error) {
      app.preloader.hide();
      app.toast.show({
        text: error.message,
        closeTimeout: 10000,
        closeButton: true
      });
      loadTags();
    });
  }).catch(function(error) {
    app.preloader.hide();
    app.toast.show({
      text: error.message,
      closeTimeout: 10000,
      closeButton: true
    });
    loadTags();
  });
}*/