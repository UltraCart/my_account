var templates = {};

// ---------------------------------------------------------
// Security (well, not really security, but a helper to
// redirect the user if they're not logged in.  Security
// is handled by the REST API.
// ---------------------------------------------------------
var redirectToLogin = function () {
  var location_href = "index.html";
  if (location.hash && location.hash.length > 0) {
    location_href += "?hash=" + location.hash.substring(1);
  }
  location.href = location_href;
};

var theDocument = jQuery(document);
// ajaxSend isn't need.  authentication is done via cookies that should already be present with every request.
//theDocument.ajaxSend(function (event, xhr) {
//    var authToken = $.cookie('access_token');
//    if (authToken) {
//        xhr.setRequestHeader("Authorization", "Bearer " + authToken);
//    }
//});

theDocument.ajaxError(function (event, xhr) {
  if (xhr.status == 401)
    redirectToLogin();
});


jQuery.ajaxSetup({ cache: false });

function initialize() {

  var html = templates.password({});
  jQuery('#password').html(html);
  bindFields();
}


function updatePassword() {
  clearAllMessages();

  // validate the fields
  var oldPassword = jQuery.trim(jQuery('#oldPassword').val());
  var newPassword = jQuery.trim(jQuery('#newPassword').val());
  var newPasswordAgain = jQuery.trim(jQuery('#newPasswordAgain').val());

  if (!oldPassword) {
    showError("Please provide your current password.");
    return;
  }


  if (!newPassword) {
    showError("Please provide a new password.");
    return;
  }

  if (!newPasswordAgain) {
    showError("Please type your password again to avoid mistakes.");
    return;
  }

  if (newPassword != newPasswordAgain) {
    showError("The two new password fields do not match.  Please type them again.");
    return;
  }


  ultracart.myAccount.changePassword(oldPassword, newPassword, {
    success: function () {
      showSuccess("Your password was changed.");
    },
    failure: function (jqXHR) {
      var errorMsg = null;
      if (jqXHR && jqXHR.getResponseHeader) {
        errorMsg = jqXHR.getResponseHeader('UC-REST-ERROR');
      }
      if (errorMsg) {
        showError("Save failed with this error: " + errorMsg);
      } else {
        showError("Your password could not be changed at this time.  Please try again later.");
      }

    }
  });


}


function bindFields() {
  jQuery('#cancelButton').unbind().bind('click', function () {
    window.history.back();
  });

  jQuery('#saveButton').unbind().bind('click', updatePassword);
  jQuery('#newPassword').unbind().bind('keypress', passwordStrength);

}


// --------------------------------------------------------------
// Password Strength Checker
// grabbed this from SO: http://stackoverflow.com/questions/948172/password-strength-meter
// don't like it? change it.
// --------------------------------------------------------------

var m_strUpperCase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
var m_strLowerCase = "abcdefghijklmnopqrstuvwxyz";
var m_strNumber = "0123456789";
var m_strCharacters = "!@#$%^&*?_~";


function checkPassword(strPassword) {
  // Reset combination count
  var nScore = 0;

  // Password length
  // -- Less than 4 characters
  if (strPassword.length < 5) {
    nScore += 5;
  }
  // -- 5 to 7 characters
  else if (strPassword.length > 4 && strPassword.length < 8) {
    nScore += 10;
  }
  // -- 8 or more
  else if (strPassword.length > 7) {
    nScore += 25;
  }

  // Letters
  var nUpperCount = countContain(strPassword, m_strUpperCase);
  var nLowerCount = countContain(strPassword, m_strLowerCase);
  var nLowerUpperCount = nUpperCount + nLowerCount;
  // -- Letters are all lower case
  if (nUpperCount == 0 && nLowerCount != 0) {
    nScore += 10;
  }
  // -- Letters are upper case and lower case
  else if (nUpperCount != 0 && nLowerCount != 0) {
    nScore += 20;
  }

  // Numbers
  var nNumberCount = countContain(strPassword, m_strNumber);
  // -- 1 number
  if (nNumberCount == 1) {
    nScore += 10;
  }
  // -- 3 or more numbers
  if (nNumberCount >= 3) {
    nScore += 20;
  }

  // Characters
  var nCharacterCount = countContain(strPassword, m_strCharacters);
  // -- 1 character
  if (nCharacterCount == 1) {
    nScore += 10;
  }
  // -- More than 1 character
  if (nCharacterCount > 1) {
    nScore += 25;
  }

  // Bonus
  // -- Letters and numbers
  if (nNumberCount != 0 && nLowerUpperCount != 0) {
    nScore += 2;
  }
  // -- Letters, numbers, and characters
  if (nNumberCount != 0 && nLowerUpperCount != 0 && nCharacterCount != 0) {
    nScore += 3;
  }
  // -- Mixed case letters, numbers, and characters
  if (nNumberCount != 0 && nUpperCount != 0 && nLowerCount != 0 && nCharacterCount != 0) {
    nScore += 5;
  }


  return nScore;
}

// Runs password through check and then updates GUI

function passwordStrength() {
  var password = jQuery('#newPassword').val();

  // Check password
  var score = checkPassword(password);


  // Get controls
  var ctlBar = jQuery('#passwordStrengthBar');
  var ctlText = jQuery('#passwordStrengthText');
  if (!ctlBar || !ctlText)
    return;

  // Set new width
  var pixelWidth = (score * 1.25 > 100) ? 100 : score * 1.25;
  ctlBar.css('width', pixelWidth + "px");

  // Color and text
  var text = null;
  var color = null;

  if (score >= 80) {
    text = "Very Strong";
    color = "#008000";
  } else if (score >= 60) {
    text = "Strong";
    color = "#006000";
  } else if (score >= 40) {
    text = "Average";
    color = "#e3cb00";
  } else if (score >= 20) {
    text = "Weak";
    color = "#Fe3d1a";
  } else {
    text = "Very Weak";
    color = "#e71a1a";
  }

  if (password.length == 0) {
    ctlBar.css('backgroundColor',"").css('border','none');
    ctlText.html('');
  }
  else {
    ctlBar.css('backgroundColor',color).css('border','1px solid black');
    ctlText.html(text);
  }
}

// Checks a string for a list of characters
function countContain(strPassword, strCheck) {
  // Declare variables
  var nCount = 0;

  for (i = 0; i < strPassword.length; i++) {
    if (strCheck.indexOf(strPassword.charAt(i)) > -1) {
      nCount++;
    }
  }

  return nCount;
}
// --------------------------------------------------------------
// end of password strength checker
// --------------------------------------------------------------


jQuery(document).ready(function () {
  enablePleaseWaitMessage();
  templates.password = Handlebars.compile(jQuery('#password-template').html());
  initialize();

});
